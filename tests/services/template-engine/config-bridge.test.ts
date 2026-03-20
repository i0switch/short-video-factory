import { describe, it, expect } from 'vitest'
import { bridgeToTwoChConfig, type BeatMeta } from '../../../src/services/template-engine/config-bridge'
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

describe('bridgeToTwoChConfig', () => {
  const beats: Beat[] = [
    makeBeat({ beat_id: 'b1', estimated_duration_frames: 60 }),
    makeBeat({ beat_id: 'b2', estimated_duration_frames: 90 }),
  ]
  const timeline = buildTimeline(beats, 30)

  const beatMetas: BeatMeta[] = [
    { beat_id: 'b1', text: 'こんにちは', speaker: 'narrator', emotion: 'neutral' },
    { beat_id: 'b2', text: '驚いた！', speaker: 'character1', emotion: 'shock', effect: 'lightning' },
  ]

  it('produces correct meta', () => {
    const config = bridgeToTwoChConfig(timeline, 'テスト動画', 'テストシリーズ', beatMetas, 30)
    expect(config.meta).toEqual({
      fps: 30,
      width: 1080,
      height: 1920,
      audioSampleRate: 44100,
    })
  })

  it('sets videoTitle and seriesTitle', () => {
    const config = bridgeToTwoChConfig(timeline, 'テスト動画', 'テストシリーズ', beatMetas, 30)
    expect(config.videoTitle).toBe('テスト動画')
    expect(config.seriesTitle).toBe('テストシリーズ')
  })

  it('sets titleColor to gold', () => {
    const config = bridgeToTwoChConfig(timeline, 'テスト動画', 'テストシリーズ', beatMetas, 30)
    expect(config.titleColor).toBe('#FFD700')
  })

  it('maps scenes with correct speaker colors', () => {
    const config = bridgeToTwoChConfig(timeline, 'テスト動画', 'テストシリーズ', beatMetas, 30)
    expect(config.scenes).toHaveLength(2)
    expect(config.scenes[0]).toMatchObject({
      text: 'こんにちは',
      speaker: 'narrator',
      speakerColor: '#4A90D9',
      emotion: 'neutral',
      durationFrames: 60,
    })
    expect(config.scenes[1]).toMatchObject({
      text: '驚いた！',
      speaker: 'character1',
      speakerColor: '#D94A4A',
      emotion: 'shock',
      effect: 'lightning',
      durationFrames: 90,
    })
  })

  it('sets outro correctly', () => {
    const config = bridgeToTwoChConfig(timeline, 'テスト動画', 'テストシリーズ', beatMetas, 30)
    expect(config.outro).toEqual({
      text: 'チャンネル登録よろしく！',
      durationFrames: 90,
    })
  })

  it('uses narrator defaults for unknown beat_ids', () => {
    const config = bridgeToTwoChConfig(
      timeline,
      'テスト',
      'シリーズ',
      [{ beat_id: 'b1', text: 'hello', speaker: 'narrator', emotion: 'neutral' }],
      30,
    )
    // b2 has no meta → defaults
    expect(config.scenes[1]).toMatchObject({
      speaker: 'narrator',
      speakerColor: '#4A90D9',
      emotion: 'neutral',
      effect: 'none',
      text: '',
    })
  })

  it('defaults unknown speaker to narrator color', () => {
    const config = bridgeToTwoChConfig(
      timeline,
      'テスト',
      'シリーズ',
      [
        { beat_id: 'b1', text: 'x', speaker: 'unknown_person', emotion: 'neutral' },
        { beat_id: 'b2', text: 'y', speaker: 'character2', emotion: 'happy' },
      ],
      30,
    )
    expect(config.scenes[0].speakerColor).toBe('#4A90D9')
    expect(config.scenes[1].speakerColor).toBe('#4AD97A')
  })
})
