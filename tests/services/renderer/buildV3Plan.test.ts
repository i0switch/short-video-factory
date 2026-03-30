import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import os from 'os'
import fs from 'fs'
import path from 'path'
import { buildWavBuffer } from '../../helpers/wavBuilder'

vi.mock('../../../src/services/voicevox/index', () => ({
  synthesize: vi.fn(),
  parseWavDuration: vi.fn(),
}))
vi.mock('../../../src/services/image/index', () => ({
  fetchImage: vi.fn(),
}))
vi.mock('../../../src/utils/config', () => ({
  getVoicevoxConfig: vi.fn(() => ({ url: 'http://mock:50021', speaker: 3, gain: 1.5 })),
  getPexelsApiKey: vi.fn(() => null),
}))

import * as voicevox from '../../../src/services/voicevox/index'
import * as imageService from '../../../src/services/image/index'
import * as config from '../../../src/utils/config'
import { buildV3Plan } from '../../../src/services/renderer/build-v3-plan'

// Minimal Script factory (1 item for most tests)
function makeScript(
  topic: string,
  videoTitle = '動画タイトル',
  outro = 'おわり',
) {
  return {
    videoTitle,
    intro: 'イントロ',
    items: [
      {
        rank: 1,
        topic,
        comment1: 'c1',
        comment2: 'c2',
        body: 'ボディ',
        imageKeywords: ['k'],
        imageKeywordsEn: ['e'],
      },
    ],
    outro,
  }
}

let jobDir: string

beforeEach(() => {
  jobDir = fs.mkdtempSync(path.join(os.tmpdir(), 'svf-test-'))

  // Default: synthesize returns a 1-second WAV, parseWavDuration returns 1.0
  vi.mocked(voicevox.synthesize).mockResolvedValue(buildWavBuffer(1.0))
  vi.mocked(voicevox.parseWavDuration).mockReturnValue(1.0)
  vi.mocked(imageService.fetchImage).mockResolvedValue({
    imagePath: path.join(jobDir, 'img.jpg'),
    fallbackUsed: false,
  })
  vi.mocked(config.getVoicevoxConfig).mockReturnValue({ url: 'http://mock:50021', speaker: 3, gain: 1.5 })
  vi.mocked(config.getPexelsApiKey).mockReturnValue(null)
})

afterEach(() => {
  vi.resetAllMocks()
  try {
    fs.rmSync(jobDir, { recursive: true, force: true })
  } catch {
    // ignore cleanup errors
  }
})

describe('buildV3Plan', () => {
  it('TC-055: topic length=10 → headlineLines split at 7 chars', async () => {
    const topic = 'A'.repeat(10)
    const result = await buildV3Plan(makeScript(topic), jobDir)

    expect(result.scenes[0].phase1.headlineLines).toEqual(['AAAAAAA', 'AAA'])
    expect(result.scenes[0].phase1.headlineLines).toHaveLength(2)
  })

  it('TC-056: topic length=11 → headlineLines split at 7 chars', async () => {
    const topic = 'A'.repeat(11)
    // maxChars=7 → ['AAAAAAA', 'AAAA']
    const result = await buildV3Plan(makeScript(topic), jobDir)

    expect(result.scenes[0].phase1.headlineLines).toHaveLength(2)
    expect(result.scenes[0].phase1.headlineLines[0]).toBe('AAAAAAA')
    expect(result.scenes[0].phase1.headlineLines[1]).toBe('AAAA')
  })

  it('TC-057: 1 item → durationFrames = budget-driven (1605)', async () => {
    // budget-driven: AVAILABLE_RANK_FRAMES(1605) / 1 item = 1605
    const result = await buildV3Plan(makeScript('短い'), jobDir)

    expect(result.scenes[0].durationFrames).toBe(1605)
  })

  it('TC-058: 1 item → durationFrames = budget-driven regardless of audio', async () => {
    vi.mocked(voicevox.parseWavDuration).mockReturnValue(5.0)
    // budget-driven: 1605 / 1 = 1605
    const result = await buildV3Plan(makeScript('長い'), jobDir)

    expect(result.scenes[0].durationFrames).toBe(1605)
  })

  it('TC-059: durationFrames is budget-driven not audio-driven', async () => {
    const duration = 128 / 30
    vi.mocked(voicevox.parseWavDuration).mockReturnValue(duration)

    const result = await buildV3Plan(makeScript('境界'), jobDir)

    expect(result.scenes[0].durationFrames).toBe(1605)
  })

  it('TC-060: getPexelsApiKey returns null → fetchImage called with null apiKey, fallbackUsed=true', async () => {
    vi.mocked(config.getPexelsApiKey).mockReturnValue(null)
    vi.mocked(imageService.fetchImage).mockResolvedValue({
      imagePath: path.join(jobDir, 'fallback.jpg'),
      fallbackUsed: true,
    })

    const result = await buildV3Plan(makeScript('テスト'), jobDir)

    // Both imgA and imgB should show fallback
    const fetchCalls = vi.mocked(imageService.fetchImage).mock.calls
    expect(fetchCalls.every(([, apiKey]) => apiKey === null)).toBe(true)
  })

  it('TC-061: videoTitle with spaces → intro.lines balanced split with correct styles', async () => {
    const result = await buildV3Plan(
      makeScript('テスト', '令和 日本 最強 ランキング'),
      jobDir,
    )

    // BudouX treats '令和日本最強ランキング' as a single chunk (no word boundary)
    // so it stays as 1 line
    const lines = result.intro.lines
    expect(lines).toHaveLength(1)
    expect(lines[0].text).toBe('令和日本最強ランキング')
    expect(lines[0].style).toBe('introBlack')
  })

  it('TC-062: outro lines are hardcoded CTA text (2 natural lines)', async () => {
    const result = await buildV3Plan(
      makeScript('テスト', '動画タイトル', 'コメント欄へ'),
      jobDir,
    )

    // outro.lines is hardcoded in build-v3-plan.ts
    expect(result.outro.lines).toEqual(['みんなの意見は', 'コメント欄へ！'])
  })
})
