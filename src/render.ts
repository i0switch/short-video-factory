import { bundle } from '@remotion/bundler'
import { renderMedia, selectComposition } from '@remotion/renderer'
import { readFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { RenderPlanSchema } from './schema/render-plan'
import { createJobDir, promoteToLatest } from './utils/job'
import { logger } from './utils/logger'
import videoConfigData from '../sample-video.json' assert { type: 'json' }

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 環境変数で切り替え可能 (デフォルトは新 Composition)
const COMPOSITION_ID = process.env.COMPOSITION ?? 'RankingVideoV2'

async function main() {
  let inputProps: Record<string, unknown> = {}

  if (COMPOSITION_ID === 'RankingVideo') {
    // 旧 Composition: fixtures/sample-render-plan.json を使用
    const planPath = path.resolve(__dirname, '..', 'fixtures', 'sample-render-plan.json')
    const rawPlan = JSON.parse(readFileSync(planPath, 'utf-8'))
    const plan = RenderPlanSchema.parse(rawPlan)
    inputProps = { plan }
  } else {
    // 新 Composition: sample-video-config.json を使用
    inputProps = { config: videoConfigData }
  }

  logger.info(`Creating job directory...`)
  const jobDir = await createJobDir()
  const outputPath = path.join(jobDir, 'output.mp4')

  logger.info('Bundling Remotion entry point...')
  const entryPoint = path.resolve(__dirname, 'remotion', 'Root.tsx')
  const bundleLocation = await bundle({
    entryPoint,
    webpackOverride: (config) => config,
    publicDir: path.resolve(__dirname, '..'),
  })

  logger.info(`Selecting composition: ${COMPOSITION_ID}`)
  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: COMPOSITION_ID,
    inputProps,
  })

  logger.info(`Rendering to ${outputPath}...`)
  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: 'h264',
    outputLocation: outputPath,
    inputProps,
    onProgress: ({ progress }) => {
      logger.info(`Progress: ${Math.round(progress * 100)}%`)
    },
  })

  logger.info('Promoting to latest...')
  await promoteToLatest(jobDir)

  logger.info(`Done! Output: ${outputPath}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
