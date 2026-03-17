import fs from 'fs'
import path from 'path'
import { AssetFetchError } from '../../utils/errors'

const PEXELS_BASE = 'https://api.pexels.com/v1'

export async function fetchPexelsImage(
  keywords: string[],
  apiKey: string,
  jobDir: string,
  filename: string,
): Promise<string> {
  const query = encodeURIComponent(keywords.join(' '))
  const searchUrl = `${PEXELS_BASE}/search?query=${query}&orientation=portrait&per_page=1`

  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: apiKey },
  })
  if (!searchRes.ok) {
    if (searchRes.status === 429) {
      throw new AssetFetchError(
        `Pexels API の月次リクエスト上限に達しました。\n` +
        `PEXELS_API_KEY を .env からコメントアウトすると fallback 画像が使われます。`
      )
    }
    throw new AssetFetchError(`Pexels search failed: HTTP ${searchRes.status}`)
  }

  const data = await searchRes.json() as { photos: Array<{ src: { portrait: string } }> }
  if (data.photos.length === 0) {
    throw new AssetFetchError(`Pexels: no photos found for "${keywords.join(', ')}"`)
  }

  const imageUrl = data.photos[0].src.portrait
  const imgRes = await fetch(imageUrl)
  if (!imgRes.ok) {
    throw new AssetFetchError(`Pexels image download failed: HTTP ${imgRes.status}`)
  }

  const dest = path.join(jobDir, filename)
  fs.writeFileSync(dest, Buffer.from(await imgRes.arrayBuffer()))
  return dest
}
