import 'dotenv/config'
import { bundle } from '@remotion/bundler'
import { renderMedia, selectComposition } from '@remotion/renderer'
import { readFileSync, writeFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { ScriptSchema } from './schema/script'
import { RenderPlanSchema } from './schema/render-plan'
import { checkVoicevox } from './services/voicevox/index'
import { buildPlan } from './services/renderer/build-plan'
import { getVoicevoxConfig } from './utils/config'
import { createJobDir, promoteToLatest } from './utils/job'
import { fixturesDir } from './utils/paths'
import { logger } from './utils/logger'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function main() {
  // 1. sample-script.json 読み込み・バリデーション
  const scriptPath = path.join(fixturesDir(), 'sample-script.json')
  const script = ScriptSchema.parse(JSON.parse(readFileSync(scriptPath, 'utf-8')))
  logger.info(`Script: "${script.videoTitle}" (${script.items.length} items)`)

  // 2. VOICEVOX起動チェック
  const { url } = getVoicevoxConfig()
  await checkVoicevox(url)
  logger.info('VOICEVOX OK')

  // 3. ジョブディレクトリ作成
  const jobDir = await createJobDir()
  logger.info(`Job: ${jobDir}`)

  // 4. RenderPlan組立（VOICEVOXで音声合成・WAV保存）
  const plan = await buildPlan(script, jobDir)
  RenderPlanSchema.parse(plan)

  // 5. render-plan.json 保存（デバッグ用）
  writeFileSync(path.join(jobDir, 'render-plan.json'), JSON.stringify(plan, null, 2))
  logger.info(`Total: ${plan.totalDurationInFrames} frames (${(plan.totalDurationInFrames / plan.fps).toFixed(1)}s)`)

  // 6. バンドル → レンダリング
  const outputPath = path.join(jobDir, 'output.mp4')
  const bundleLocation = await bundle({
    entryPoint: path.resolve(__dirname, 'remotion', 'Root.tsx'),
    webpackOverride: (config) => config,
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

  // 7. latest/ に昇格
  await promoteToLatest(jobDir)
  logger.info(`Done! generated/latest/output.mp4`)
}

main().catch((err) => { console.error(err); process.exit(1) })
