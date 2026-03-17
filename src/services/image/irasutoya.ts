// irasutoya.ts — いらすとや画像スクレイパー
// @fand/irasutoya の実装を参考に TypeScript + fetch で再実装
import fs from 'fs'
import path from 'path'
import * as cheerio from 'cheerio'
import { AssetFetchError } from '../../utils/errors'
import { logger } from '../../utils/logger'

const SEARCH_BASE = 'https://www.irasutoya.com/search?q='

export async function fetchIrasutoyaImage(
  keywords: string[],
  jobDir: string,
  filename: string,
): Promise<string> {
  const query = keywords[0] ?? keywords.join(' ')
  const searchUrl = `${SEARCH_BASE}${encodeURIComponent(query)}`
  logger.info(`  → irasutoya search: "${query}"`)

  // Step 1: 検索結果ページを取得
  const searchRes = await fetch(searchUrl)
  if (!searchRes.ok) {
    throw new AssetFetchError(`irasutoya search failed: HTTP ${searchRes.status}`)
  }
  const searchHtml = await searchRes.text()

  // Step 2: .boxim > a のリンクを取得
  const $search = cheerio.load(searchHtml)
  const entryUrls: string[] = []
  $search('.boxim > a').each((_, el) => {
    const href = $search(el).attr('href')
    if (href) entryUrls.push(href)
  })

  if (entryUrls.length === 0) {
    throw new AssetFetchError(`irasutoya: no results for "${query}"`)
  }

  // Step 3: ランダムに1件選択
  const entryUrl = entryUrls[Math.floor(Math.random() * entryUrls.length)]
  logger.info(`  → irasutoya entry: ${entryUrl} (${entryUrls.length} hits)`)

  // Step 4: 記事ページを取得して画像 URL を抽出
  const entryRes = await fetch(entryUrl)
  if (!entryRes.ok) {
    throw new AssetFetchError(`irasutoya entry fetch failed: HTTP ${entryRes.status}`)
  }
  const entryHtml = await entryRes.text()
  const $entry = cheerio.load(entryHtml)
  const imageUrl = $entry('.entry .separator a').attr('href')
  if (!imageUrl) {
    throw new AssetFetchError(`irasutoya: image URL not found in entry page`)
  }

  logger.info(`  → irasutoya image: ${imageUrl}`)

  // Step 5: 画像をダウンロード
  const imgRes = await fetch(imageUrl)
  if (!imgRes.ok) {
    throw new AssetFetchError(`irasutoya image download failed: HTTP ${imgRes.status}`)
  }
  const dest = path.join(jobDir, filename)
  fs.writeFileSync(dest, Buffer.from(await imgRes.arrayBuffer()))
  return dest
}
