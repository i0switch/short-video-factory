// render-template.ts — Template Engine CLI entry point
import 'dotenv/config'
import { bundle } from '@remotion/bundler'
import { renderMedia, selectComposition } from '@remotion/renderer'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'
import { TwoChScriptSchema } from './schema/twoch-script'
import { checkVoicevox, synthesize, parseWavDuration } from './services/voicevox/index'
import { getVoicevoxConfig, getPexelsApiKey } from './utils/config'
import { createJobDir, promoteToLatest } from './utils/job'
import { fixturesDir } from './utils/paths'
import { logger } from './utils/logger'
import { runTemplateEngine } from './services/template-engine/index'
import { getTwoChTotalFrames } from './remotion/components/timeline/TwoChTimelineController'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const SPEAKER_IDS: Record<string, number> = {
  narrator: 3,    // ずんだもん
  character1: 13, // 青山龍星
  character2: 2,  // 四国めたん
}

function writeJson(filePath: string, value: unknown): void {
  writeFileSync(filePath, JSON.stringify(value, null, 2))
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')

  // 1. Read script
  const argScriptPath = process.argv.find((a) => !a.startsWith('--') && a !== process.argv[0] && a !== process.argv[1])
  const scriptPath = argScriptPath
    ? path.resolve(process.cwd(), argScriptPath)
    : path.join(fixturesDir(), 'sample-script.json')
  const rawScript = JSON.parse(readFileSync(scriptPath, 'utf-8'))

  if (rawScript.format !== '2ch') {
    throw new Error('render-template only supports format="2ch" scripts. Use render:v3 for ranking format.')
  }

  const script = TwoChScriptSchema.parse(rawScript)
  logger.info(`Script: "${script.videoTitle}" (${script.episodes.reduce((s, e) => s + e.scenes.length, 0)} scenes)`)

  // 2. Create job directory
  const jobDir = await createJobDir()
  logger.info(`Job: ${jobDir}`)

  // 3. Run template engine
  const pexelsApiKey = getPexelsApiKey()
  const output = await runTemplateEngine({
    script,
    fps: script.meta?.fps ?? 30,
    jobDir,
    pexelsApiKey,
    skipAssets: dryRun,
    skipTts: dryRun,
  })

  // 4. Write all JSON outputs
  writeJson(path.join(jobDir, 'story.json'), output.storyJson)
  writeJson(path.join(jobDir, 'beats.json'), output.beatsJson)
  writeJson(path.join(jobDir, 'timeline.json'), output.timelineJson)
  writeJson(path.join(jobDir, 'audio.json'), output.audioJson)
  writeJson(path.join(jobDir, 'asset_manifest.json'), output.assetManifest)
  writeJson(path.join(jobDir, 'asset_requests.json'), output.assetRequests)
  writeJson(path.join(jobDir, 'template_manifest.json'), output.templateManifest)
  writeJson(path.join(jobDir, 'video-config.json'), output.config)
  logger.info('JSON outputs written')

  if (dryRun) {
    logger.info('Dry run complete — skipping TTS, render, and BGM mix')
    return
  }

  // 5. VOICEVOX TTS synthesis
  const { url: voicevoxUrl, gain } = getVoicevoxConfig()
  await checkVoicevox(voicevoxUrl)
  logger.info('VOICEVOX OK')

  const fps = output.config.meta.fps
  const scenes = output.config.scenes
  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i]
    if ('type' in scene) continue // skip episode title cards

    const speakerId = SPEAKER_IDS[scene.speaker] ?? SPEAKER_IDS.narrator
    const ttsText = scene.text
    if (!ttsText) continue

    const wavBuffer = await synthesize(ttsText, voicevoxUrl, speakerId, gain)
    const wavPath = path.join(jobDir, `voice_${i}.wav`)
    writeFileSync(wavPath, wavBuffer)
    const duration = parseWavDuration(wavBuffer)
    const voiceFrames = Math.ceil(duration * fps)

    // Update scene duration to match voice if voice is longer
    if (voiceFrames > scene.durationFrames) {
      scene.durationFrames = voiceFrames
    }
    scene.audioSrc = path.relative(path.resolve(__dirname, '..'), wavPath).split(path.sep).join('/')
    logger.info(`TTS [${i}]: ${ttsText.slice(0, 20)}... → ${duration.toFixed(2)}s`)
  }

  // Rewrite config after TTS updates
  writeJson(path.join(jobDir, 'video-config.json'), output.config)

  // 6. Remotion render
  const totalFrames = getTwoChTotalFrames(output.config)
  logger.info(`Total: ${totalFrames} frames (${(totalFrames / fps).toFixed(2)}s)`)

  logger.info('Bundling...')
  const bundleLocation = await bundle({
    entryPoint: path.resolve(__dirname, 'remotion', 'Root.tsx'),
    webpackOverride: (cfg) => cfg,
    publicDir: path.resolve(__dirname, '..'),
  })

  const inputProps = { config: output.config }
  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: 'TwoChVideo',
    inputProps,
  })

  const outputPath = path.join(jobDir, 'output.mp4')
  logger.info(`Rendering to ${outputPath}...`)
  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: 'h264',
    crf: 23,
    outputLocation: outputPath,
    inputProps,
    onProgress: ({ progress }) => logger.info(`Progress: ${Math.round(progress * 100)}%`),
  })

  // 7. BGM mix
  const bgmPath = path.resolve(__dirname, '..', 'assets', 'bgm', 'ukiuki_lalala.mp3')
  if (existsSync(bgmPath)) {
    const withBgmPath = path.join(jobDir, 'output_bgm.mp4')
    logger.info('Mixing BGM...')
    execSync([
      'ffmpeg', '-y',
      '-i', `"${outputPath}"`,
      '-i', `"${bgmPath}"`,
      '-filter_complex',
      '"[0:a]volume=3.0[voice];[1:a]volume=0.12,afade=t=in:st=0:d=1,afade=t=out:st=' + ((totalFrames / fps) - 2).toFixed(3) + ':d=2[bgm];[voice][bgm]amix=inputs=2:duration=first:dropout_transition=0[out]"',
      '-map', '0:v', '-map', '"[out]"',
      '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k',
      `"${withBgmPath}"`,
    ].join(' '), { stdio: 'pipe' })

    // Replace original with BGM version
    const { renameSync, copyFileSync, unlinkSync } = await import('fs')
    try {
      renameSync(withBgmPath, outputPath)
    } catch {
      copyFileSync(withBgmPath, outputPath)
      unlinkSync(withBgmPath)
    }
    logger.info('BGM mixed!')
  } else {
    logger.warn(`BGM file not found: ${bgmPath} — skipping BGM mix`)
  }

  // 8. Promote to latest
  await promoteToLatest(jobDir)
  logger.info('Done! generated/latest/output.mp4')
}

main().catch((err) => { console.error(err); process.exit(1) })
