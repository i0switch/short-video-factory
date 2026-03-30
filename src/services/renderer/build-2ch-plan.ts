// build-2ch-plan.ts — TwoChScript → TwoChVideoConfig (budget-driven timing)
import fs from 'fs'
import path from 'path'
import type { TwoChScript, TwoChScene, TwoChEmotion } from '../../schema/twoch-script'
import type {
  TwoChVideoConfig,
  TwoChSceneConfig,
  TwoChEpisodeTitleConfig,
} from '../../remotion/types/video-2ch'
import { getVoicevoxConfig, getPexelsApiKey } from '../../utils/config'
import { synthesize, parseWavDuration } from '../voicevox/index'
import { fetchImage } from '../image/index'
import { logger } from '../../utils/logger'
import { wrapJapaneseToStringAsync } from '../../utils/text-wrap'
import { resolveAllLayouts, validateLayouts } from './v4-layout-resolver'
import { inferEffect } from './effect-inference'
import { inferProps } from './prop-inference'
import type { PropSuggestion } from './prop-inference'
import type { PropConfig } from '../../remotion/types/video-2ch'

const DEFAULT_WIDTH = 1080
const DEFAULT_HEIGHT = 1920
const DEFAULT_FPS = 60
const DEFAULT_MAX_DURATION_SEC = 59.5
const DEFAULT_CTA_FRAMES = 150          // 2.5s @ 60fps
const DEFAULT_EPISODE_TITLE_FRAMES = 90 // 1.5s @ 60fps
const DEFAULT_MIN_SCENE_FRAMES = 90     // 1.5s minimum per scene
const DEFAULT_MAX_SCENE_FRAMES = 180    // 3s maximum per scene

/** Emotion → imageKeywords augmentation */
const EMOTION_KEYWORD_MAP: Partial<Record<TwoChEmotion, string>> = {
  anger: '怒り',
  confusion: '困る',
  happy: '喜ぶ',
  sad: '泣く',
  shock: '驚き',
}

/** Speaker → caption color (参考動画準拠)
 * narrator: ライトブルー（地の文）
 * character1: 白（メイン話者/主人公）
 * character2: 赤系（ツッコミ/リアクション）
 */
function getSpeakerColor(speaker: string): string {
  switch (speaker) {
    case 'narrator':   return '#4FC3F7'  // ライトブルー
    case 'character1': return '#FFFFFF'   // 白（主人公）
    case 'character2': return '#FF6B6B'   // 赤系（ツッコミ）
    default:           return '#FFFFFF'
  }
}

function toRelPath(absPath: string, jobDir: string): string {
  const rel = path.relative(path.resolve(jobDir, '..', '..', '..'), absPath)
  return rel.split(path.sep).join('/')
}

