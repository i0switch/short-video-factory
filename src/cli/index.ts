import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { Command } from 'commander'
import { bundle } from '@remotion/bundler'
import { renderMedia, selectComposition } from '@remotion/renderer'
import { RenderPlanSchema } from '../schema/render-plan'
import { checkVoicevox } from '../services/voicevox/index'
import { buildPlan } from '../services/renderer/build-plan'
import { getLlmConfig, getVoicevoxConfig } from '../utils/config'
import { createJobDir, promoteToLatest } from '../utils/job'
import { logger } from '../utils/logger'
import { generateScript } from '../llm/generate-script'

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

  // a. ジョブディレクトリ作成
  const jobDir = await createJobDir()
  logger.info(`Job: ${jobDir}`)

  try {
    // b. VOICEVOX 起動チェック（dry-run 以外）
    if (!dryRun) {
      const { url } = getVoicevoxConfig()
      await checkVoicevox(url)
      logger.info('VOICEVOX OK')
    }

    // c. LLM 台本生成
    logger.info(`Generating script for topic: "${topic}" (${itemCount} items)`)
    const llmConfig = getLlmConfig()
    const script = await generateScript(topic, itemCount, llmConfig)
    logger.info(`Script generated: "${script.videoTitle}"`)

    // script.json 保存
    const scriptPath = path.join(jobDir, 'script.json')
    fs.writeFileSync(scriptPath, JSON.stringify(script, null, 2))
    logger.info(`Script saved: ${scriptPath}`)

    // d. --dry-run → 終了
    if (dryRun) {
      logger.info(`[dry-run] Done. script.json: ${scriptPath}`)
      return
    }

    // e. buildPlan（VOICEVOX音声 + Pexels画像 並列）
    const voicevoxConfig = getVoicevoxConfig()
    // speaker オプションで上書き
    process.env.VOICEVOX_SPEAKER = String(speakerId)
    const plan = await buildPlan(script, jobDir)

    // f. RenderPlanSchema.parse → render-plan.json 保存
    RenderPlanSchema.parse(plan)
    fs.writeFileSync(path.join(jobDir, 'render-plan.json'), JSON.stringify(plan, null, 2))
    logger.info(`Total: ${plan.totalDurationInFrames} frames (${(plan.totalDurationInFrames / plan.fps).toFixed(1)}s)`)

    // g. Remotion bundle → renderMedia
    const outputPath = path.join(jobDir, 'output.mp4')
    const bundleLocation = await bundle({
      entryPoint: path.resolve(__dirname, '..', 'remotion', 'Root.tsx'),
      webpackOverride: (config) => config,
      publicDir: path.resolve(__dirname, '..', '..'),
    })
    const composition = await selectComposition({
      serveUrl: bundleLocation,
      id: 'RankingVideo',
      inputProps: { plan },
    })
    await renderMedia({
      composition,
      serveUrl: bundleLocation,
      codec: 'h264',
      outputLocation: outputPath,
      inputProps: { plan },
      onProgress: ({ progress }) => logger.info(`Progress: ${Math.round(progress * 100)}%`),
    })

    // h. 成功 → latest/ に昇格
    await promoteToLatest(jobDir)
    logger.info('Done! generated/latest/output.mp4')

  } catch (err) {
    // i. 失敗 → jobDir 削除 + エラー表示
    try {
      fs.rmSync(jobDir, { recursive: true, force: true })
    } catch {
      // クリーンアップ失敗は無視
    }
    console.error(`[ERROR] ${err instanceof Error ? err.message : err}`)
    process.exit(1)
  }
}

main()
