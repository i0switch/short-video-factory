import { describe, it, expect } from 'vitest'
import { buildTimeline } from '../../../src/services/template-engine/timeline-builder'
import type { Beat } from '../../../src/schema/template-engine'

function makeBeat(overrides: Partial<Beat> & { beat_id: string }): Beat {
  return {
    role: 'development',
    text: 'テスト',
    speaker: 'narrator',
    emotion: 'neutral',
    shot_template: 'narration_plain',
    cue_templates: ['caption_in_fast'],
    asset_needs: ['室内背景'],
    estimated_duration_frames: 60,
    ...overrides,
  }
}

describe('buildTimeline', () => {
  it('produces entries with correct frame ranges', () => {
    const beats: Beat[] = [
      makeBeat({ beat_id: 'b1', estimated_duration_frames: 60 }),
      makeBeat({ beat_id: 'b2', estimated_duration_frames: 90 }),
      makeBeat({ beat_id: 'b3', estimated_duration_frames: 45 }),
    ]
    const timeline = buildTimeline(beats, 30)

    expect(timeline.entries).toHaveLength(3)
    expect(timeline.entries[0].startFrame).toBe(0)
    expect(timeline.entries[0].endFrame).toBe(60)
    expect(timeline.entries[1].startFrame).toBe(60)
    expect(timeline.entries[1].endFrame).toBe(150)
    expect(timeline.entries[2].startFrame).toBe(150)
    expect(timeline.entries[2].endFrame).toBe(195)
    expect(timeline.totalFrames).toBe(195)
  })

  it('applies shot template from beat', () => {
    const beats: Beat[] = [
      makeBeat({ beat_id: 'b1', shot_template: 'punchline_freeze' }),
    ]
    const timeline = buildTimeline(beats, 30)
    expect(timeline.entries[0].shot.id).toBe('punchline_freeze')
    expect(timeline.entries[0].shot.background.type).toBe('effect')
  })

  it('creates cue instances from cue_templates', () => {
    const beats: Beat[] = [
      makeBeat({
        beat_id: 'b1',
        cue_templates: ['caption_in_fast', 'shake_impact', 'manga_symbol_pop'],
      }),
    ]
    const timeline = buildTimeline(beats, 30)
    const cues = timeline.entries[0].cues
    expect(cues).toHaveLength(3)
    expect(cues[0].id).toBe('caption_in_fast')
    expect(cues[1].id).toBe('shake_impact')
    expect(cues[2].id).toBe('manga_symbol_pop')
  })

  it('offsets cues to beat start frame', () => {
    const beats: Beat[] = [
      makeBeat({ beat_id: 'b1', estimated_duration_frames: 60 }),
      makeBeat({
        beat_id: 'b2',
        estimated_duration_frames: 60,
        cue_templates: ['caption_in_fast'],
      }),
    ]
    const timeline = buildTimeline(beats, 30)
    // b2 starts at frame 60
    expect(timeline.entries[1].cues[0].startFrame).toBe(60)
  })

  it('handles empty cue_templates', () => {
    const beats: Beat[] = [
      makeBeat({ beat_id: 'b1', cue_templates: [] }),
    ]
    const timeline = buildTimeline(beats, 30)
    expect(timeline.entries[0].cues).toHaveLength(0)
  })

  it('returns totalFrames as sum of all durations', () => {
    const beats: Beat[] = [
      makeBeat({ beat_id: 'b1', estimated_duration_frames: 30 }),
      makeBeat({ beat_id: 'b2', estimated_duration_frames: 30 }),
    ]
    const timeline = buildTimeline(beats, 30)
    expect(timeline.totalFrames).toBe(60)
  })
})
