// render-from-existing-script.ts — 既存 script.json から動画を生成
import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { bundle } from '@remotion/bundler'
import { renderMedia, selectComposition } from '@remotion/renderer'
import { buildV3Plan } from './services/renderer/build-v3-plan'
import { createJobDir, promoteToLatest } from './utils/job'
import { logger } from './utils/logger'
import { getTotalFrames } from './remotion/components/timeline/TimelineController'
import type { Script } from './schema/script'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const scriptPath = process.argv[2]
if (!scriptPath) {
  console.error('Usage: tsx src/render-from-existing-script.ts <path/to/script.json>')
  process.exit(1)
}

async function main() {
  const script: Script = JSON.parse(fs.readFileSync(scriptPath, 'utf-8'))
  logger.info(`Script loaded: "${script.videoTitle}" (${script.items.length} items)`)

  const jobDir = await createJobDir()
  logger.info(`Job: ${jobDir}`)

  try {
    const config = await buildV3Plan(script, jobDir)
    const totalFrames = getTotalFrames(config)
    logger.info(`Total: ${totalFrames} frames (${(totalFrames / config.meta.fps).toFixed(1)}s)`)

    fs.writeFileSync(path.join(jobDir, 'video-config.json'), JSON.stringify(config, null, 2))
    fs.writeFileSync(path.join(jobDir, 'script.json'), JSON.stringify(script, null, 2))

    const outputPath = path.join(jobDir, 'output.mp4')
    const bundleLocation = await bundle({
      entryPoint: path.resolve(__dirname, 'remotion', 'Root.tsx'),
      webpackOverride: (cfg) => cfg,
      publicDir: path.resolve(__dirname, '..'),
    })

    const composition = await selectComposition({
      serveUrl: bundleLocation,
      id: 'RankingVideoV2',
      inputProps: { config },
    })

    await renderMedia({
      composition,
      serveUrl: bundleLocation,
      codec: 'h264',
      outputLocation: outputPath,
      inputProps: { config },
      onProgress: ({ progress }) => logger.info(`Progress: ${Math.round(progress * 100)}%`),
    })

    await promoteToLatest(jobDir)
    logger.info(`Done! ${outputPath}`)
  } catch (err) {
    try { fs.rmSync(jobDir, { recursive: true, force: true }) } catch {}
    console.error(`[ERROR] ${err instanceof Error ? err.message : err}`)
    process.exit(1)
  }
}

main()
