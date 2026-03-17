// TimelineController — DEFINITIVE_v3 スキーマ対応
import type { VideoV3Config } from '../../types/video-v3'

export type V3SceneType = 'opening' | 'ranking' | 'ending'

export interface V3TimelineEntry {
  type: V3SceneType
  startFrame: number
  durationFrames: number
  rankIndex?: number
}

export function buildTimeline(config: VideoV3Config): V3TimelineEntry[] {
  const entries: V3TimelineEntry[] = []
  let cursor = 0

  // Opening
  entries.push({
    type: 'opening',
    startFrame: cursor,
    durationFrames: config.meta.introFrames,
  })
  cursor += config.meta.introFrames

  // Rankings — 各シーン固有 durationFrames or meta.sceneFrames
  config.scenes.forEach((scene, i) => {
    const dur = scene.durationFrames ?? config.meta.sceneFrames
    entries.push({
      type: 'ranking',
      startFrame: cursor,
      durationFrames: dur,
      rankIndex: i,
    })
    cursor += dur
  })

  // Ending
  entries.push({
    type: 'ending',
    startFrame: cursor,
    durationFrames: config.meta.outroFrames,
  })

  return entries
}

export function getTotalFrames(config: VideoV3Config): number {
  return buildTimeline(config).reduce((sum, e) => sum + e.durationFrames, 0)
}
