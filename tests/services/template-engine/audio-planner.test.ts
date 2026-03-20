import { describe, it, expect } from 'vitest'
import { buildAudioPlan, type BeatAudioMeta } from '../../../src/services/template-engine/audio-planner'

function makeBeats(overrides?: Partial<BeatAudioMeta>[]): BeatAudioMeta[] {
  const defaults: BeatAudioMeta[] = [
    { beat_id: 'b1', speaker: 'narrator', narration: 'こんにちは', startFrame: 0, endFrame: 60 },
    { beat_id: 'b2', speaker: 'character1', narration: '驚いた！', startFrame: 60, endFrame: 120, effect: 'shake' },
    { beat_id: 'b3', speaker: 'character2', narration: 'なるほど', startFrame: 120, endFrame: 180 },
  ]
  if (overrides) {
    return defaults.map((d, i) => ({ ...d, ...(overrides[i] ?? {}) }))
  }
  return defaults
}

describe('buildAudioPlan', () => {
  it('creates voice segments for each beat', () => {
    const beats = makeBeats()
    const audio = buildAudioPlan(beats, 30)
    const voiceSegments = audio.segments.filter((s) => s.type === 'voice')
    expect(voiceSegments).toHaveLength(3)
    expect(voiceSegments[0]).toMatchObject({
      type: 'voice',
      src: 'voice_b1.wav',
      startFrame: 0,
      endFrame: 60,
      volume: 1.0,
    })
  })

  it('creates SE segments for beats with effects', () => {
    const beats = makeBeats()
    const audio = buildAudioPlan(beats, 30)
    const seSegments = audio.segments.filter((s) => s.type === 'se')
    expect(seSegments).toHaveLength(1)
    expect(seSegments[0]).toMatchObject({
      type: 'se',
      src: 'assets/se/se_hit.mp3',
      startFrame: 60,
      volume: 0.6,
    })
  })

  it('does not create SE for effect=none', () => {
    const beats: BeatAudioMeta[] = [
      { beat_id: 'b1', speaker: 'narrator', narration: 'test', startFrame: 0, endFrame: 60, effect: 'none' },
    ]
    const audio = buildAudioPlan(beats, 30)
    const seSegments = audio.segments.filter((s) => s.type === 'se')
    expect(seSegments).toHaveLength(0)
  })

  it('creates exactly one BGM segment spanning full duration', () => {
    const beats = makeBeats()
    const audio = buildAudioPlan(beats, 30)
    const bgmSegments = audio.segments.filter((s) => s.type === 'bgm')
    expect(bgmSegments).toHaveLength(1)
    expect(bgmSegments[0]).toMatchObject({
      type: 'bgm',
      src: 'assets/bgm/ukiuki_lalala.mp3',
      startFrame: 0,
      endFrame: 180,
      volume: 0.12,
    })
  })

  it('handles empty beats array', () => {
    const audio = buildAudioPlan([], 30)
    expect(audio.segments).toHaveLength(1) // just BGM
    expect(audio.segments[0].type).toBe('bgm')
    expect(audio.segments[0].endFrame).toBe(0)
  })

  it('creates SE for lightning effect', () => {
    const beats: BeatAudioMeta[] = [
      { beat_id: 'b1', speaker: 'narrator', narration: 'test', startFrame: 0, endFrame: 90, effect: 'lightning' },
    ]
    const audio = buildAudioPlan(beats, 30)
    const seSegments = audio.segments.filter((s) => s.type === 'se')
    expect(seSegments).toHaveLength(1)
    expect(seSegments[0].src).toBe('assets/se/se_reveal.mp3')
  })

  it('SE endFrame does not exceed beat endFrame', () => {
    const beats: BeatAudioMeta[] = [
      { beat_id: 'b1', speaker: 'narrator', narration: 'test', startFrame: 0, endFrame: 10, effect: 'shake' },
    ]
    const audio = buildAudioPlan(beats, 30)
    const seSegments = audio.segments.filter((s) => s.type === 'se')
    expect(seSegments[0].endFrame).toBeLessThanOrEqual(10)
  })
})
