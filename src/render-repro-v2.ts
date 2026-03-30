/**
 * render-repro-v2.ts — 元動画再現レンダラー (ReproComposition版)
 *
 * Usage:
 *   pnpm render:repro2 EzFYQHX5ICY
 *   pnpm render:repro2 path/to/timeline.json
 */
import 'dotenv/config'
import { bundle } from '@remotion/bundler'
import { renderMedia, selectComposition } from '@remotion/renderer'
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'
import { checkVoicevox, synthesize, parseWavDuration } from './services/voicevox/index'
import { getVoicevoxConfig } from './utils/config'
import type { ReproTimeline, ReproAudioEntry } from './remotion/compositions/ReproComposition'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function ensureDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
}
function toPosix(p: string): string {
  return p.split(path.sep).join('/')
}
function projectRoot(): string {
  return path.resolve(__dirname, '..')
}

function speakerToVoicevoxId(speaker: string): number {
  if (speaker === 'character1') return 13
  if (speaker === 'character2') return 0
  return 3 // narrator = ずんだもん
}

async function main(): Promise<void> {
  const arg = process.argv[2]
  if (!arg) {
    console.error('Usage: pnpm render:repro2 <videoId | path/to/timeline.json>')
    process.exit(1)
  }

  // Resolve timeline path
  let timelinePath: string
  if (existsSync(arg)) {
    timelinePath = path.resolve(arg)
  } else {
    timelinePath = path.join(projectRoot(), 'assets', 'repro', arg, 'timeline.json')
  }

  if (!existsSync(timelinePath)) {
    console.error(`Timeline not found: ${timelinePath}`)
    process.exit(1)
  }

  console.log(`[repro-v2] Loading timeline: ${timelinePath}`)
  const timeline: ReproTimeline = JSON.parse(readFileSync(timelinePath, 'utf-8'))
  const videoId = timeline.videoId
  const assetDir = path.dirname(timelinePath)
  const assetBasePath = toPosix(path.relative(projectRoot(), assetDir))

  // Output dir
  // Find next iteration number
  const reproBase = path.join(projectRoot(), 'generated', 'repro', videoId)
  ensureDir(reproBase)
  let iterNum = 1
  while (existsSync(path.join(reproBase, `iter_${String(iterNum).padStart(2, '0')}`, 'output.mp4'))) {
    iterNum++
  }
  const outDir = path.join(reproBase, `iter_${String(iterNum).padStart(2, '0')}`)
  ensureDir(outDir)
  const narrationDir = path.join(outDir, 'narration')
  ensureDir(narrationDir)

  // ── VOICEVOX synthesis ──
  const voicevox = getVoicevoxConfig()
  await checkVoicevox(voicevox.url)
  console.log(`[repro-v2] VOICEVOX connected at ${voicevox.url}`)

  const audioEntries: ReproAudioEntry[] = []

  // First pass: synthesize all TTS and measure actual durations
  const ttsDurations: Map<string, number> = new Map()
  for (const shot of timeline.shots) {
    if (!shot.narration || shot.narration.trim() === '') continue

    const speakerId = speakerToVoicevoxId(shot.speaker)
    const wavName = `tts_${shot.id}.wav`
    const wavPath = path.join(narrationDir, wavName)

    console.log(`[repro-v2] TTS ${shot.id}: "${shot.narration.slice(0, 30)}..." (speaker=${shot.speaker})`)
    const buffer = await synthesize(shot.narration, voicevox.url, speakerId, voicevox.gain, 1.5)
    writeFileSync(wavPath, buffer)

    const durationSec = parseWavDuration(buffer)
    ttsDurations.set(shot.id, durationSec)

    const publicWavDir = path.join(projectRoot(), assetBasePath, 'narration')
    ensureDir(publicWavDir)
    copyFileSync(wavPath, path.join(publicWavDir, wavName))
  }

  // Second pass: use timeline's startFrame/endFrame if they form a valid
  // continuous sequence, otherwise fall back to TTS-based packing
  const hasFixedTiming = timeline.shots.length > 1
    && timeline.shots[0].startFrame === 0
    && timeline.shots.every((s, i) => {
      if (i === 0) return true
      // Allow small gaps (≤3 frames) between shots
      return s.startFrame >= timeline.shots[i - 1].endFrame - 3
        && s.startFrame <= timeline.shots[i - 1].endFrame + 3
    })

  if (hasFixedTiming) {
    // Fixed timing mode: respect timeline's frame assignments
    // Only warn if TTS is longer than the allocated shot duration
    console.log('[repro-v2] Using fixed timing from timeline.json')
    for (const shot of timeline.shots) {
      const ttsDur = ttsDurations.get(shot.id)
      if (ttsDur) {
        const ttsFrames = Math.ceil(ttsDur * timeline.fps)
        const allocated = shot.endFrame - shot.startFrame
        if (ttsFrames > allocated + 6) {
          console.log(`[repro-v2] WARN: ${shot.id} TTS=${ttsFrames}f > allocated=${allocated}f (narration may be clipped)`)
        }
      }
    }
  } else {
    // Auto-pack mode: pack shots tightly based on TTS duration
    console.log('[repro-v2] Auto-packing shots based on TTS duration')
    let currentFrame = 0
    for (const shot of timeline.shots) {
      shot.startFrame = currentFrame
      const ttsDur = ttsDurations.get(shot.id)
      if (ttsDur) {
        const ttsFrames = Math.ceil(ttsDur * timeline.fps) + 6
        shot.endFrame = currentFrame + Math.max(ttsFrames, 57)
      } else {
        const holdFrames = shot.text && shot.text.length <= 4 ? 21 : 30
        shot.endFrame = currentFrame + holdFrames
      }
      currentFrame = shot.endFrame
    }
  }

  // Update total frames
  const lastShot = timeline.shots[timeline.shots.length - 1]
  timeline.totalFrames = lastShot.endFrame
  timeline.durationSec = timeline.totalFrames / timeline.fps
  console.log(`[repro-v2] Total: ${timeline.totalFrames}f (${timeline.durationSec.toFixed(2)}s)`)

  // Build audio entries with adjusted frames
  for (const shot of timeline.shots) {
    if (!ttsDurations.has(shot.id)) continue
    audioEntries.push({
      unitId: shot.id,
      src: `${assetBasePath}/narration/tts_${shot.id}.wav`,
      startFrame: shot.startFrame,
      endFrame: shot.endFrame,
      gainDb: 0,
    })
  }

  console.log(`[repro-v2] Generated ${audioEntries.length} audio entries`)

  // ── BGM: use comedy BGM if available, else generate sine ──
  const bgmMp3 = path.join(assetDir, 'bgm_comedy.mp3')
  const bgmWav = path.join(assetDir, 'bgm_loop.wav')
  if (existsSync(bgmMp3)) {
    // Convert mp3 to wav for Remotion compatibility, loop to fill full video duration
    const bgmDuration = timeline.durationSec + 2
    execSync(
      `ffmpeg -y -stream_loop -1 -i "${bgmMp3}" -t ${bgmDuration} -af "volume=0.5,afade=t=in:st=0:d=0.5,afade=t=out:st=${Math.max(0.1, bgmDuration - 1.5)}:d=1.5" -c:a pcm_s16le -ar 44100 "${bgmWav}"`,
      { stdio: 'pipe' },
    )
    console.log('[repro-v2] BGM: using bgm_comedy.mp3')
  } else {
    // Always regenerate sine wave BGM (ensures correct duration + volume)
    const bgmDuration = timeline.durationSec + 2
    const fadeOut = Math.max(0.1, bgmDuration - 3)
    const filterComplex = `[0:a][1:a]amix=inputs=2:weights=0.7 0.3,lowpass=f=900,volume=0.7,afade=t=in:st=0:d=1,afade=t=out:st=${fadeOut}:d=3`
    execSync(
      `ffmpeg -y -f lavfi -i "sine=frequency=196:duration=${bgmDuration}" -f lavfi -i "sine=frequency=392:duration=${bgmDuration}" -filter_complex "${filterComplex}" -c:a pcm_s16le -ar 44100 "${bgmWav}"`,
      { stdio: 'pipe' },
    )
    console.log('[repro-v2] BGM: generated sine wave')
  }

  // ── Remotion render ──
  const props = {
    timeline,
    audioEntries,
    bgmSrc: `${assetBasePath}/bgm_loop.wav`,
    bgmVolume: 0.7,
    assetBasePath,
  }

  console.log('[repro-v2] Bundling Remotion...')
  const bundleLocation = await bundle({
    entryPoint: path.resolve(__dirname, 'remotion', 'Root.tsx'),
    webpackOverride: (cfg) => cfg,
    publicDir: projectRoot(),
  })

  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: 'ReproVideo',
    inputProps: props,
  })

  const rawOutput = path.join(outDir, 'output_raw.mp4')
  console.log('[repro-v2] Rendering...')
  try {
    await renderMedia({
      composition,
      serveUrl: bundleLocation,
      codec: 'h264',
      crf: 22,
      outputLocation: rawOutput,
      inputProps: props,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (!message.includes('Target closed') || !existsSync(rawOutput)) throw error
    console.log('[repro-v2] Render completed (Target closed warning OK)')
  }

  // ── ffmpeg post-process ──
  const finalOutput = path.join(outDir, 'output.mp4')
  console.log('[repro-v2] Post-processing...')
  execSync([
    'ffmpeg', '-y',
    '-i', `"${rawOutput}"`,
    '-af', '"loudnorm=I=-14:TP=-1.5:LRA=11,aresample=44100"',
    '-c:v', 'libx264', '-crf', '22', '-preset', 'medium',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
    `"${finalOutput}"`,
  ].join(' '), { stdio: 'pipe' })

  // ── Copy to latest ──
  const latestDir = path.join(projectRoot(), 'generated', 'latest')
  ensureDir(latestDir)
  copyFileSync(finalOutput, path.join(latestDir, '完成.mp4'))
  copyFileSync(finalOutput, path.join(latestDir, 'output.mp4'))

  // Save timeline + audio entries
  writeFileSync(path.join(outDir, 'timeline.json'), JSON.stringify(timeline, null, 2))
  writeFileSync(path.join(outDir, 'audio_entries.json'), JSON.stringify(audioEntries, null, 2))

  console.log(`[repro-v2] Done! Output: ${finalOutput}`)
  console.log(`[repro-v2] 完成.mp4 → ${path.join(latestDir, '完成.mp4')}`)
}

main().catch((err) => {
  console.error('[repro-v2] Error:', err)
  process.exit(1)
})
