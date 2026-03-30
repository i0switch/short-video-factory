// TwoChTimelineController — 2ch風動画のタイムライン構築

import type { TwoChVideoConfig } from '../../types/video-2ch'
import { isEpisodeTitle } from '../../types/video-2ch'

export interface TwoChTimelineEntry {
  type: 'scene' | 'episode_title' | 'outro'
  startFrame: number
  durationFrames: number
  sceneIndex?: number // index in config.scenes for scene type
}

export function buildTwoChTimeline(
  config: TwoChVideoConfig,
): TwoChTimelineEntry[] {
  const entries: TwoChTimelineEntry[] = []
  let currentFrame = 0

  config.scenes.forEach((scene, index) => {
    if (isEpisodeTitle(scene)) {
      entries.push({
        type: 'episode_title',
        startFrame: currentFrame,
        durationFrames: scene.durationFrames,
        sceneIndex: index,
      })
    } else {
      entries.push({
        type: 'scene',
        startFrame: currentFrame,
        durationFrames: scene.durationFrames,
        sceneIndex: index,
      })
    }
    currentFrame += scene.durationFrames
  })

  // Outro
  entries.push({
    type: 'outro',
    startFrame: currentFrame,
    durationFrames: config.outro.durationFrames,
  })

  return entries
}

export function getTwoChTotalFrames(config: TwoChVideoConfig): number {
  const scenesTotal = config.scenes.reduce(
    (sum, s) => sum + s.durationFrames,
    0,
  )
  return scenesTotal + config.outro.durationFrames
}
