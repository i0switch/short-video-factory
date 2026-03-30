// render-shotcue.ts — Renderer for the shot/cue timeline architecture
import 'dotenv/config'
import { bundle } from '@remotion/bundler'
import { renderMedia, selectComposition } from '@remotion/renderer'
import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync, copyFileSync, unlinkSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'
import { checkVoicevox, synthesize, parseWavDuration } from './services/voicevox/index'
import { getVoicevoxConfig } from './utils/config'
import { logger } from './utils/logger'
import type { ShotCueTimeline, TimelineShot } from './remotion/compositions/ShotCueComposition'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ── Input file types ──

interface StoryUnit {
  id: string
  speaker: string          // narrator | character1 | character2
  text: string             // narration text for TTS
  shotId: string           // links to which shot this belongs to
}

interface StoryJson {
  units: StoryUnit[]
}

interface AudioEntry {
  unitId: string
  src: string              // relative path to audio file (filled after TTS)
  durationSec: number
}

interface AudioJson {
  entries: AudioEntry[]
  tts?: AudioEntry[]     // alternative key from timeline-builder
  ttsSpeed?: number
}

const SPEAKER_IDS: Record<string, number> = {
  narrator: 3,      // ずんだもん
  character1: 13,   // 青山龍星
  character2: 0,    // 四国めたん
}

function toRelPath(absPath: string): string {
  const projectRoot = path.resolve(__dirname, '..')
  const rel = path.relative(projectRoot, absPath)
  return rel.split(path.sep).join('/')
}

function replaceFile(src: string, dest: string): void {
  try {
    renameSync(src, dest)
  } catch {
    copyFileSync(src, dest)
    unlinkSync(src)
  }
}

