import type { TwoChScript } from '../../schema/twoch-script'
import type {
  StoryJson, BeatsJson, TimelineJson, AudioJson,
  ShotTemplateId, CueTemplateId,
} from '../../schema/template-engine'
import type { TwoChVideoConfig } from '../../remotion/types/video-2ch'
import { decomposeStory } from './story-decomposer'
import { planBeats } from './beat-planner'
import { buildTimeline } from './timeline-builder'
import { bridgeToTwoChConfig, type BeatMeta } from './config-bridge'
import { buildAudioPlan } from './audio-planner'
import { resolveAssets, buildAssetManifest, buildAssetRequests, type AssetRequest } from './asset-resolver'

export interface TemplateEngineInput {
  script: TwoChScript
  fps?: number
  jobDir?: string
  pexelsApiKey?: string | null
  skipAssets?: boolean
  skipTts?: boolean
}

export interface TemplateEngineOutput {
  storyJson: StoryJson
  beatsJson: BeatsJson
  timelineJson: TimelineJson
  audioJson: AudioJson
  assetManifest: object
  assetRequests: object
  templateManifest: object
  config: TwoChVideoConfig
}

/**
 * Run the full template engine pipeline:
 * story decomposition → beat planning → timeline → audio plan → asset resolve → config bridge
 */
export async function runTemplateEngine(input: TemplateEngineInput): Promise<TemplateEngineOutput> {
  const fps = input.fps ?? 30
  const script = input.script

  // 1. Decompose story into units
  const units = decomposeStory(script, fps)
  const storyJson: StoryJson = { units }

  // 2. Build effect map from script scenes
  const effectMap = new Map<string, string>()
  let sceneIdx = 0
  for (const episode of script.episodes) {
    for (const scene of episode.scenes) {
      sceneIdx++
      if (scene.effect && scene.effect !== 'none') {
        effectMap.set(`s${sceneIdx}`, scene.effect)
      }
    }
  }

  // 3. Plan beats
  const beats = planBeats(units, effectMap)
  const beatsJson: BeatsJson = { beats }

  // 4. Build timeline
  const timelineJson = buildTimeline(beats, fps)

  // 5. Resolve assets (if not skipped)
  let assetManifest: object = { assets: [] }
  let assetRequestsObj: object = { pending: [] }

  if (!input.skipAssets && input.jobDir) {
    // Build asset requests from beats + script scenes
    const assetRequests: AssetRequest[] = []
    let sIdx = 0
    for (const episode of script.episodes) {
      for (const scene of episode.scenes) {
        sIdx++
        const beat = beats[sIdx - 1]
        if (beat) {
          assetRequests.push({
            beat_id: beat.beat_id,
            asset_needs: beat.asset_needs,
            imageKeywords: scene.imageKeywords,
            imageKeywordsEn: scene.imageKeywordsEn,
          })
        }
      }
    }

    const { resolved, unresolved } = await resolveAssets(
      assetRequests,
      input.jobDir,
      input.pexelsApiKey ?? null,
    )
    assetManifest = buildAssetManifest(resolved)
    assetRequestsObj = buildAssetRequests(unresolved)
  }

  // 6. Build audio plan
  const beatAudioMetas = beats.map((beat, i) => {
    const unit = units[i]
    const effectName = effectMap.get(unit.id)
    return {
      beat_id: beat.beat_id,
      speaker: beat.speaker,
      narration: unit.narration ?? unit.text,
      startFrame: unit.startFrame,
      endFrame: unit.endFrame,
      effect: effectName,
    }
  })
  const audioJson = buildAudioPlan(beatAudioMetas, fps)

  // 7. Bridge to TwoChVideoConfig
  const beatMetas: BeatMeta[] = beats.map((beat, i) => {
    const unit = units[i]
    const effectName = effectMap.get(unit.id)
    return {
      beat_id: beat.beat_id,
      text: unit.text,
      speaker: beat.speaker,
      emotion: beat.emotion,
      narration: unit.narration,
      effect: effectName,
    }
  })

  const seriesTitle = script.seriesTitle ?? script.videoTitle
  const config = bridgeToTwoChConfig(timelineJson, script.videoTitle, seriesTitle, beatMetas, fps)

  // Apply script-level overrides to config
  if (script.outro !== undefined) {
    config.outro.text = script.outro
  }

  // 8. Build template manifest (summary of used templates)
  const shotCounts: Partial<Record<ShotTemplateId, number>> = {}
  const cueCounts: Partial<Record<CueTemplateId, number>> = {}
  for (const beat of beats) {
    shotCounts[beat.shot_template] = (shotCounts[beat.shot_template] ?? 0) + 1
    for (const cue of beat.cue_templates) {
      cueCounts[cue] = (cueCounts[cue] ?? 0) + 1
    }
  }
  const templateManifest = {
    shotTemplatesUsed: shotCounts,
    cueTemplatesUsed: cueCounts,
    totalBeats: beats.length,
    totalFrames: timelineJson.totalFrames,
    durationSec: +(timelineJson.totalFrames / fps).toFixed(2),
  }

  return {
    storyJson,
    beatsJson,
    timelineJson,
    audioJson,
    assetManifest,
    assetRequests: assetRequestsObj,
    templateManifest,
    config,
  }
}
