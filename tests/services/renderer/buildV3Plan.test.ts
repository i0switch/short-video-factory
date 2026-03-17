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
  it('TC-055: topic length=10 → headlineLines has 1 element', async () => {
    const topic = 'A'.repeat(10)
    const result = await buildV3Plan(makeScript(topic), jobDir)

    expect(result.scenes[0].phase1.headlineLines).toEqual(['AAAAAAAAAA'])
    expect(result.scenes[0].phase1.headlineLines).toHaveLength(1)
  })

  it('TC-056: topic length=11 → headlineLines split into 2 elements', async () => {
    const topic = 'A'.repeat(11)
    // ceil(11/2) = 6 → ['AAAAAA', 'AAAAA']
    const result = await buildV3Plan(makeScript(topic), jobDir)

    expect(result.scenes[0].phase1.headlineLines).toHaveLength(2)
    expect(result.scenes[0].phase1.headlineLines[0]).toBe('AAAAAA')
    expect(result.scenes[0].phase1.headlineLines[1]).toBe('AAAAA')
  })

  it('TC-057: audio=0.5s → durationFrames=143 (MIN)', async () => {
    vi.mocked(voicevox.parseWavDuration).mockReturnValue(0.5)
    // ceil(0.5 * 30) + 15 = 15 + 15 = 30 → Math.max(30, 143) = 143

    const result = await buildV3Plan(makeScript('短い'), jobDir)

    expect(result.scenes[0].durationFrames).toBe(143)
  })

  it('TC-058: audio=5.0s → durationFrames=165', async () => {
    vi.mocked(voicevox.parseWavDuration).mockReturnValue(5.0)
    // ceil(5.0 * 30) + 15 = 150 + 15 = 165 → Math.max(165, 143) = 165

    const result = await buildV3Plan(makeScript('長い'), jobDir)

    expect(result.scenes[0].durationFrames).toBe(165)
  })

  it('TC-059: audio=128/30s → durationFrames=143 (exact boundary)', async () => {
    // 128/30 * 30 = 128.0, ceil(128) = 128, 128 + 15 = 143 = MIN
    const duration = 128 / 30
    vi.mocked(voicevox.parseWavDuration).mockReturnValue(duration)

    const result = await buildV3Plan(makeScript('境界'), jobDir)

    expect(result.scenes[0].durationFrames).toBe(143)
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

  it('TC-061: videoTitle with spaces → intro.lines styles cycle correctly', async () => {
    const result = await buildV3Plan(
      makeScript('テスト', '令和 日本 最強 ランキング'),
      jobDir,
    )

    const lines = result.intro.lines
    expect(lines).toHaveLength(4)
    expect(lines[0].style).toBe('introBlack')
    expect(lines[1].style).toBe('introRed')
    expect(lines[2].style).toBe('introBlack')
    expect(lines[3].style).toBe('introYellow')
    expect(lines[0].text).toBe('令和')
    expect(lines[1].text).toBe('日本')
    expect(lines[2].text).toBe('最強')
    expect(lines[3].text).toBe('ランキング')
  })

  it('TC-062: outro="コメント欄へ" → outro.lines has single element', async () => {
    const result = await buildV3Plan(
      makeScript('テスト', '動画タイトル', 'コメント欄へ'),
      jobDir,
    )

    expect(result.outro.lines).toHaveLength(1)
    expect(result.outro.lines[0]).toBe('コメント欄へ')
  })
})
