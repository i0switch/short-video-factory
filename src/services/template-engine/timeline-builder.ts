import type { Beat, TimelineJson, TimelineEntry } from '../../schema/template-engine'
import { getShotTemplate } from './templates/shot-templates'
import { getCueTemplate, resetCueCounter } from './templates/cue-templates'

/**
 * Build a timeline from beats by expanding shot/cue templates into concrete entries.
 */
export function buildTimeline(beats: Beat[], fps: number): TimelineJson {
  resetCueCounter()

  let frameOffset = 0
  const entries: TimelineEntry[] = []

  for (const beat of beats) {
    const startFrame = frameOffset
    const endFrame = startFrame + beat.estimated_duration_frames
    const shot = getShotTemplate(beat.shot_template)

    // Create cue instances offset to this beat's start
    const cues = beat.cue_templates.map((cueId) =>
      getCueTemplate(cueId, startFrame),
    )

    const entry: TimelineEntry = {
      beat_id: beat.beat_id,
      startFrame,
      endFrame,
      shot,
      cues,
    }

    entries.push(entry)
    frameOffset = endFrame
  }

  return {
    totalFrames: frameOffset,
    entries,
  }
}