async function main() {
  const inputDir = process.argv[2]
  if (!inputDir) {
    console.error('Usage: tsx src/render-shotcue.ts <directory>')
    console.error('  directory must contain: timeline.json, story.json, audio.json')
    process.exit(1)
  }

  const baseDir = path.resolve(process.cwd(), inputDir)
  if (!existsSync(baseDir)) {
    console.error(`Directory not found: ${baseDir}`)
    process.exit(1)
  }

  // ── Read input files ──
  const timelinePath = path.join(baseDir, 'timeline.json')
  const storyPath = path.join(baseDir, 'story.json')
  const audioPath = path.join(baseDir, 'audio.json')

  if (!existsSync(timelinePath)) {
    console.error(`Missing: ${timelinePath}`)
    process.exit(1)
  }

  const timeline: ShotCueTimeline = JSON.parse(readFileSync(timelinePath, 'utf-8'))
  const fps = timeline.fps || 30

  // story.json and audio.json are optional — TTS is skipped if missing
  const story: StoryJson | null = existsSync(storyPath)
    ? JSON.parse(readFileSync(storyPath, 'utf-8'))
    : null
  const audioRaw: AudioJson = existsSync(audioPath)
    ? JSON.parse(readFileSync(audioPath, 'utf-8'))
    : { entries: [] }
  // Normalize: support both "entries" and "tts" keys
  if (!audioRaw.entries) audioRaw.entries = []
  if (audioRaw.tts && audioRaw.entries.length === 0) {
    audioRaw.entries = audioRaw.tts.map(t => ({ unitId: (t as any).id ?? t.unitId, src: t.src ?? '', durationSec: t.durationSec ?? 0 }))
  }
  const audio = audioRaw

  // ── Setup work directory ──
  const workDir = path.join(baseDir, 'work')
  if (!existsSync(workDir)) mkdirSync(workDir, { recursive: true })

  // ── Phase 1: TTS synthesis ──
  if (story && story.units.length > 0) {
    const { url, gain } = getVoicevoxConfig()
    await checkVoicevox(url)
    logger.info('VOICEVOX OK')

    const ttsSpeed = audio.ttsSpeed ?? 1.4

    logger.info(`[phase1] TTS synthesis: ${story.units.length} units`)
    for (const unit of story.units) {
      if (!unit.text || !unit.text.trim()) {
        logger.info(`  ${unit.id}: (silent)`)
        continue
      }

      // Check if audio already exists
      const existingEntry = audio.entries.find((e) => e.unitId === unit.id)
      if (existingEntry && existingEntry.src && existsSync(path.resolve(baseDir, existingEntry.src))) {
        logger.info(`  ${unit.id}: already exists, skipping`)
        continue
      }

      const speakerId = SPEAKER_IDS[unit.speaker] ?? SPEAKER_IDS.narrator
      const wavFilename = `tts_${unit.id}.wav`
      const wavPath = path.join(workDir, wavFilename)

      const buf = await synthesize(unit.text, url, speakerId, gain, ttsSpeed)
      writeFileSync(wavPath, buf)
      const dur = parseWavDuration(buf)
      logger.info(`  ${unit.id}: "${unit.text}" -> ${dur.toFixed(2)}s`)

      // Update or add audio entry
      const relWavPath = path.relative(baseDir, wavPath).split(path.sep).join('/')
      const entry = audio.entries.find((e) => e.unitId === unit.id)
      if (entry) {
        entry.src = relWavPath
        entry.durationSec = dur
      } else {
        audio.entries.push({ unitId: unit.id, src: relWavPath, durationSec: dur })
      }
    }

    // Save updated audio.json
    writeFileSync(audioPath, JSON.stringify(audio, null, 2))
    logger.info('audio.json updated')
  } else {
    logger.info('[phase1] No story.json or no units — skipping TTS')
  }

  // ── Phase 2: Wire audio into timeline shots ──
  // Match story units to shots by shotId (if present) or by frame overlap
  if (story) {
    for (const unit of story.units) {
      const audioEntry = audio.entries.find((e) => e.unitId === unit.id)
      if (!audioEntry || !audioEntry.src) continue

      // Try shotId first, then fall back to frame-range matching
      let shot: TimelineShot | undefined
      if ((unit as any).shotId) {
        shot = timeline.shots.find((s) => s.id === (unit as any).shotId)
      }
      if (!shot && (unit as any).startFrame !== undefined) {
        // Match by frame overlap: find the shot that contains this unit's startFrame
        const sf = (unit as any).startFrame as number
        shot = timeline.shots.find((s) => sf >= s.startFrame && sf < s.endFrame)
      }
      if (!shot) {
        // Last resort: match by index (s1 -> sh1, s2 -> sh2, etc.)
        const idx = parseInt(unit.id.replace(/\D/g, ''), 10) - 1
        if (idx >= 0 && idx < timeline.shots.length) shot = timeline.shots[idx]
      }
      if (shot) {
        const absAudioPath = path.resolve(baseDir, audioEntry.src)
        shot.audioSrc = toRelPath(absAudioPath)
      }
    }
  }

  // ── Phase 3: Ensure all shot asset paths are project-relative ──
  for (const shot of timeline.shots) {
    if (shot.background?.src) shot.background.src = resolveAssetPath(baseDir, shot.background.src)
    if (shot.character?.src) shot.character.src = resolveAssetPath(baseDir, shot.character.src)
    // Initialize missing objects
    if (!shot.background) (shot as any).background = { src: '' }
    if (!shot.character) (shot as any).character = { src: '' }
  }

  const totalFrames = timeline.totalFrames > 0
    ? timeline.totalFrames
    : Math.max(...timeline.shots.map((s) => s.endFrame), 0)

  logger.info(`Total: ${totalFrames}f (${(totalFrames / fps).toFixed(1)}s)`)

  // Save resolved timeline for debugging
  writeFileSync(path.join(workDir, 'timeline-resolved.json'), JSON.stringify(timeline, null, 2))

  // ── Phase 4: Bundle + Render ──
  logger.info('Bundling...')
  const bundleLocation = await bundle({
    entryPoint: path.resolve(__dirname, 'remotion', 'Root.tsx'),
    webpackOverride: (cfg) => cfg,
    publicDir: path.resolve(__dirname, '..'),
  })

  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: 'ShotCueVideo',
    inputProps: { timeline },
  })

  const rawOutputPath = path.join(workDir, 'output_raw.mp4')
  logger.info(`Rendering to ${rawOutputPath}...`)
  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: 'h264',
    crf: 23,
    outputLocation: rawOutputPath,
    inputProps: { timeline },
    onProgress: ({ progress }) => {
      const pct = Math.round(progress * 100)
      if (pct % 10 === 0) {
        logger.info(`Progress: ${pct}%`)
      }
    },
  })

  // ── Phase 5: BGM mix ──
  const bgmPath = path.resolve(__dirname, '..', 'assets', 'bgm', 'ukiuki_lalala.mp3')
  let outputPath = rawOutputPath

  if (existsSync(bgmPath)) {
    const withBgmPath = path.join(workDir, 'output_bgm.mp4')
    const durationSec = totalFrames / fps
    const bgmVolume = 0.10
    logger.info('Mixing BGM...')
    execSync([
      'ffmpeg', '-y',
      '-i', `"${rawOutputPath}"`,
      '-i', `"${bgmPath}"`,
      '-filter_complex',
      `"[0:a]volume=1.0[voice];[1:a]volume=${bgmVolume.toFixed(3)},afade=t=in:st=0:d=1,afade=t=out:st=${(durationSec - 2).toFixed(1)}:d=2[bgm];[voice][bgm]amix=inputs=2:duration=first:dropout_transition=0[out]"`,
      '-map', '0:v', '-map', '"[out]"',
      '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k',
      `"${withBgmPath}"`,
    ].join(' '), { stdio: 'pipe' })
    outputPath = withBgmPath
    logger.info('BGM mixed!')
  }

  // ── Phase 6: Audio normalization (loudnorm to -16dB mean) ──
  const normalizedPath = path.join(workDir, 'output_normalized.mp4')
  logger.info('Normalizing audio to -16dB mean...')
  execSync([
    'ffmpeg', '-y',
    '-i', `"${outputPath}"`,
    '-af', '"loudnorm=I=-16:TP=-1:LRA=11"',
    '-c:v', 'copy',
    '-c:a', 'aac', '-b:a', '192k',
    '-movflags', '+faststart',
    `"${normalizedPath}"`,
  ].join(' '), { stdio: 'pipe' })

  // ── Phase 7: Move final output ──
  const finalOutputPath = path.join(baseDir, 'output.mp4')
  replaceFile(normalizedPath, finalOutputPath)

  // Clean up intermediate files
  for (const f of [rawOutputPath, outputPath]) {
    if (existsSync(f) && f !== finalOutputPath) {
      try { unlinkSync(f) } catch { /* ignore */ }
    }
  }

  logger.info(`Done! ${finalOutputPath}`)
}

/** Resolve an asset path: if absolute or already project-relative, use toRelPath.
 *  If relative to baseDir, resolve from baseDir first. Empty string stays empty. */
function resolveAssetPath(baseDir: string, src: string): string {
  if (!src) return ''
  // Already an absolute path
  if (path.isAbsolute(src)) return toRelPath(src)
  // Try as relative to baseDir
  const fromBase = path.resolve(baseDir, src)
  if (existsSync(fromBase)) return toRelPath(fromBase)
  // Assume it's already project-relative
  return src
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
