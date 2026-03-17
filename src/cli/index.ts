import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { Command } from 'commander'
import { bundle } from '@remotion/bundler'
import { renderMedia, selectComposition } from '@remotion/renderer'
import { checkVoicevox } from '../services/voicevox/index'
import { buildV3Plan } from '../services/renderer/build-v3-plan'
import { getLlmConfig, getVoicevoxConfig } from '../utils/config'
import { createJobDir, promoteToLatest } from '../utils/job'
import { logger } from '../utils/logger'
import { generateScript } from '../llm/generate-script'
import { getTotalFrames } from '../remotion/components/timeline/TimelineController'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const program = new Command()

program
  .name('generate')
  .description('短尺ランキング動画を生成する')
  .requiredOption('--topic <string>', 'テーマ')
  .option('--format <string>', '動画フォーマット', 'ranking')
  .option('--items <number>', '項目数 (3〜10)', '10')
  .option('--speaker <number>', 'VOICEVOX speaker ID', '3')
  .option('--dry-run', 'script.json のみ生成して終了')
  .option('--output <string>', '出力先ディレクトリ')
  .parse(process.argv)

const opts = program.opts<{
  topic: string
  format: string
  items: string
  speaker: string
  dryRun?: boolean
  output?: string
}>()

async function main() {
  const topic = opts.topic
  const itemCount = Math.min(10, Math.max(3, parseInt(opts.items, 10)))
  const speakerId = parseInt(opts.speaker, 10)
  const dryRun = opts.dryRun ?? false

  const jobDir = await createJobDir()
  logger.info(`Job: ${jobDir}`)

  try {
    if (!dryRun) {
      const { url } = getVoicevoxConfig()
      await checkVoicevox(url)
      logger.info('VOICEVOX OK')
    }

    logger.info(`Generating script for topic: "${topic}" (${itemCount} items)`)
    const llmConfig = getLlmConfig()
    const script = await generateScript(topic, itemCount, llmConfig)
    logger.info(`Script generated: "${script.videoTitle}"`)

    const scriptPath = path.join(jobDir, 'script.json')
    fs.writeFileSync(scriptPath, JSON.stringify(script, null, 2))
    logger.info(`Script saved: ${scriptPath}`)

    if (dryRun) {
      logger.info(`[dry-run] Done. script.json: ${scriptPath}`)
      return
    }

    // speaker オプションで上書き
    process.env.VOICEVOX_SPEAKER = String(speakerId)

    // v3 プランを生成 (budget-driven timing)
    const config = await buildV3Plan(script, jobDir)

    const totalFrames = getTotalFrames(config)
    logger.info(`Total: ${totalFrames} frames (${(totalFrames / config.meta.fps).toFixed(1)}s)`)

    // config.json 保存 (デバッグ用)
    fs.writeFileSync(path.join(jobDir, 'video-config.json'), JSON.stringify(config, null, 2))

    // bundle → render (RankingVideoV2)
    const outputPath = path.join(jobDir, 'output.mp4')
    const bundleLocation = await bundle({
      entryPoint: path.resolve(__dirname, '..', 'remotion', 'Root.tsx'),
      webpackOverride: (cfg) => cfg,
      publicDir: path.resolve(__dirname, '..', '..'),
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
    logger.info('Done! generated/latest/output.mp4')

  } catch (err) {
    try {
      fs.rmSync(jobDir, { recursive: true, force: true })
    } catch { /* ignore cleanup failure */ }
    console.error(`[ERROR] ${err instanceof Error ? err.message : err}`)
    process.exit(1)
  }
}

main()
