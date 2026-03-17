import { describe, it, expect } from 'vitest'
import type { V3Meta, V3Scene, VideoV3Config } from '../../../src/remotion/types/video-v3'
import { buildTimeline, getTotalFrames } from '../../../src/remotion/components/timeline/TimelineController'

function makeConfig(meta: Partial<V3Meta>, scenes: V3Scene[]): VideoV3Config {
  return {
    meta: { width: 1080, height: 1920, fps: 30, introFrames: 102, sceneFrames: 162, outroFrames: 63, ...meta },
    theme: {} as any,
    intro: { lines: [] },
    scenes,
    outro: { lines: [] },
  }
}

function makeScene(durationFrames?: number): V3Scene {
  return {
    rank: 1,
    durationFrames,
    phase1: { headlineLines: [], asset: { src: '', fallbackLabel: '' } },
    phase2: { topComment: '', bottomComment: '', asset: { src: '', fallbackLabel: '' } },
  }
}

describe('buildTimeline', () => {
  it('TC-063: 3 scenes all undefined durationFrames → entries use meta.sceneFrames', () => {
    const config = makeConfig(
      { introFrames: 102, sceneFrames: 162, outroFrames: 63 },
      [makeScene(), makeScene(), makeScene()],
    )
    const entries = buildTimeline(config)

    expect(entries).toHaveLength(5)

    expect(entries[0]).toEqual({ type: 'opening', startFrame: 0, durationFrames: 102 })
    expect(entries[1]).toEqual({ type: 'ranking', startFrame: 102, durationFrames: 162, rankIndex: 0 })
    expect(entries[2]).toEqual({ type: 'ranking', startFrame: 264, durationFrames: 162, rankIndex: 1 })
    expect(entries[3]).toEqual({ type: 'ranking', startFrame: 426, durationFrames: 162, rankIndex: 2 })
    expect(entries[4]).toEqual({ type: 'ending', startFrame: 588, durationFrames: 63 })
  })

  it('TC-064: scenes[0].durationFrames=200 overrides, others use meta.sceneFrames', () => {
    const config = makeConfig(
      { introFrames: 102, sceneFrames: 162, outroFrames: 63 },
      [makeScene(200), makeScene(), makeScene()],
    )
    const entries = buildTimeline(config)

    expect(entries[1].durationFrames).toBe(200)
    expect(entries[2].durationFrames).toBe(162)
    expect(entries[3].durationFrames).toBe(162)
  })

  it('TC-065: getTotalFrames with TC-063 setup → 651', () => {
    const config = makeConfig(
      { introFrames: 102, sceneFrames: 162, outroFrames: 63 },
      [makeScene(), makeScene(), makeScene()],
    )
    // 102 + 162*3 + 63 = 102 + 486 + 63 = 651
    expect(getTotalFrames(config)).toBe(651)
  })

  it('TC-066: scenes=[] → entries=[opening, ending] only (length=2)', () => {
    const config = makeConfig(
      { introFrames: 102, sceneFrames: 162, outroFrames: 63 },
      [],
    )
    const entries = buildTimeline(config)

    expect(entries).toHaveLength(2)
    expect(entries[0].type).toBe('opening')
    expect(entries[1].type).toBe('ending')
  })
})
