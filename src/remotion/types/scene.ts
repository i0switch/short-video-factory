// Scene-level types

export type SceneType = 'opening' | 'ranking' | 'ending'

export interface SceneConfig {
  type: SceneType
  startFrame: number
  durationFrames: number
}

export interface TimelineEntry {
  type: SceneType
  startFrame: number
  durationFrames: number
  rankIndex?: number  // ranking シーンのみ
}
