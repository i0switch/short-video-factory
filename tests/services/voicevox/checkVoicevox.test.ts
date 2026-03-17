import { describe, it, expect, vi, afterEach } from 'vitest'
import { checkVoicevox, synthesize } from '../../../src/services/voicevox/index'
import { VoicevoxError } from '../../../src/utils/errors'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('checkVoicevox', () => {
  // TC-037: fetchが200を返す → resolves undefined
  it('TC-037: VOICEVOXが正常に応答した場合はresolveする', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200 }))
    await expect(checkVoicevox('http://localhost:50021')).resolves.toBeUndefined()
  })

  // TC-038: fetchが500を返す → rejects VoicevoxError containing 'HTTP 500'
  it('TC-038: VOICEVOXが500を返した場合はVoicevoxError(HTTP 500)をthrowする', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }))
    await expect(checkVoicevox('http://localhost:50021')).rejects.toThrow(VoicevoxError)
    await expect(checkVoicevox('http://localhost:50021')).rejects.toThrow('HTTP 500')
  })

  // TC-039: fetchがthrow → rejects VoicevoxError containing '接続できません'
  it('TC-039: fetchが失敗した場合はVoicevoxError(接続できません)をthrowする', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')))
    await expect(checkVoicevox('http://localhost:50021')).rejects.toThrow(VoicevoxError)
    await expect(checkVoicevox('http://localhost:50021')).rejects.toThrow('接続できません')
  })
})

describe('synthesize', () => {
  // TC-040: audio_queryが422を返す → rejects VoicevoxError 'audio_query failed: HTTP 422'
  it('TC-040: audio_queryが422を返した場合はVoicevoxErrorをthrowする', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 422 }))
    await expect(synthesize('テスト', 'http://localhost:50021', 1, 1.0)).rejects.toThrow(VoicevoxError)
    await expect(synthesize('テスト', 'http://localhost:50021', 1, 1.0)).rejects.toThrow('audio_query failed: HTTP 422')
  })

  // TC-041: audio_queryはOK、synthesisが500を返す → rejects VoicevoxError 'synthesis failed: HTTP 500'
  it('TC-041: synthesisが500を返した場合はVoicevoxErrorをthrowする', async () => {
    const makeFetchMock = () => {
      const m = vi.fn()
      m.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({ volumeScale: 1.0 }),
      })
      m.mockResolvedValueOnce({ ok: false, status: 500 })
      return m
    }
    vi.stubGlobal('fetch', makeFetchMock())
    let err: unknown
    try {
      await synthesize('テスト', 'http://localhost:50021', 1, 1.0)
    } catch (e) {
      err = e
    }
    expect(err).toBeInstanceOf(VoicevoxError)
    expect((err as VoicevoxError).message).toContain('synthesis failed: HTTP 500')
  })
})
