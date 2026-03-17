// render-v3.ts — DEFINITIVE_v3 フルレンダー (VOICEVOX + Pexels + audio)
import 'dotenv/config'
import { bundle } from '@remotion/bundler'
import { renderMedia, selectComposition } from '@remotion/renderer'
import { readFileSync, writeFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { ScriptSchema } from './schema/script'
import { checkVoicevox } from './services/voicevox/index'
import { buildV3Plan } from './services/renderer/build-v3-plan'
import { getVoicevoxConfig } from './utils/config'
import { createJobDir, promoteToLatest } from './utils/job'
import { fixturesDir } from './utils/paths'
import { logger } from './utils/logger'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function main() {
  // 1. sample-script.json 読み込み
  const scriptPath = path.join(fixturesDir(), 'sample-script.json')
  const script = ScriptSchema.parse(JSON.parse(readFileSync(scriptPath, 'utf-8')))
  logger.info(`Script: "${script.videoTitle}" (${script.items.length} items)`)

  // 2. VOICEVOX 起動確認
  const { url } = getVoicevoxConfig()
  await checkVoicevox(url)
  logger.info('VOICEVOX OK')

  // 3. ジョブディレクトリ作成
  const jobDir = await createJobDir()
  logger.info(`Job: ${jobDir}`)

  // 4. VideoV3Config 組立 (VOICEVOX合成 + Pexels取得)
  const config = await buildV3Plan(script, jobDir)
  const totalFrames = config.scenes.reduce((s, sc) => s + (sc.durationFrames ?? config.meta.sceneFrames), 0)
    + config.meta.introFrames + config.meta.outroFrames
  logger.info(`Total: ${totalFrames} frames (${(totalFrames / config.meta.fps).toFixed(1)}s)`)

  // 5. config.json 保存 (デバッグ用)
  writeFileSync(path.join(jobDir, 'video-config.json'), JSON.stringify(config, null, 2))

  // 6. バンドル → レンダリング
  const outputPath = path.join(jobDir, 'output.mp4')
  logger.info('Bundling...')
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

  logger.info(`Rendering to ${outputPath}...`)
  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: 'h264',
    outputLocation: outputPath,
    inputProps: { config },
    onProgress: ({ progress }) => logger.info(`Progress: ${Math.round(progress * 100)}%`),
  })

  // 7. latest/ に昇格
  await promoteToLatest(jobDir)
  logger.info(`Done! generated/latest/output.mp4`)
}

main().catch((err) => { console.error(err); process.exit(1) })
