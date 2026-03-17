import fs from 'fs'
import path from 'path'
import type { Script } from '../../schema/script'
import type { RenderPlan, RenderScene } from '../../schema/render-plan'
import { getVideoConfig, getVoicevoxConfig, getPexelsApiKey } from '../../utils/config'
import { projectRoot } from '../../utils/paths'
import { synthesize, parseWavDuration } from '../voicevox/index'
import { fetchImage } from '../image/index'
import { copyFallbackImage } from '../image/fallback'
import { logger } from '../../utils/logger'

const FPS = 30
// サブシーン尺（フレーム数）
const SUB_A_FRAMES = 60   // 2秒
const SUB_B_FRAMES = 75   // 2.5秒
const MIN_RANKING_SEC = 7.0

function toRemotionPath(absPath: string): string {
  return path.relative(projectRoot(), absPath).split(path.sep).join('/')
}

/** videoTitle を行に分割してタイトル行カラー付きデータを生成 */
function buildTitleLines(videoTitle: string): Array<{ text: string; color: string }> {
  // LLM が改行で返した場合はそのまま使う
  const rawLines = videoTitle.split(/\n/).filter(Boolean)
  const colors = ['#FFFFFF', '#CC0000', '#CC0000', '#FFFFFF']
  // 12文字ごとに分割（改行なし場合）
  if (rawLines.length <= 1) {
    const lines: string[] = []
    for (let i = 0; i < videoTitle.length; i += 12) lines.push(videoTitle.slice(i, i + 12))
    return lines.map((text, i) => ({ text, color: colors[i % colors.length] }))
  }
  return rawLines.map((text, i) => ({ text, color: colors[i % colors.length] }))
}

export async function buildPlan(script: Script, jobDir: string): Promise<RenderPlan> {
  const { fps, width, height } = getVideoConfig()
  const { url, speaker, gain } = getVoicevoxConfig()
  const apiKey = getPexelsApiKey()
  const scenes: RenderScene[] = []

  // タイトルシーン（音声なし・常に fallback 画像）
  const titleImgPath = copyFallbackImage(jobDir, 'img_title.png')
  scenes.push({
    type: 'title',
    title: script.videoTitle,
    titleLines: buildTitleLines(script.videoTitle),
    imagePath: toRemotionPath(titleImgPath),
    audioPath: null,
    audioDurationSec: null,
    durationInFrames: Math.ceil(4 * fps),  // 4秒
    fallbackUsed: true,
  })

  // ランキングシーン（音声あり + Pexels 画像）- 並列処理
  const rankingScenes = await Promise.all(
    script.items.map(async (item, i) => {
      const wavFileName = `item_${String(i).padStart(2, '0')}.wav`
      const wavAbsPath = path.join(jobDir, wavFileName)

      logger.info(`Synthesizing rank ${item.rank}: "${item.topic}"`)
      const [wavBuffer, imgResult] = await Promise.all([
        synthesize(item.body, url, speaker, gain),
        fetchImage(item.imageKeywordsEn, apiKey, jobDir, `img_${i}.jpg`),
      ])

      fs.writeFileSync(wavAbsPath, wavBuffer)
      const audioDurationSec = parseWavDuration(wavBuffer)
      const durationInFrames = Math.ceil(Math.max(audioDurationSec + 0.5, MIN_RANKING_SEC) * fps)

      // サブシーンタイミング計算
      const aEndFrame = SUB_A_FRAMES
      const bEndFrame = SUB_A_FRAMES + SUB_B_FRAMES

      if (imgResult.fallbackUsed) logger.warn(`  → fallback used for rank ${item.rank}`)

      return {
        type: 'ranking' as const,
        rank: item.rank,
        title: item.topic,
        topic: item.topic,
        comment1: item.comment1,
        comment2: item.comment2,
        imagePath: toRemotionPath(imgResult.imagePath),
        audioPath: toRemotionPath(wavAbsPath),
        audioDurationSec,
        durationInFrames,
        subSceneTiming: { aEndFrame, bEndFrame },
        fallbackUsed: imgResult.fallbackUsed,
      }
    })
  )
  scenes.push(...rankingScenes)

  // エンディングシーン（音声なし）
  scenes.push({
    type: 'ending',
    title: script.outro,
    imagePath: '',
    audioPath: null,
    audioDurationSec: null,
    durationInFrames: Math.ceil(3 * fps),
    fallbackUsed: false,
  })

  const totalDurationInFrames = scenes.reduce((sum, s) => sum + s.durationInFrames, 0)
  return { videoTitle: script.videoTitle, fps, width, height, totalDurationInFrames, scenes }
}
