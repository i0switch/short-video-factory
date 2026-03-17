import { vi, describe, it, expect, afterEach } from 'vitest'
import * as client from '../../src/llm/client'
import { generateScript } from '../../src/llm/generate-script'
import { ScriptValidationError } from '../../src/utils/errors'

const validScriptJson = JSON.stringify({
  videoTitle: 'テストタイトル',
  intro: 'イントロ',
  items: [
    { rank: 3, topic: 'トピック3', comment1: 'c1', comment2: 'c2', body: 'ボディテキスト', imageKeywords: ['k'], imageKeywordsEn: ['e'] },
    { rank: 2, topic: 'トピック2', comment1: 'c1', comment2: 'c2', body: 'ボディテキスト', imageKeywords: ['k'], imageKeywordsEn: ['e'] },
    { rank: 1, topic: 'トピック1', comment1: 'c1', comment2: 'c2', body: 'ボディテキスト', imageKeywords: ['k'], imageKeywordsEn: ['e'] },
  ],
  outro: 'おわり',
})

// Valid JSON but fails Zod (only 1 item, minimum is 3)
const zodInvalidJson = JSON.stringify({
  videoTitle: 'T',
  intro: 'I',
  items: [
    { rank: 1, topic: 'top', comment1: 'c1', comment2: 'c2', body: 'body', imageKeywords: ['k'], imageKeywordsEn: ['e'] },
  ],
  outro: 'o',
})

const llmConfig = { provider: 'openai' as const, apiKey: 'sk-xxx', model: 'gpt-4o' }

afterEach(() => {
  vi.restoreAllMocks()
})

describe('generateScript', () => {
  it('TC-067: chatCompletion returns valid JSON once → Script returned', async () => {
    vi.spyOn(client, 'chatCompletion').mockResolvedValueOnce(validScriptJson)

    const result = await generateScript('テスト', 3, llmConfig)

    expect(result.videoTitle).toBe('テストタイトル')
    expect(result.items).toHaveLength(3)
  })

  it('TC-068: first call returns invalid JSON, second returns valid → Script returned', async () => {
    vi.spyOn(client, 'chatCompletion')
      .mockResolvedValueOnce('invalid json!!!')
      .mockResolvedValueOnce(validScriptJson)

    const result = await generateScript('テスト', 3, llmConfig)

    expect(result.videoTitle).toBe('テストタイトル')
  })

  it('TC-069: first call returns Zod-invalid JSON, second returns valid → Script returned', async () => {
    vi.spyOn(client, 'chatCompletion')
      .mockResolvedValueOnce(zodInvalidJson)
      .mockResolvedValueOnce(validScriptJson)

    const result = await generateScript('テスト', 3, llmConfig)

    expect(result.videoTitle).toBe('テストタイトル')
  })

  it('TC-070: all 3 calls return invalid JSON → throw ScriptValidationError with "3 attempts"', async () => {
    vi.spyOn(client, 'chatCompletion').mockResolvedValue('invalid json!!!')

    await expect(generateScript('テスト', 3, llmConfig))
      .rejects.toThrow(ScriptValidationError)
    await expect(generateScript('テスト', 3, llmConfig))
      .rejects.toThrow('3 attempts')
  })

  it('TC-071: all 3 calls return Zod-invalid JSON → throw ScriptValidationError', async () => {
    vi.spyOn(client, 'chatCompletion').mockResolvedValue(zodInvalidJson)

    await expect(generateScript('テスト', 3, llmConfig))
      .rejects.toThrow(ScriptValidationError)
  })

  it('TC-072: first invalid JSON, second Zod-invalid, third valid → Script returned', async () => {
    vi.spyOn(client, 'chatCompletion')
      .mockResolvedValueOnce('invalid json!!!')
      .mockResolvedValueOnce(zodInvalidJson)
      .mockResolvedValueOnce(validScriptJson)

    const result = await generateScript('テスト', 3, llmConfig)

    expect(result.videoTitle).toBe('テストタイトル')
  })
})
