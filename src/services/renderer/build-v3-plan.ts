// build-v3-plan.ts — Script → VideoV3Config (VOICEVOX + Pexels)
import fs from 'fs'
import path from 'path'
import type { Script } from '../../schema/script'
import type { VideoV3Config, V3Scene } from '../../remotion/types/video-v3'
import { getVoicevoxConfig, getPexelsApiKey } from '../../utils/config'
import { synthesize, parseWavDuration } from '../voicevox/index'
import { fetchImage } from '../image/index'
import { logger } from '../../utils/logger'

const FPS = 30
// 音声尺 + 余白フレーム (0.5秒) でシーン長を決める。最低131f (Phase2 hold開始以降)
const AUDIO_PAD_FRAMES = 15  // 0.5秒
const MIN_SCENE_FRAMES = 143 // DEFINITIVE_v3 最小値

function toRelPath(absPath: string, jobDir: string): string {
  // publicDir = プロジェクトルート想定。jobDir から relative を計算
  const rel = path.relative(path.resolve(jobDir, '..', '..', '..'), absPath)
  return rel.split(path.sep).join('/')
}

export async function buildV3Plan(
  script: Script,
  jobDir: string,
): Promise<VideoV3Config> {
  const { url, speaker, gain } = getVoicevoxConfig()
  const apiKey = getPexelsApiKey()

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
      const durationFrames = Math.max(
        Math.ceil(audioDurationSec * FPS) + AUDIO_PAD_FRAMES,
        MIN_SCENE_FRAMES,
      )

      if (imgAResult.fallbackUsed) logger.warn(`  → rank${item.rank} assetA: fallback使用`)
      if (imgBResult.fallbackUsed) logger.warn(`  → rank${item.rank} assetB: fallback使用`)
      logger.info(`  → rank${item.rank}: ${audioDurationSec.toFixed(2)}s → ${durationFrames}f`)

      return {
        rank: item.rank,
        durationFrames,
        audioSrc: toRelPath(wavAbsPath, jobDir),
        phase1: {
          headlineLines: item.topic.length > 10
            ? [item.topic.slice(0, Math.ceil(item.topic.length / 2)), item.topic.slice(Math.ceil(item.topic.length / 2))]
            : [item.topic],
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

  // intro行を分割 (4行まで)
  const introLines = script.videoTitle.split(/[\s\n]/).filter(Boolean).map((text, i) => {
    const styles = ['introBlack', 'introRed', 'introBlack', 'introYellow'] as const
    return { text, style: styles[i % styles.length] }
  })

  const config: VideoV3Config = {
    meta: {
      width: 1080,
      height: 1920,
      fps: FPS,
      introFrames: 102,
      sceneFrames: 162,
      outroFrames: 63,
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
        fontSize: 52,
        fontWeight: 900,
        textAlign: 'left',
        paddingH: 22,
        paddingV: 18,
        x: 28,
        y: 376,
        w: 992,
      },
      bottomBox: {
        fill: '#F5F6EF',
        borderColor: '#FA4A3A',
        borderWidth: 6,
        textColor: '#111111',
        fontSize: 52,
        fontWeight: 900,
        textAlign: 'left',
        paddingH: 22,
        paddingV: 18,
        x: 54,
        y: 570,
        w: 936,
      },
    },
    intro: { lines: introLines },
    scenes,
    outro: { lines: script.outro.split(/[\s\n]/).filter(Boolean) },
  }

  return config
}
