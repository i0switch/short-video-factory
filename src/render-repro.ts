// render-repro.ts — Reproduction renderer: builds config from scene definitions + VOICEVOX + extracted frames
import 'dotenv/config'
import { bundle } from '@remotion/bundler'
import { renderMedia, selectComposition } from '@remotion/renderer'
import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync, copyFileSync, unlinkSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'
import { checkVoicevox } from './services/voicevox/index'
import { synthesize, parseWavDuration } from './services/voicevox/index'
import { getVoicevoxConfig } from './utils/config'
import { logger } from './utils/logger'
import { getTwoChTotalFrames } from './remotion/components/timeline/TwoChTimelineController'
import type { TwoChVideoConfig, TwoChSceneConfig } from './remotion/types/video-2ch'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ── Scene definition for reproduction ──
interface ReproScene {
  text: string           // displayed caption (empty string for no caption)
  narration: string      // TTS text (empty for silent)
  speaker: string        // narrator | character1 | character2
  emotion: string
  effect: string
  durationMs: number     // target duration in milliseconds
  backgroundFrame: string // filename in generated/repro_XXXX/ (e.g. scene_01.png)
  mangaSymbol?: string
  captionColor?: string  // per-scene caption color override
}

interface ReproConfig {
  videoId: string         // e.g. "vid03_suwarenai"
  seriesTitle: string     // e.g. "笑える迷語集"
  videoTitle: string      // e.g. "座れないかも"
  titleColor?: string     // default: #FFD700
  captionColor?: string   // default: #FFFFFF
  captionFadeInFrames?: number // default: 6 (set 0 for frame-accurate refs)
  hideTitle?: boolean     // hide title bar (for baked-in frame backgrounds)
  hideCaption?: boolean   // hide caption overlay (for baked-in frame backgrounds)
  masterAudioSrc?: string  // optional full-length audio track
  fps: number
  ttsSpeed?: number       // TTS speed multiplier (default: 1.0, reference videos often need 1.3-1.5)
  bgmVolume?: number      // BGM volume in mix (default: 0.03)
  audioSampleRate?: number
  scenes: ReproScene[]
  outroText: string
  outroDurationMs: number
}

