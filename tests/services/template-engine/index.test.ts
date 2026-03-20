import { describe, it, expect } from 'vitest'
import { runTemplateEngine } from '../../../src/services/template-engine/index'
import type { TwoChScript } from '../../../src/schema/twoch-script'

function makeScript(sceneCount = 5): TwoChScript {
  const scenes = Array.from({ length: sceneCount }, (_, i) => ({
    speaker: i % 3 === 0 ? 'narrator' : i % 3 === 1 ? 'character1' : 'character2',
    text: `シーン${i + 1}のテキスト`,
    narration: `シーン${i + 1}のナレーション`,
    emotion: (['neutral', 'anger', 'confusion', 'shock', 'happy'] as const)[i % 5],
    effect: i === 3 ? 'concentration_lines' as const : 'none' as const,
    imageKeywords: ['テスト'],
    imageKeywordsEn: ['test'],
  }))

  return {
    format: '2ch',
    videoTitle: 'テスト動画タイトル',
    episodes: [{ scenes }],
  }
}

describe('runTemplateEngine', () => {
  it('produces all expected outputs with skipAssets + skipTts', async () => {
    const script = makeScript(5)
    const output = await runTemplateEngine({
      script,
      fps: 30,
      skipAssets: true,
      skipTts: true,
    })

    expect(output.storyJson.units).toHaveLength(5)
    expect(output.beatsJson.beats).toHaveLength(5)
    expect(output.timelineJson.entries).toHaveLength(5)
    expect(output.timelineJson.totalFrames).toBeGreaterThan(0)
    expect(output.audioJson.segments.length).toBeGreaterThan(0)
    expect(output.config.videoTitle).toBe('テスト動画タイトル')
    expect(output.config.meta.fps).toBe(30)
    expect(output.config.scenes).toHaveLength(5)
  })

  it('storyJson units match scene count', async () => {
    const output = await runTemplateEngine({
      script: makeScript(10),
      fps: 30,
      skipAssets: true,
      skipTts: true,
    })
    expect(output.storyJson.units).toHaveLength(10)
    expect(output.beatsJson.beats).toHaveLength(10)
  })

  it('audio plan includes voice, bgm segments', async () => {
    const output = await runTemplateEngine({
      script: makeScript(3),
      fps: 30,
      skipAssets: true,
      skipTts: true,
    })
    const voiceSegs = output.audioJson.segments.filter((s) => s.type === 'voice')
    const bgmSegs = output.audioJson.segments.filter((s) => s.type === 'bgm')
    expect(voiceSegs).toHaveLength(3)
    expect(bgmSegs).toHaveLength(1)
  })

  it('includes SE for effect beats', async () => {
    const script = makeScript(5)
    // scene index 3 has concentration_lines effect
    const output = await runTemplateEngine({
      script,
      fps: 30,
      skipAssets: true,
      skipTts: true,
    })
    const seSegs = output.audioJson.segments.filter((s) => s.type === 'se')
    expect(seSegs.length).toBeGreaterThanOrEqual(1)
  })

  it('templateManifest has expected shape', async () => {
    const output = await runTemplateEngine({
      script: makeScript(5),
      fps: 30,
      skipAssets: true,
      skipTts: true,
    })
    const manifest = output.templateManifest as {
      shotTemplatesUsed: Record<string, number>
      cueTemplatesUsed: Record<string, number>
      totalBeats: number
      totalFrames: number
      durationSec: number
    }
    expect(manifest.totalBeats).toBe(5)
    expect(manifest.totalFrames).toBeGreaterThan(0)
    expect(manifest.durationSec).toBeGreaterThan(0)
    expect(Object.keys(manifest.shotTemplatesUsed).length).toBeGreaterThan(0)
    expect(Object.keys(manifest.cueTemplatesUsed).length).toBeGreaterThan(0)
  })

  it('respects script outro override', async () => {
    const script = makeScript(3)
    script.outro = 'カスタムアウトロ'
    const output = await runTemplateEngine({
      script,
      fps: 30,
      skipAssets: true,
      skipTts: true,
    })
    expect(output.config.outro.text).toBe('カスタムアウトロ')
  })

  it('uses seriesTitle from script when provided', async () => {
    const script = makeScript(3)
    script.seriesTitle = 'マイシリーズ'
    const output = await runTemplateEngine({
      script,
      fps: 30,
      skipAssets: true,
      skipTts: true,
    })
    expect(output.config.seriesTitle).toBe('マイシリーズ')
  })

  it('defaults seriesTitle to videoTitle when not provided', async () => {
    const script = makeScript(3)
    const output = await runTemplateEngine({
      script,
      fps: 30,
      skipAssets: true,
      skipTts: true,
    })
    expect(output.config.seriesTitle).toBe('テスト動画タイトル')
  })

  it('assetManifest is empty object when skipAssets', async () => {
    const output = await runTemplateEngine({
      script: makeScript(3),
      fps: 30,
      skipAssets: true,
      skipTts: true,
    })
    expect(output.assetManifest).toEqual({ assets: [] })
    expect(output.assetRequests).toEqual({ pending: [] })
  })
})
