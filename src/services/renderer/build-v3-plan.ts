// build-v3-plan.ts — Script → VideoV3Config (budget-driven timing)
import fs from 'fs'
import path from 'path'
import type { Script } from '../../schema/script'
import type { VideoV3Config, V3Scene } from '../../remotion/types/video-v3'
import { getVoicevoxConfig, getPexelsApiKey } from '../../utils/config'
import { synthesize, parseWavDuration } from '../voicevox/index'
import { fetchImage } from '../image/index'
import { logger } from '../../utils/logger'

const FPS = 30
// 全体尺予算 (59.5秒以内)
const MAX_DURATION_FRAMES = Math.floor(59.5 * FPS)  // 1785
const INTRO_FRAMES = 90   // 3秒
const CTA_FRAMES = 75     // 2.5秒
const AVAILABLE_RANK_FRAMES = MAX_DURATION_FRAMES - INTRO_FRAMES - CTA_FRAMES  // 1620

function toRelPath(absPath: string, jobDir: string): string {
  const rel = path.relative(path.resolve(jobDir, '..', '..', '..'), absPath)
  return rel.split(path.sep).join('/')
}

export async function buildV3Plan(
  script: Script,
  jobDir: string,
): Promise<VideoV3Config> {
  const { url, speaker, gain } = getVoicevoxConfig()
  const apiKey = getPexelsApiKey()

  const itemCount = script.items.length
  // 1ランクあたりのフレーム数 (budget-driven, audio length ignored for scene duration)
  const framesPerRank = Math.floor(AVAILABLE_RANK_FRAMES / itemCount)

  logger.info(`Budget: ${framesPerRank}f/rank (${(framesPerRank / FPS).toFixed(1)}s) × ${itemCount}`)

  // 全シーンを並列処理
  const scenes: V3Scene[] = await Promise.all(
    script.items.map(async (item, i): Promise<V3Scene> => {
      const wavFile = `audio_${String(i).padStart(2, '0')}.wav`
      const wavAbsPath = path.join(jobDir, wavFile)
      const imgAFile = `img_${String(i).padStart(2, '0')}_a.jpg`
      const imgBFile = `img_${String(i).padStart(2, '0')}_b.jpg`

      logger.info(`[rank${item.rank}] VOICEVOX合成中: "${item.body.slice(0, 20)}..."`)

      const [wavBuffer, imgAResult, imgBResult] = await Promise.all([
        synthesize(item.body, url, speaker, gain),
        fetchImage(item.imageKeywordsEn, apiKey, jobDir, imgAFile),
        fetchImage(item.imageKeywordsEn.slice().reverse(), apiKey, jobDir, imgBFile),
      ])

      fs.writeFileSync(wavAbsPath, wavBuffer)
      const audioDurationSec = parseWavDuration(wavBuffer)

      if (imgAResult.fallbackUsed) logger.warn(`  → rank${item.rank} assetA: fallback使用`)
      if (imgBResult.fallbackUsed) logger.warn(`  → rank${item.rank} assetB: fallback使用`)
      logger.info(`  → rank${item.rank}: audio=${audioDurationSec.toFixed(2)}s, budget=${framesPerRank}f`)

      const topicLines: string[] = item.topic.length > 10
        ? [item.topic.slice(0, Math.ceil(item.topic.length / 2)), item.topic.slice(Math.ceil(item.topic.length / 2))]
        : [item.topic]

      return {
        rank: item.rank,
        durationFrames: framesPerRank,  // 固定予算 (音声長ではなく)
        audioSrc: toRelPath(wavAbsPath, jobDir),
        phase1: {
          headlineLines: topicLines,
          asset: {
            src: toRelPath(imgAResult.imagePath, jobDir),
            fallbackLabel: `rank${item.rank}_a`,
          },
        },
        phase2: {
          topComment: item.comment1,
          bottomComment: item.comment2,
          asset: {
            src: toRelPath(imgBResult.imagePath, jobDir),
            fallbackLabel: `rank${item.rank}_b`,
          },
        },
      }
    })
  )

  // intro行をスペース区切りで分割 (最大4行)
  const introWords = script.videoTitle.split(/[\s\n]/).filter(Boolean)
  const introLines = introWords.slice(0, 4).map((text, i) => {
    const styles = ['introBlack', 'introRed', 'introBlack', 'introYellow'] as const
    return { text, style: styles[i % styles.length] }
  })

  const config: VideoV3Config = {
    meta: {
      width: 1080,
      height: 1920,
      fps: FPS,
      introFrames: INTRO_FRAMES,
      sceneFrames: framesPerRank,
      outroFrames: CTA_FRAMES,
    },
    theme: {
      background: {
        type: 'sunburst',
        colorA: '#FB9B18',
        colorB: '#FED04B',
        centerX: 0.5,
        centerY: 0.51,
        burstCount: 40,
      },
      rankText: {
        fontFamily: 'Noto Sans JP',
        fontWeight: 900,
        fontSize: 120,
        fill: '#FFFFFF',
        stroke: '#111111',
        strokeWidth: 8,
        shadowColor: 'rgba(0,0,0,0.45)',
        shadowBlur: 14,
      },
      phase1Caption: {
        fontFamily: 'Noto Sans JP',
        fontWeight: 900,
        fontSize: 80,
        fill: '#D6332C',
        stroke: '#FFFFFF',
        strokeWidth: 10,
        shadowColor: 'rgba(0,0,0,0.8)',
        shadowBlur: 20,
      },
      topBox: {
        fill: '#F5F6EF',
        borderColor: '#233CFF',
        borderWidth: 6,
        textColor: '#111111',
        fontSize: 46,
        fontWeight: 900,
        textAlign: 'left',
        paddingH: 20,
        paddingV: 16,
        x: 180,
        y: 480,
        w: 720,
      },
      bottomBox: {
        fill: '#F5F6EF',
        borderColor: '#FA4A3A',
        borderWidth: 6,
        textColor: '#111111',
        fontSize: 46,
        fontWeight: 900,
        textAlign: 'left',
        paddingH: 20,
        paddingV: 16,
        x: 180,
        y: 680,
        w: 720,
      },
    },
    intro: { lines: introLines },
    scenes,
    outro: { lines: script.outro.split(/[\s\n]/).filter(Boolean) },
  }

  return config
}
