import { vi, describe, it, expect, afterEach } from 'vitest'
import { chatCompletion } from '../../src/llm/client'
import { ConfigError } from '../../src/utils/errors'

afterEach(() => {
  vi.unstubAllGlobals()
  delete process.env.OPENAI_BASE_URL
})

describe('chatCompletion / callAnthropic', () => {
  it('TC-073: Anthropic response with ```json...``` block → stripped JSON returned', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        content: [{ text: '```json\n{"key":"val"}\n```' }],
      }),
    })
    vi.stubGlobal('fetch', mockFetch)

    const result = await chatCompletion(
      [{ role: 'user', content: 'hi' }],
      'anthropic',
      'sk-ant-xxx',
      'claude-3-5-sonnet-20241022',
    )

    expect(result).toBe('{"key":"val"}')
  })

  it('TC-074: Anthropic response without backticks → returned as-is', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        content: [{ text: '{"key":"val"}' }],
      }),
    })
    vi.stubGlobal('fetch', mockFetch)

    const result = await chatCompletion(
      [{ role: 'user', content: 'hi' }],
      'anthropic',
      'sk-ant-xxx',
      'claude-3-5-sonnet-20241022',
    )

    expect(result).toBe('{"key":"val"}')
  })

  it('TC-075: Anthropic with systemMsg → body.system set', async () => {
    let capturedBody: Record<string, unknown> | undefined
    const mockFetch = vi.fn().mockImplementation((_url: string, opts: RequestInit) => {
      capturedBody = JSON.parse(opts.body as string) as Record<string, unknown>
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ content: [{ text: '{}' }] }),
      })
    })
    vi.stubGlobal('fetch', mockFetch)

    await chatCompletion(
      [
        { role: 'system', content: 'system' },
        { role: 'user', content: 'hi' },
      ],
      'anthropic',
      'sk-ant-xxx',
      'claude-3-5-sonnet-20241022',
    )

    expect(capturedBody).toBeDefined()
    expect(capturedBody!.system).toBe('system')
  })

  it('TC-076: Anthropic without systemMsg → no body.system', async () => {
    let capturedBody: Record<string, unknown> | undefined
    const mockFetch = vi.fn().mockImplementation((_url: string, opts: RequestInit) => {
      capturedBody = JSON.parse(opts.body as string) as Record<string, unknown>
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ content: [{ text: '{}' }] }),
      })
    })
    vi.stubGlobal('fetch', mockFetch)

    await chatCompletion(
      [{ role: 'user', content: 'hi' }],
      'anthropic',
      'sk-ant-xxx',
      'claude-3-5-sonnet-20241022',
    )

    expect(capturedBody).toBeDefined()
    expect(capturedBody!.system).toBeUndefined()
  })
})

describe('chatCompletion / callOpenAI', () => {
  it('TC-077: OpenAI HTTP 400 → throw ConfigError containing "OpenAI API error 400"', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: () => Promise.resolve('bad request'),
    })
    vi.stubGlobal('fetch', mockFetch)

    await expect(
      chatCompletion(
        [{ role: 'user', content: 'hi' }],
        'openai',
        'sk-xxx',
        'gpt-4o',
      )
    ).rejects.toThrow(ConfigError)

    await expect(
      chatCompletion(
        [{ role: 'user', content: 'hi' }],
        'openai',
        'sk-xxx',
        'gpt-4o',
      )
    ).rejects.toThrow('OpenAI API error 400')
  })

  it('TC-078: Anthropic HTTP 500 → throw ConfigError containing "Anthropic API error 500"', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve('internal server error'),
    })
    vi.stubGlobal('fetch', mockFetch)

    await expect(
      chatCompletion(
        [{ role: 'user', content: 'hi' }],
        'anthropic',
        'sk-ant-xxx',
        'claude-3-5-sonnet-20241022',
      )
    ).rejects.toThrow(ConfigError)

    await expect(
      chatCompletion(
        [{ role: 'user', content: 'hi' }],
        'anthropic',
        'sk-ant-xxx',
        'claude-3-5-sonnet-20241022',
      )
    ).rejects.toThrow('Anthropic API error 500')
  })

  it('TC-079: OPENAI_BASE_URL env set → fetch called with that base URL', async () => {
    process.env.OPENAI_BASE_URL = 'https://custom.api'

    let capturedUrl: string | undefined
    const mockFetch = vi.fn().mockImplementation((url: string) => {
      capturedUrl = url
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: '{"result":"ok"}' } }],
        }),
      })
    })
    vi.stubGlobal('fetch', mockFetch)

    await chatCompletion(
      [{ role: 'user', content: 'hi' }],
      'openai',
      'sk-xxx',
      'gpt-4o',
    )

    expect(capturedUrl).toContain('https://custom.api')
  })
})
