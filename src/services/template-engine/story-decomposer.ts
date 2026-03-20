import type { TwoChScript } from '../../schema/twoch-script'
import type { StoryUnit, Speaker } from '../../schema/template-engine'

const DEFAULT_SCENE_DURATION_SEC = 2.0

/**
 * Decompose a TwoChScript into a flat list of StoryUnits with frame ranges.
 */
export function decomposeStory(script: TwoChScript, fps: number): StoryUnit[] {
  const units: StoryUnit[] = []
  let counter = 0
  let currentFrame = 0

  for (const episode of script.episodes) {
    for (const scene of episode.scenes) {
      counter++
      const durationFrames = scene.durationFrames ?? Math.round(DEFAULT_SCENE_DURATION_SEC * fps)
      const startFrame = currentFrame
      const endFrame = currentFrame + durationFrames

      const speaker = parseSpeaker(scene.speaker)

      units.push({
        id: `s${counter}`,
        speaker,
        text: scene.text,
        narration: scene.narration,
        emotion: scene.emotion,
        startFrame,
        endFrame,
      })

      currentFrame = endFrame
    }
  }

  return units
}

function parseSpeaker(raw: string): Speaker {
  if (raw === 'narrator' || raw === 'character1' || raw === 'character2') {
    return raw
  }
  // Default unknown speakers to narrator
  return 'narrator'
}