export async function build2chPlan(
  script: TwoChScript,
  jobDir: string,
): Promise<TwoChVideoConfig> {
  const fps = script.meta?.fps ?? DEFAULT_FPS
  const width = script.meta?.width ?? DEFAULT_WIDTH
  const height = script.meta?.height ?? DEFAULT_HEIGHT
  const maxDurationFrames = script.meta?.maxDurationFrames
    ?? (script.meta?.maxDurationSec
      ? Math.floor(script.meta.maxDurationSec * fps)
      : Math.floor(DEFAULT_MAX_DURATION_SEC * fps))
  const episodeTitleFrames = script.meta?.episodeTitleFrames ?? DEFAULT_EPISODE_TITLE_FRAMES
  const minSceneFrames = script.meta?.minSceneFrames ?? DEFAULT_MIN_SCENE_FRAMES
  const maxSceneFrames = script.meta?.maxSceneFrames ?? DEFAULT_MAX_SCENE_FRAMES

  const outroFrames = script.meta?.outroFrames
    ?? (script.outro && script.outro.trim() ? DEFAULT_CTA_FRAMES : 0)

  // Backward-compatible default: multi-episode scripts show title cards unless explicitly disabled.
  const showEpisodeTitleCards = script.showEpisodeTitleCards ?? (script.episodes.length > 1)

  const { url, speaker, gain } = getVoicevoxConfig()
  const apiKey = getPexelsApiKey()

  // Speaker IDs
  const speakerNarrator = speaker // ずんだもん (default)
  const speakerMale = parseInt(process.env.VOICEVOX_SPEAKER_MALE ?? '13', 10)   // 青山龍星
  const speakerFemale = parseInt(process.env.VOICEVOX_SPEAKER_FEMALE ?? '0', 10) // 四国めたん

  function getSpeakerId(speakerName: string): number {
    switch (speakerName) {
      case 'narrator':   return speakerNarrator
      case 'character1': return speakerMale
      case 'character2': return speakerFemale
      default:           return speakerNarrator
    }
  }

  // Count total scenes and episode title cards
  const allScenes: { scene: TwoChScene; episodeIdx: number }[] = []
  for (let ei = 0; ei < script.episodes.length; ei++) {
    for (const scene of script.episodes[ei].scenes) {
      allScenes.push({ scene, episodeIdx: ei })
    }
  }
  const totalScenes = allScenes.length
  const episodeTitleCount = showEpisodeTitleCards && script.episodes.length > 1
    ? script.episodes.length
    : 0

  // Frame budget
  const titleCardFrames = episodeTitleCount * episodeTitleFrames
  const availableSceneFrames = maxDurationFrames - outroFrames - titleCardFrames

  if (availableSceneFrames <= 0) {
    throw new Error(
      `2ch plan budget invalid: availableSceneFrames=${availableSceneFrames} (max=${maxDurationFrames}f, outro=${outroFrames}f, episodeTitles=${titleCardFrames}f)`
    )
  }

  logger.info(`2ch plan: ${totalScenes} scenes, ${episodeTitleCount} episode titles`)
  logger.info(`Budget: ${availableSceneFrames}f available for scenes (${(availableSceneFrames / fps).toFixed(1)}s)`)
  logger.info(`Speakers: narrator=${speakerNarrator}, male=${speakerMale}, female=${speakerFemale}`)

  // Image cache (keyed by Japanese keywords)
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

  // synthFit: re-synthesize faster if audio exceeds budget
  async function synthFit(
    text: string,
    spk: number,
    budgetF: number,
    label: string,
  ): Promise<Buffer> {
    const budgetSec = budgetF / fps
    let buf = await synthesize(text, url, spk, gain, 1.0)
    const dur = parseWavDuration(buf)
    if (dur > budgetSec - 0.15) {
      const speed = Math.min(dur / (budgetSec - 0.15), 2.0)
      logger.info(`  → ${label}: ${dur.toFixed(2)}s > ${budgetSec.toFixed(2)}s → resynth x${speed.toFixed(2)}`)
      buf = await synthesize(text, url, spk, gain, speed)
    }
    return buf
  }

  // Step 1: Synthesize all TTS in parallel to measure durations
  logger.info('[phase1] TTS合成 + 尺計測')
  const ttsResults = await Promise.all(
    allScenes.map(async ({ scene, episodeIdx }, i) => {
      const ttsText = scene.narration ?? scene.text
      const spk = getSpeakerId(scene.speaker)
      const label = `ep${episodeIdx}_scene${i}`
      // First pass: synthesize at normal speed to measure duration
      const buf = await synthesize(ttsText, url, spk, gain, 1.0)
      const dur = parseWavDuration(buf)
      return { buf, dur, scene, episodeIdx, idx: i }
    }),
  )

  // Step 2: Distribute frames proportionally to TTS duration
  const totalTtsDuration = ttsResults.reduce((sum, r) => sum + r.dur, 0)
  logger.info(`Total TTS duration: ${totalTtsDuration.toFixed(2)}s`)

  const fixedFrames = ttsResults.map((r) => r.scene.durationFrames ?? null)
  const fixedTotal = fixedFrames.reduce<number>((sum, f) => sum + (f ?? 0), 0)
  const remainingFrames = availableSceneFrames - fixedTotal

  if (remainingFrames < 0) {
    throw new Error(
      `2ch plan budget exceeded: fixed scene durations total ${fixedTotal}f > available ${availableSceneFrames}f (excess ${-remainingFrames}f). ` +
      `Fix by reducing durationFrames or increasing meta.maxDurationFrames.`
    )
  }

  const flexIndices = fixedFrames
    .map((f, idx) => (f === null ? idx : -1))
    .filter((idx) => idx >= 0)

  const frameAllocations: number[] = new Array(ttsResults.length).fill(0)

  // Fill fixed allocations first
  for (let i = 0; i < fixedFrames.length; i++) {
    if (fixedFrames[i] !== null) frameAllocations[i] = fixedFrames[i] as number
  }

  if (flexIndices.length > 0) {
    // Allocate remaining frames proportionally among flexible scenes
    const flexDurTotal = flexIndices.reduce((sum, idx) => sum + ttsResults[idx].dur, 0)
    for (const idx of flexIndices) {
      const proportion = flexDurTotal > 0 ? (ttsResults[idx].dur / flexDurTotal) : (1 / flexIndices.length)
      const raw = Math.round(proportion * remainingFrames)
      frameAllocations[idx] = Math.max(minSceneFrames, Math.min(maxSceneFrames, raw))
    }

    // Adjust to exactly hit remainingFrames (within min/max bounds)
    const sumFlex = flexIndices.reduce((sum, idx) => sum + frameAllocations[idx], 0)
    let delta = remainingFrames - sumFlex

    // Sort by current length (longer scenes absorb reductions first; shorter absorb additions first)
    const sortedForReduce = [...flexIndices].sort((a, b) => frameAllocations[b] - frameAllocations[a])
    const sortedForAdd = [...flexIndices].sort((a, b) => frameAllocations[a] - frameAllocations[b])

    while (delta !== 0) {
      let moved = false
      if (delta > 0) {
        for (const idx of sortedForAdd) {
          if (frameAllocations[idx] < maxSceneFrames) {
            frameAllocations[idx] += 1
            delta -= 1
            moved = true
            if (delta === 0) break
          }
        }
      } else {
        for (const idx of sortedForReduce) {
          if (frameAllocations[idx] > minSceneFrames) {
            frameAllocations[idx] -= 1
            delta += 1
            moved = true
            if (delta === 0) break
          }
        }
      }
      if (!moved) break
    }

    if (delta !== 0) {
      logger.warn(`Frame allocation could not perfectly match budget (delta=${delta}f). Consider adjusting min/max scene frames or fixed durations.`)
    }
  } else {
    if (remainingFrames !== 0) {
      logger.warn(`All scene durations are fixed but do not fill budget: remaining=${remainingFrames}f. Output will be shorter than maxDurationFrames.`)
    }
  }

  // Adjust to fit budget: scale down if over, scale up if under
  const totalAllocated = frameAllocations.reduce((a, b) => a + b, 0)
  logger.info(`Allocated ${totalAllocated}f across ${totalScenes} scenes (budget: ${availableSceneFrames}f, fixed: ${fixedTotal}f)`)

  // Step 2.5: v4 layout resolution
  logger.info('[phase1.5] v4 layout resolution')
  const sceneInputs = allScenes.map(({ scene }) => ({
    speaker: scene.speaker,
    emotion: scene.emotion,
    effect: scene.effect,
    text: scene.text,
  }))
  const { layouts: v4Layouts, log: v4Log } = resolveAllLayouts(sceneInputs)

  // Validate layouts
  const validation = validateLayouts(v4Log)
  if (!validation.passed) {
    for (const f of validation.failures) {
      logger.warn(`v4 validation: ${f}`)
    }
  }

  // Write layout resolution log
  const logPath = path.join(jobDir, 'layout_resolution_log.json')
  fs.writeFileSync(logPath, JSON.stringify(v4Log, null, 2))
  logger.info(`Layout resolution log: ${v4Log.length} entries, ${new Set(v4Log.map((e) => e.selectedLayoutId)).size} unique layouts`)

  // Concurrency limiter to avoid irasutoya rate-limiting (503)
  async function mapWithConcurrency<T, R>(
    items: T[],
    concurrency: number,
    fn: (item: T, index: number) => Promise<R>,
  ): Promise<R[]> {
    const results: R[] = new Array(items.length)
    let nextIdx = 0
    async function worker() {
      while (nextIdx < items.length) {
        const idx = nextIdx++
        results[idx] = await fn(items[idx], idx)
      }
    }
    await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()))
    return results
  }

  // Step 3: Build scene configs with synthFit + image fetch (max 5 concurrent)
  logger.info('[phase2] 音声調整 + 画像取得')
  const sceneConfigs: TwoChSceneConfig[] = await mapWithConcurrency(
    ttsResults, 5,
    async (r, i): Promise<TwoChSceneConfig> => {
      const { scene, episodeIdx } = r
      const prefix = `audio_2ch_${String(i).padStart(2, '0')}`
      const imgFile = `img_2ch_${String(i).padStart(2, '0')}.jpg`
      const budgetF = frameAllocations[i]
      const spk = getSpeakerId(scene.speaker)
      const label = `ep${episodeIdx}_s${i}`
      const ttsText = scene.narration ?? scene.text

      // Augment image keywords with emotion
      const emotionKeyword = EMOTION_KEYWORD_MAP[scene.emotion]
      const augmentedKeywordsJa = emotionKeyword
        ? [...scene.imageKeywords, emotionKeyword]
        : [...scene.imageKeywords]

      // Prop inference: auto-detect or use script-specified propKeywords
      const propSuggestions: PropSuggestion[] = scene.propKeywords
        ? scene.propKeywords.map((kws, pi) => ({
            keywordsJa: kws,
            keywordsEn: [],  // 手動指定時はいらすとや(ja)で検索
            position: (pi === 0 ? 'top-right' : 'top-left') as 'top-right' | 'top-left',
          }))
        : inferProps(scene.text, scene.imageKeywords, scene.speaker)

      // Parallel: synthFit audio + image fetch
      const [audioBuf, imgResult] = await Promise.all([
        synthFit(ttsText, spk, budgetF, label).catch((e) => {
          logger.warn(`  → ${label}: speaker(${spk}) failed, fallback to narrator: ${e}`)
          return synthFit(ttsText, speakerNarrator, budgetF, `${label}_fallback`)
        }),
        getCachedImage(scene.imageKeywordsEn, apiKey, jobDir, imgFile, augmentedKeywordsJa),
      ])

      // Sequential prop fetch (avoid irasutoya rate-limiting)
      const resolvedProps: PropConfig[] = []
      for (let pi = 0; pi < propSuggestions.length; pi++) {
        const prop = propSuggestions[pi]
        const propFile = `prop_2ch_${String(i).padStart(2, '0')}_${pi}.jpg`
        try {
          const propResult = await getCachedImage(
            prop.keywordsEn.length > 0 ? prop.keywordsEn : prop.keywordsJa,
            apiKey, jobDir, propFile, prop.keywordsJa,
          )
          if (!propResult.fallbackUsed) {
            resolvedProps.push({
              imageSrc: toRelPath(propResult.imagePath, jobDir),
              position: prop.position,
              scale: 0.7,
            })
            logger.info(`  → ${label}: prop[${pi}] fetched (${prop.keywordsJa.join(',')})`)
          }
        } catch (e) {
          logger.warn(`  → ${label}: prop[${pi}] fetch failed, skipping: ${e}`)
        }
      }

      const wavPath = path.join(jobDir, `${prefix}.wav`)
      fs.writeFileSync(wavPath, audioBuf)

      if (imgResult.fallbackUsed) logger.warn(`  → ${label}: fallback image used`)
      logger.info(`  → ${label}: ${(parseWavDuration(audioBuf)).toFixed(2)}s / ${budgetF}f (${(budgetF / fps).toFixed(2)}s)`)

      // v4 layout for this scene
      const v4 = v4Layouts[i]

      // Use custom character/background from script if specified, otherwise use fetched image
      const finalImageSrc = scene.characterSrc
        ? scene.characterSrc
        : toRelPath(imgResult.imagePath, jobDir)
      const finalBackgroundSrc = scene.backgroundSrc || undefined

      return {
        durationFrames: budgetF,
        speaker: scene.speaker,
        speakerColor: getSpeakerColor(scene.speaker),
        text: await wrapJapaneseToStringAsync(scene.text, 9, 3),
        emotion: scene.emotion,
        effect: inferEffect(scene.text, scene.emotion, scene.effect),
        audioSrc: toRelPath(wavPath, jobDir),
        imageSrc: finalImageSrc,
        backgroundImageSrc: finalBackgroundSrc,
        props: resolvedProps.length > 0 ? resolvedProps : undefined,
        fallbackUsed: scene.characterSrc ? false : imgResult.fallbackUsed,
        captionColor: script.captionColor,
        captionFadeInFrames: script.captionFadeInFrames,
        v4: {
          beatRole: v4.beatRole,
          shotTemplateId: v4.shotTemplateId,
          layoutVariantId: v4.layoutVariantId,
          cameraPresetId: v4.cameraPresetId,
          captionPresetId: v4.captionPresetId,
          characterSlots: scene.characterSrc ? [] : v4.layout.characters,
          camera: v4.camera,
          caption: v4.caption,
          captionZone: v4.layout.captionZone,
        },
      }
    },
  )

  // Step 4: Interleave episode title cards between episodes (if multi-episode)
  const finalScenes: (TwoChSceneConfig | TwoChEpisodeTitleConfig)[] = []
  let sceneIdx = 0

  for (let ei = 0; ei < script.episodes.length; ei++) {
    const episode = script.episodes[ei]

    // Insert episode title card (for multi-episode, before each episode)
    if (showEpisodeTitleCards && script.episodes.length > 1 && episode.title) {
      const titleCard: TwoChEpisodeTitleConfig = {
        type: 'episode_title',
        durationFrames: episodeTitleFrames,
        title: episode.title,
      }
      finalScenes.push(titleCard)
    }

    // Add scenes for this episode
    for (let si = 0; si < episode.scenes.length; si++) {
      finalScenes.push(sceneConfigs[sceneIdx])
      sceneIdx++
    }
  }

  // Step 5: Outro audio
  const outroText = script.outro?.trim() ?? ''
  const outroWavPath = path.join(jobDir, 'audio_2ch_outro.wav')
  let outroAudioRel: string | undefined = undefined
  if (outroText && outroFrames > 0) {
    logger.info(`[outro] VOICEVOX合成中: "${outroText}"`)
    const outroBuffer = await synthFit(outroText, speakerNarrator, outroFrames, 'outro')
    fs.writeFileSync(outroWavPath, outroBuffer)
    logger.info(`  → outro: ${parseWavDuration(outroBuffer).toFixed(2)}s`)
    outroAudioRel = toRelPath(outroWavPath, jobDir)
  }

  // Build final config
  const config: TwoChVideoConfig = {
    meta: {
      width,
      height,
      fps,
      audioSampleRate: script.meta?.audioSampleRate,
    },
    videoTitle: script.videoTitle,
    seriesTitle: script.seriesTitle,
    titleColor: script.titleColor,
    captionColor: script.captionColor,
    captionFadeInFrames: script.captionFadeInFrames,
    scenes: finalScenes,
    outro: {
      text: outroText,
      audioSrc: outroAudioRel,
      durationFrames: outroFrames,
    },
  }

  const totalFrames = finalScenes.reduce((sum, s) => sum + s.durationFrames, 0) + outroFrames
  logger.info(`Total: ${totalFrames}f (${(totalFrames / fps).toFixed(1)}s) / max ${maxDurationFrames}f (${(maxDurationFrames / fps).toFixed(1)}s)`)

  return config
}
