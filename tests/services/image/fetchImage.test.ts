import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { fetchImage } from '../../../src/services/image/index'
import { fetchPexelsImage } from '../../../src/services/image/pexels'
import { AssetFetchError } from '../../../src/utils/errors'

// fallbackモジュールをモックして実ファイルI/Oを避ける
vi.mock('../../../src/services/image/fallback', () => ({
  copyFallbackImage: vi.fn((jobDir: string, filename: string) => path.join(jobDir, filename)),
}))

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('fetchImage', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'svf-test-'))
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  // TC-042: apiKey=null → fallbackUsed=true
  it('TC-042: apiKeyがnullの場合はfallbackを使用する', async () => {
    const result = await fetchImage(['nature'], null, tmpDir, 'img.jpg')
    expect(result.fallbackUsed).toBe(true)
    expect(result.imagePath).toContain('img.jpg')
  })

  // TC-043: apiKey='key' + Pexels成功 → fallbackUsed=false
  it('TC-043: Pexelsが成功した場合はfallbackUsed=falseを返す', async () => {
    const imageArrayBuffer = new ArrayBuffer(100)
    const fetchMock = vi.fn()
    // 1回目: Pexels search → photos あり
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        photos: [{ src: { portrait: 'http://img.example.com/test.jpg' } }],
      }),
    })
    // 2回目: 画像DL → OK
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      arrayBuffer: vi.fn().mockResolvedValue(imageArrayBuffer),
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchImage(['nature'], 'test-api-key', tmpDir, 'img.jpg')
    expect(result.fallbackUsed).toBe(false)
    expect(result.imagePath).toContain('img.jpg')
  })

  // TC-044: apiKey='key' + Pexels失敗 → fallbackUsed=true + warnログ
  it('TC-044: Pexelsが失敗した場合はfallbackにフォールバックする', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')))

    const result = await fetchImage(['nature'], 'test-api-key', tmpDir, 'img.jpg')
    expect(result.fallbackUsed).toBe(true)
    expect(result.imagePath).toContain('img.jpg')
  })
})

describe('fetchPexelsImage', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'svf-pexels-test-'))
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
    vi.unstubAllGlobals()
  })

  // TC-045: fetch status=429 → AssetFetchError (月次上限メッセージ)
  it('TC-045: Pexels APIが429を返した場合はAssetFetchError(月次上限)をthrowする', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 429 }))
    await expect(fetchPexelsImage(['nature'], 'key', tmpDir, 'img.jpg')).rejects.toThrow(AssetFetchError)
    await expect(fetchPexelsImage(['nature'], 'key', tmpDir, 'img.jpg')).rejects.toThrow('月次')
  })

  // TC-046: fetch status=401 → AssetFetchError 'HTTP 401'
  it('TC-046: Pexels APIが401を返した場合はAssetFetchError(HTTP 401)をthrowする', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }))
    await expect(fetchPexelsImage(['nature'], 'key', tmpDir, 'img.jpg')).rejects.toThrow(AssetFetchError)
    await expect(fetchPexelsImage(['nature'], 'key', tmpDir, 'img.jpg')).rejects.toThrow('HTTP 401')
  })

  // TC-047: photos=[] → AssetFetchError 'no photos found'
  it('TC-047: 検索結果が0件の場合はAssetFetchError(no photos found)をthrowする', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ photos: [] }),
    }))
    await expect(fetchPexelsImage(['nature'], 'key', tmpDir, 'img.jpg')).rejects.toThrow(AssetFetchError)
    await expect(fetchPexelsImage(['nature'], 'key', tmpDir, 'img.jpg')).rejects.toThrow('no photos found')
  })

  // TC-048: search OK + 画像DL 404 → AssetFetchError 'image download failed'
  it('TC-048: 画像ダウンロードが404を返した場合はAssetFetchError(image download failed)をthrowする', async () => {
    const fetchMock = vi.fn()
    // 1回目: search → OK
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        photos: [{ src: { portrait: 'http://img.example.com/test.jpg' } }],
      }),
    })
    // 2回目: 画像DL → 404
    fetchMock.mockResolvedValueOnce({ ok: false, status: 404 })
    vi.stubGlobal('fetch', fetchMock)

    let err: unknown
    try {
      await fetchPexelsImage(['nature'], 'key', tmpDir, 'img.jpg')
    } catch (e) {
      err = e
    }
    expect(err).toBeInstanceOf(AssetFetchError)
    expect((err as AssetFetchError).message).toContain('image download failed')
  })
})
