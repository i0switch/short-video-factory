import { describe, it, expect } from 'vitest'
import { decomposeStory } from '../../../src/services/template-engine/story-decomposer'
import type { TwoChScript } from '../../../src/schema/twoch-script'

function makeScript(scenes: Array<{
  speaker?: string
  text?: string
  emotion?: string
  effect?: string
  durationFrames?: number
}>): TwoChScript {
  return {
    format: '2ch',
    videoTitle: 'Test Video',
    episodes: [
      {
        scenes: scenes.map((s) => ({
          speaker: s.speaker ?? 'narrator',
          text: s.text ?? 'test text',
          emotion: (s.emotion ?? 'neutral') as 'neutral',
          effect: (s.effect ?? 'none') as 'none',
          imageKeywords: ['test'],
          imageKeywordsEn: ['test'],
          ...(s.durationFrames != null ? { durationFrames: s.durationFrames } : {}),
        })),
      },
    ],
  }
}

describe('decomposeStory', () => {
  it('decomposes single scene with default duration', () => {
    const script = makeScript([{ speaker: 'narrator', text: 'Hello' }])
    const units = decomposeStory(script, 30)

    expect(units).toHaveLength(1)
    expect(units[0].id).toBe('s1')
    expect(units[0].speaker).toBe('narrator')
    expect(units[0].text).toBe('Hello')
    expect(units[0].startFrame).toBe(0)
    // DEFAULT_SCENE_DURATION_SEC = 2.0, fps = 30 → 60 frames
    expect(units[0].endFrame).toBe(60)
  })

  it('respects durationFrames when set', () => {
    const script = makeScript([{ durationFrames: 45 }])
    const units = decomposeStory(script, 30)

    expect(units[0].startFrame).toBe(0)
    expect(units[0].endFrame).toBe(45)
  })

  it('sequences frames across multiple scenes', () => {
    const script = makeScript([
      { durationFrames: 30 },
      { durationFrames: 45 },
      { durationFrames: 60 },
    ])
    const units = decomposeStory(script, 30)

    expect(units).toHaveLength(3)
    expect(units[0].startFrame).toBe(0)
    expect(units[0].endFrame).toBe(30)
    expect(units[1].startFrame).toBe(30)
    expect(units[1].endFrame).toBe(75)
    expect(units[2].startFrame).toBe(75)
    expect(units[2].endFrame).toBe(135)
  })

  it('generates sequential IDs across episodes', () => {
    const script: TwoChScript = {
      format: '2ch',
      videoTitle: 'Multi Episode',
      episodes: [
        {
          title: 'Ep 1',
          scenes: [
            { speaker: 'narrator', text: 'A', emotion: 'neutral', effect: 'none', imageKeywords: ['a'], imageKeywordsEn: ['a'] },
          ],
        },
        {
          title: 'Ep 2',
          scenes: [
            { speaker: 'character1', text: 'B', emotion: 'happy', effect: 'none', imageKeywords: ['b'], imageKeywordsEn: ['b'] },
          ],
        },
      ],
    }
    const units = decomposeStory(script, 30)

    expect(units).toHaveLength(2)
    expect(units[0].id).toBe('s1')
    expect(units[1].id).toBe('s2')
    expect(units[1].speaker).toBe('character1')
    expect(units[1].emotion).toBe('happy')
  })

  it('maps unknown speakers to narrator', () => {
    const script = makeScript([{ speaker: 'unknown_person' }])
    const units = decomposeStory(script, 30)
    expect(units[0].speaker).toBe('narrator')
  })

  it('preserves narration when present', () => {
    const script: TwoChScript = {
      format: '2ch',
      videoTitle: 'Narration Test',
      episodes: [{
        scenes: [{
          speaker: 'narrator',
          text: 'Display text',
          narration: 'Read aloud text',
          emotion: 'neutral',
          effect: 'none',
          imageKeywords: ['test'],
          imageKeywordsEn: ['test'],
        }],
      }],
    }
    const units = decomposeStory(script, 30)
    expect(units[0].text).toBe('Display text')
    expect(units[0].narration).toBe('Read aloud text')
  })
})
