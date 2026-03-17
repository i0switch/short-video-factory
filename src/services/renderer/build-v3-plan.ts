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
const INTRO_FRAMES = 90   // 3秒 (イントロ音声込み)
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
  // 1ランクあたりのフレーム数 (budget-driven)
  const framesPerRank = Math.floor(AVAILABLE_RANK_FRAMES / itemCount)
  // 4ステップの各フレーム数
  const step1F = Math.round(framesPerRank * 0.15)
  const step2F = Math.round(framesPerRank * 0.43) - step1F
  const step3F = Math.round(framesPerRank * 0.71) - Math.round(framesPerRank * 0.43)
  const step4F = framesPerRank - Math.round(framesPerRank * 0.71)

  // 話者ID (spec v5: 3キャラ)
  const speakerZundamon = speaker           // ずんだもん (rank, topic, intro, CTA)
  const speakerMale = parseInt(process.env.VOICEVOX_SPEAKER_MALE ?? '8', 10)    // 青枠 (男性)
  const speakerFemale = parseInt(process.env.VOICEVOX_SPEAKER_FEMALE ?? '0', 10) // 赤枠 (女性)

  logger.info(`Budget: ${framesPerRank}f/rank (${(framesPerRank / FPS).toFixed(1)}s) × ${itemCount}`)
  logger.info(`Speakers: zundamon=${speakerZundamon}, male=${speakerMale}, female=${speakerFemale}`)

  // キーワードベース画像キャッシュ
  const imageCache = new Map<string, string>()

  async function getCachedImage(
    keywords: string[],
    apiKeyArg: string | null,
    dir: string,
    filename: string,
    keywordsJa?: string[],
  ): Promise<{ imagePath: string; fallbackUsed: boolean }> {
    const key = (keywordsJa ?? keywords).join('|')
    if (imageCache.has(key)) {
      const dest = path.join(dir, filename)
      fs.copyFileSync(imageCache.get(key)!, dest)
      logger.info(`  → cache hit: ${key}`)
      return { imagePath: dest, fallbackUsed: false }
    }
    const result = await fetchImage(keywords, apiKeyArg, dir, filename, keywordsJa)
    if (!result.fallbackUsed) imageCache.set(key, result.imagePath)
    return result
  }

  // per-step 音声をバジェット内に収める合成ヘルパー
  async function synthFit(
    text: string,
    spk: number,
    budgetF: number,
    label: string,
  ): Promise<Buffer> {
    const budgetSec = budgetF / FPS
    let buf = await synthesize(text, url, spk, gain, 1.0)
    const dur = parseWavDuration(buf)
    if (dur > budgetSec - 0.05) {
      const speed = Math.min(dur / (budgetSec - 0.05), 1.5)
      logger.info(`  → ${label}: ${dur.toFixed(2)}s > ${budgetSec.toFixed(2)}s → resynth x${speed.toFixed(2)}`)
      buf = await synthesize(text, url, spk, gain, speed)
    }
    return buf
  }

  // 全シーンを並列処理
  const scenes: V3Scene[] = await Promise.all(
    script.items.map(async (item, i): Promise<V3Scene> => {
      const prefix = `audio_${String(i).padStart(2, '0')}`
      const imgAFile = `img_${String(i).padStart(2, '0')}_a.jpg`

      logger.info(`[rank${item.rank}] per-step音声合成中`)

      // spec v5: 最大7文字以内で改行、文脈区切り優先、2行以内
      const topicLines: string[] = (() => {
        const t = item.topic
        if (t.length <= 7) return [t]
        const breakChars = /[、。！？てにはがをもでのより]/
        let breakIdx = -1
        for (let k = Math.min(7, t.length) - 1; k >= 3; k--) {
          if (breakChars.test(t[k])) { breakIdx = k + 1; break }
        }
        if (breakIdx < 0) breakIdx = Math.min(7, t.length)
        return [t.slice(0, breakIdx), t.slice(breakIdx, breakIdx + 7)].filter(Boolean).slice(0, 2)
      })()

      // 各ステップのテキスト
      const rankText = `第${item.rank}位`
      const topicText = topicLines.join('')
      const blueText = item.comment1
      const redText = item.comment2

      // 並列合成 (4ステップ + 画像取得)
      const [rankBuf, topicBuf, blueBuf, redBuf, imgAResult] = await Promise.all([
        synthFit(rankText,  speakerZundamon, step1F, `rank${item.rank}_rank`),
        synthFit(topicText, speakerZundamon, step2F, `rank${item.rank}_topic`),
        synthFit(blueText,  speakerMale,     step3F, `rank${item.rank}_blue`).catch(() =>
          synthFit(blueText, speakerZundamon, step3F, `rank${item.rank}_blue_fallback`)
        ),
        synthFit(redText,   speakerFemale,   step4F, `rank${item.rank}_red`).catch(() =>
          synthFit(redText, speakerZundamon, step4F, `rank${item.rank}_red_fallback`)
        ),
        getCachedImage(item.imageKeywordsEn, apiKey, jobDir, imgAFile, item.imageKeywords),
      ])

      const rankWavPath  = path.join(jobDir, `${prefix}_rank.wav`)
      const topicWavPath = path.join(jobDir, `${prefix}_topic.wav`)
      const blueWavPath  = path.join(jobDir, `${prefix}_blue.wav`)
      const redWavPath   = path.join(jobDir, `${prefix}_red.wav`)

      fs.writeFileSync(rankWavPath,  rankBuf)
      fs.writeFileSync(topicWavPath, topicBuf)
      fs.writeFileSync(blueWavPath,  blueBuf)
      fs.writeFileSync(redWavPath,   redBuf)

      if (imgAResult.fallbackUsed) logger.warn(`  → rank${item.rank} asset: fallback使用`)
      logger.info(`  → rank${item.rank}: step audio ok`)

      return {
        rank: item.rank,
        durationFrames: framesPerRank,
        rankAudioSrc:  toRelPath(rankWavPath,  jobDir),
        topicAudioSrc: toRelPath(topicWavPath, jobDir),
        blueAudioSrc:  toRelPath(blueWavPath,  jobDir),
        redAudioSrc:   toRelPath(redWavPath,   jobDir),
        phase1: {
          headlineLines: topicLines,
          asset: {
            src: toRelPath(imgAResult.imagePath, jobDir),
            fallbackLabel: `rank${item.rank}`,
          },
        },
        phase2: {
          topComment: item.comment1,
          bottomComment: item.comment2,
          asset: {
            src: toRelPath(imgAResult.imagePath, jobDir),
            fallbackLabel: `rank${item.rank}`,
          },
        },
      }
    })
  )

  // イントロ音声を合成 (intro テキスト読み上げで冒頭無音を解消)
  const introWavFile = 'audio_intro.wav'
  const introWavAbsPath = path.join(jobDir, introWavFile)
  logger.info(`[intro] VOICEVOX合成中: "${script.intro}"`)
  const introWavBuffer = await synthesize(script.intro, url, speaker, gain, 1.0)
  fs.writeFileSync(introWavAbsPath, introWavBuffer)
  logger.info(`  → intro: audio=${parseWavDuration(introWavBuffer).toFixed(2)}s`)

  // アウトロ音声を合成 (CTA無音解消)
  const outroWavFile = 'audio_outro.wav'
  const outroWavAbsPath = path.join(jobDir, outroWavFile)
  logger.info(`[outro] VOICEVOX合成中: "${script.outro}"`)
  const outroWavBuffer = await synthesize(script.outro, url, speaker, gain, 1.0)
  fs.writeFileSync(outroWavAbsPath, outroWavBuffer)
  logger.info(`  → outro: audio=${parseWavDuration(outroWavBuffer).toFixed(2)}s`)

  // intro行: タイトルを7文字以下で分割 (最大4行, 強調行のみ赤)
  function splitTitleToLines(title: string, maxChars = 7, maxLines = 4): string[] {
    const lines: string[] = []
    let remaining = title.replace(/\s+/g, '')  // 空白除去
    while (remaining.length > 0 && lines.length < maxLines) {
      // 自然な区切り(て/に/は/が/の/で)を優先して7文字以内で切る
      const chunk = remaining.slice(0, maxChars)
      lines.push(chunk)
      remaining = remaining.slice(chunk.length)
    }
    return lines
  }
  const titleLines = splitTitleToLines(script.videoTitle)
  const styles = ['introBlack', 'introRed', 'introBlack', 'introBlack'] as const
  const introLines = titleLines.map((text, i) => ({ text, style: styles[i % styles.length] }))

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
        borderWidth: 8,
        textColor: '#111111',
        fontSize: 64,
        fontWeight: 900,
        textAlign: 'left',
        paddingH: 24,
        paddingV: 20,
        x: 20,
        y: 420,
        w: 1040,
      },
      bottomBox: {
        fill: '#F5F6EF',
        borderColor: '#FA4A3A',
        borderWidth: 8,
        textColor: '#111111',
        fontSize: 64,
        fontWeight: 900,
        textAlign: 'left',
        paddingH: 24,
        paddingV: 20,
        x: 20,
        y: 680,
        w: 1040,
      },
    },
    intro: { lines: introLines, audioSrc: toRelPath(introWavAbsPath, jobDir) },
    scenes,
    outro: { lines: script.outro.split(/[\s\n]/).filter(Boolean), audioSrc: toRelPath(outroWavAbsPath, jobDir) },
  }

  return config
}