const SPEAKER_COLORS: Record<string, string> = {
  narrator: '#4488FF',
  character1: '#FF4444',
  character2: '#44CC44',
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
  // Read reproduction config
  const configPath = process.argv[2]
  if (!configPath) {
    console.error('Usage: tsx src/render-repro.ts <repro-config.json> [outDir]')
    process.exit(1)
  }
  const exportDirArg = process.argv[3]

  const repro: ReproConfig = JSON.parse(readFileSync(configPath, 'utf-8'))
  const fps = repro.fps || 30

  // Setup directories
  // NOTE: assets referenced by staticFile() must live under publicDir (project root).
  const workDir = path.resolve(__dirname, '..', 'generated', `repro_${repro.videoId}`)
  if (!existsSync(workDir)) mkdirSync(workDir, { recursive: true })
  const exportDir = exportDirArg ? path.resolve(process.cwd(), exportDirArg) : null
  if (exportDir && !existsSync(exportDir)) mkdirSync(exportDir, { recursive: true })

  // VOICEVOX check
  const { url, gain } = getVoicevoxConfig()
  await checkVoicevox(url)
  logger.info('VOICEVOX OK')

  // Synthesize audio for each scene
  logger.info(`[phase1] TTS合成: ${repro.scenes.length} scenes`)
  const sceneConfigs: TwoChSceneConfig[] = []
  const useMasterAudio = !!repro.masterAudioSrc

  for (let i = 0; i < repro.scenes.length; i++) {
    const s = repro.scenes[i]
    const targetFrames = Math.round((s.durationMs / 1000) * fps)
    const speakerId = SPEAKER_IDS[s.speaker] ?? SPEAKER_IDS.narrator

    let audioSrc = ''
    if (!useMasterAudio && s.narration && s.narration.trim()) {
      const wavPath = path.join(workDir, `audio_${String(i).padStart(2, '0')}.wav`)
      const ttsSpeed = repro.ttsSpeed ?? 1.0
      const buf = await synthesize(s.narration, url, speakerId, gain, ttsSpeed)
      writeFileSync(wavPath, buf)
      const dur = parseWavDuration(buf)
      logger.info(`  scene${i}: "${s.narration}" → ${dur.toFixed(2)}s, ${targetFrames}f`)
      audioSrc = toRelPath(wavPath)
    } else {
      logger.info(`  scene${i}: (silent) ${targetFrames}f`)
    }

    // Background frame path (skip if empty)
    const bgRelPath = s.backgroundFrame
      ? (() => { const p = path.join(workDir, s.backgroundFrame); return existsSync(p) ? toRelPath(p) : '' })()
      : ''

    sceneConfigs.push({
      durationFrames: targetFrames,
      speaker: s.speaker,
      speakerColor: SPEAKER_COLORS[s.speaker] ?? '#FFFFFF',
      text: s.text,
      emotion: s.emotion,
      effect: s.effect,
      audioSrc,
      imageSrc: '',  // No separate character image — using backgroundImageSrc
      backgroundImageSrc: bgRelPath,
      mangaSymbol: s.mangaSymbol ?? 'none',
      captionColor: s.captionColor ?? repro.captionColor,
      captionFadeInFrames: repro.captionFadeInFrames,
      fallbackUsed: false,
    })
  }

  // Outro (0 if not specified)
  const outroDurationFrames = repro.outroDurationMs > 0 ? Math.round((repro.outroDurationMs / 1000) * fps) : 0
  const outroWavPath = path.join(workDir, 'audio_outro.wav')
  if (repro.outroText && repro.outroText.trim() && repro.outroDurationMs > 0) {
    const outroBuf = await synthesize(repro.outroText, url, SPEAKER_IDS.narrator, gain, 1.0)
    writeFileSync(outroWavPath, outroBuf)
    logger.info(`  outro: "${repro.outroText}" → ${parseWavDuration(outroBuf).toFixed(2)}s`)
  }

  // Build TwoChVideoConfig
  const config: TwoChVideoConfig = {
    meta: { width: 1080, height: 1920, fps, audioSampleRate: repro.audioSampleRate },
    videoTitle: repro.videoTitle,
    seriesTitle: repro.seriesTitle,
    titleColor: repro.titleColor ?? '#FFD700',
    captionColor: repro.captionColor,
    captionFadeInFrames: repro.captionFadeInFrames,
    hideTitle: repro.hideTitle ?? false,
    hideCaption: repro.hideCaption ?? false,
    masterAudioSrc: repro.masterAudioSrc,
    scenes: sceneConfigs,
    outro: {
      text: repro.outroText,
      audioSrc: existsSync(outroWavPath) ? toRelPath(outroWavPath) : undefined,
      durationFrames: outroDurationFrames,
    },
  }

  // Save config
  writeFileSync(path.join(workDir, 'video-config.json'), JSON.stringify(config, null, 2))
  const totalFrames = getTwoChTotalFrames(config)
  logger.info(`Total: ${totalFrames}f (${(totalFrames / fps).toFixed(1)}s)`)

  // Bundle + Render
  logger.info('Bundling...')
  const bundleLocation = await bundle({
    entryPoint: path.resolve(__dirname, 'remotion', 'Root.tsx'),
    webpackOverride: (cfg) => cfg,
    publicDir: path.resolve(__dirname, '..'),
  })

  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: 'TwoChVideo',
    inputProps: { config },
  })

  const outputPath = path.join(workDir, 'output.mp4')
  logger.info(`Rendering to ${outputPath}...`)
  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: 'h264',
    crf: 23,
    outputLocation: outputPath,
    inputProps: { config },
    onProgress: ({ progress }) => {
      if (Math.round(progress * 100) % 10 === 0) {
        logger.info(`Progress: ${Math.round(progress * 100)}%`)
      }
    },
  })

  // BGM mix
  const bgmPath = path.resolve(__dirname, '..', 'assets', 'bgm', 'ukiuki_lalala.mp3')
  if (existsSync(bgmPath) && !repro.masterAudioSrc) {
    const withBgmPath = path.join(workDir, 'output_bgm.mp4')
    const durationSec = totalFrames / fps
    logger.info('Mixing BGM...')
    execSync([
      'ffmpeg', '-y',
      '-i', `"${outputPath}"`,
      '-i', `"${bgmPath}"`,
      '-filter_complex',
      `"[0:a]volume=1.0[voice];[1:a]volume=${(repro.bgmVolume ?? 0.03).toFixed(3)},afade=t=in:st=0:d=1,afade=t=out:st=${(durationSec - 2).toFixed(1)}:d=2[bgm];[voice][bgm]amix=inputs=2:duration=first:dropout_transition=0[out]"`,
      '-map', '0:v', '-map', '"[out]"',
      '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k',
      ...(repro.audioSampleRate ? ['-ar', String(repro.audioSampleRate)] : []),
      `"${withBgmPath}"`,
    ].join(' '), { stdio: 'pipe' })
    replaceFile(withBgmPath, outputPath)
    logger.info('BGM mixed!')
  } else if (repro.masterAudioSrc) {
    logger.info('Skipping BGM mix because masterAudioSrc is provided')
  }

  if (repro.masterAudioSrc) {
    const trimmedPath = path.join(workDir, 'output_trimmed.mp4')
    const durationSec = totalFrames / fps
    logger.info(`Trimming final mux to ${durationSec.toFixed(3)}s...`)
    execSync([
      'ffmpeg', '-y',
      '-i', `"${outputPath}"`,
      '-t', durationSec.toFixed(3),
      '-c:v', 'copy',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-movflags', '+faststart',
      `"${trimmedPath}"`,
    ].join(' '), { stdio: 'pipe' })
    replaceFile(trimmedPath, outputPath)
  }

  if (exportDir) {
    // Export the final mp4 + config for external iteration folders.
    const exportOutput = path.join(exportDir, 'output.mp4')
    const exportConfig = path.join(exportDir, 'video-config.json')
    copyFileSync(outputPath, exportOutput)
    copyFileSync(path.join(workDir, 'video-config.json'), exportConfig)
    logger.info(`Exported to ${exportDir}`)
  }

  logger.info(`Done! ${outputPath}`)
}

main().catch((err) => { console.error(err); process.exit(1) })
