import { describe, it, expect } from 'vitest'
import { planBeats } from '../../../src/services/template-engine/beat-planner'
import type { StoryUnit } from '../../../src/schema/template-engine'

function makeUnit(overrides: Partial<StoryUnit> & { id: string }): StoryUnit {
  return {
    speaker: 'narrator',
    text: 'テスト',
    emotion: 'neutral',
    startFrame: 0,
    endFrame: 60,
    ...overrides,
  }
}

describe('planBeats', () => {
  it('assigns intro to the first unit', () => {
    const units: StoryUnit[] = [
      makeUnit({ id: 's1', startFrame: 0, endFrame: 60 }),
      makeUnit({ id: 's2', startFrame: 60, endFrame: 120 }),
      makeUnit({ id: 's3', startFrame: 120, endFrame: 180 }),
    ]
    const beats = planBeats(units)
    expect(beats[0].role).toBe('intro')
    expect(beats[0].beat_id).toBe('b1')
    expect(beats[0].shot_template).toBe('intro_title')
  })

  it('assigns outro to the last unit when pos > 0.85', () => {
    const units: StoryUnit[] = Array.from({ length: 10 }, (_, i) =>
      makeUnit({ id: `s${i + 1}`, startFrame: i * 60, endFrame: (i + 1) * 60 }),
    )
    const beats = planBeats(units)
    expect(beats[9].role).toBe('outro')
  })

  it('assigns situation to early units (pos < 0.15)', () => {
    const units: StoryUnit[] = Array.from({ length: 10 }, (_, i) =>
      makeUnit({ id: `s${i + 1}`, startFrame: i * 60, endFrame: (i + 1) * 60 }),
    )
    const beats = planBeats(units)
    // index 1 → pos = 1/9 ≈ 0.11 → situation
    expect(beats[1].role).toBe('situation')
  })

  it('assigns climax when emotion shift >= 3', () => {
    const units: StoryUnit[] = [
      makeUnit({ id: 's1', emotion: 'neutral', startFrame: 0, endFrame: 60 }),
      makeUnit({ id: 's2', emotion: 'neutral', startFrame: 60, endFrame: 120 }),
      makeUnit({ id: 's3', emotion: 'neutral', startFrame: 120, endFrame: 180 }),
      makeUnit({ id: 's4', emotion: 'shock', startFrame: 180, endFrame: 240 }),   // shift = 4
      makeUnit({ id: 's5', emotion: 'neutral', startFrame: 240, endFrame: 300 }),
      makeUnit({ id: 's6', emotion: 'neutral', startFrame: 300, endFrame: 360 }),
    ]
    const beats = planBeats(units)
    expect(beats[3].role).toBe('climax')
    expect(beats[3].shot_template).toBe('punchline_freeze')
  })

  it('assigns reaction when intensity >= 3', () => {
    const units: StoryUnit[] = [
      makeUnit({ id: 's1', emotion: 'neutral', startFrame: 0, endFrame: 60 }),
      makeUnit({ id: 's2', emotion: 'neutral', startFrame: 60, endFrame: 120 }),
      makeUnit({ id: 's3', emotion: 'anger', startFrame: 120, endFrame: 180 }),  // intensity=3, shift=3 → climax
      makeUnit({ id: 's4', emotion: 'anger', startFrame: 180, endFrame: 240 }),  // intensity=3, shift=0 → reaction
      makeUnit({ id: 's5', emotion: 'neutral', startFrame: 240, endFrame: 300 }),
      makeUnit({ id: 's6', emotion: 'neutral', startFrame: 300, endFrame: 360 }),
    ]
    const beats = planBeats(units)
    expect(beats[3].role).toBe('reaction')
  })

  it('includes effect cue from effectMap', () => {
    const units: StoryUnit[] = [
      makeUnit({ id: 's1', startFrame: 0, endFrame: 60 }),
      makeUnit({ id: 's2', startFrame: 60, endFrame: 120 }),
      makeUnit({ id: 's3', startFrame: 120, endFrame: 180 }),
    ]
    const effectMap = new Map([['s2', 'lightning']])
    const beats = planBeats(units, effectMap)
    expect(beats[1].cue_templates).toContain('lightning_flash')
  })

  it('adds shake_impact + manga_symbol_pop for climax', () => {
    const units: StoryUnit[] = [
      makeUnit({ id: 's1', emotion: 'neutral', startFrame: 0, endFrame: 60 }),
      makeUnit({ id: 's2', emotion: 'neutral', startFrame: 60, endFrame: 120 }),
      makeUnit({ id: 's3', emotion: 'neutral', startFrame: 120, endFrame: 180 }),
      makeUnit({ id: 's4', emotion: 'shock', startFrame: 180, endFrame: 240 }),
      makeUnit({ id: 's5', emotion: 'neutral', startFrame: 240, endFrame: 300 }),
      makeUnit({ id: 's6', emotion: 'neutral', startFrame: 300, endFrame: 360 }),
    ]
    const beats = planBeats(units)
    const climaxBeat = beats.find((b) => b.role === 'climax')
    expect(climaxBeat).toBeDefined()
    expect(climaxBeat!.cue_templates).toContain('shake_impact')
    expect(climaxBeat!.cue_templates).toContain('manga_symbol_pop')
  })

  it('derives asset needs based on emotion', () => {
    const units: StoryUnit[] = [
      makeUnit({ id: 's1', emotion: 'neutral', startFrame: 0, endFrame: 60 }),
      makeUnit({ id: 's2', emotion: 'anger', startFrame: 60, endFrame: 120 }),
      makeUnit({ id: 's3', emotion: 'neutral', startFrame: 120, endFrame: 180 }),
    ]
    const beats = planBeats(units)
    expect(beats[0].asset_needs).toContain('室内背景')
    expect(beats[1].asset_needs).toContain('怒り背景')
  })

  it('maps story_unit_ids 1:1', () => {
    const units: StoryUnit[] = [
      makeUnit({ id: 's1', startFrame: 0, endFrame: 60 }),
      makeUnit({ id: 's2', startFrame: 60, endFrame: 120 }),
    ]
    const beats = planBeats(units)
    expect(beats[0].story_unit_ids).toEqual(['s1'])
    expect(beats[1].story_unit_ids).toEqual(['s2'])
  })

  it('assigns development with explanation_cut for non-neutral', () => {
    // 8 units so middle ones land in development zone
    const units: StoryUnit[] = Array.from({ length: 8 }, (_, i) =>
      makeUnit({
        id: `s${i + 1}`,
        emotion: i === 4 ? 'happy' : 'neutral',
        startFrame: i * 60,
        endFrame: (i + 1) * 60,
      }),
    )
    const beats = planBeats(units)
    // index 4 → pos = 4/7 ≈ 0.57 → development, emotion=happy → explanation_cut
    expect(beats[4].role).toBe('development')
    expect(beats[4].shot_template).toBe('explanation_cut')
  })
})
