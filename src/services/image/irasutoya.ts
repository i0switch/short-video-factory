// irasutoya.ts — いらすとや画像スクレイパー
// @fand/irasutoya の実装を参考に TypeScript + fetch で再実装
import fs from 'fs'
import path from 'path'
import * as cheerio from 'cheerio'
import { AssetFetchError } from '../../utils/errors'
import { logger } from '../../utils/logger'

// 検索: Blogger JSON Feed API（search?q= はJSレンダリングで使用不可）
const FEED_SEARCH_BASE = 'https://www.irasutoya.com/feeds/posts/default?alt=json&max-results=20&q='
const FETCH_TIMEOUT_MS = 8000  // 8秒でタイムアウト
const BLOCKED_CANDIDATE_TERMS = [
  'pop',
  'frame',
  'フレーム',
  '枠',
  'kouchou',
  '校長',
  'vr',
  'マスク',
  'mask',
  'computer',
  'パソコン',
  'saigai',
  '自宅待機',
  'aprilfool',
  'エイプリルフール',
  'yagi',
  'ヤギ',
  'kataomoi',
  '片思い',
  '恋愛',
  'renai',
  'love',
  'heart',
  'ハート',
  'ai_character',
  'ai_char',
  'ai_0887',
  '2024/05/ai_',
]

type SearchCandidate = {
  href: string
  text: string
}

function fetchWithTimeout(url: string, timeoutMs = FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timer))
}

export async function fetchIrasutoyaImage(
  keywords: string[],
  jobDir: string,
  filename: string,
): Promise<string> {
  const normalizedKeywords = [...new Set(
    keywords
      .map((keyword) => keyword.trim())
      .filter(Boolean)
      .filter((keyword) => /[ぁ-んァ-ヶ一-龠]/.test(keyword))
      .filter((keyword) => keyword.length <= 12),
  )]
  const candidates = new Map<string, SearchCandidate>()

  for (const query of normalizedKeywords.slice(0, 3)) {
    const feedUrl = `${FEED_SEARCH_BASE}${encodeURIComponent(query)}`
    logger.info(`  → irasutoya feed search: "${query}"`)

    const feedRes = await fetchWithTimeout(feedUrl)
    if (!feedRes.ok) {
      continue
    }

    // Blogger JSON Feed からエントリURLとタイトルを抽出
    const feedJson = await feedRes.json() as Record<string, unknown>
    const feed = feedJson['feed'] as Record<string, unknown> | undefined
    const entries = (feed?.['entry'] as Array<Record<string, unknown>> | undefined) ?? []

    for (const entry of entries) {
      const links = (entry['link'] as Array<Record<string, unknown>> | undefined) ?? []
      const altLink = links.find((l) => l['rel'] === 'alternate')
      const href = altLink?.['href'] as string | undefined
      if (!href) continue

      const title = (entry['title'] as Record<string, unknown> | undefined)?.['$t'] as string ?? ''
      const summary = (entry['summary'] as Record<string, unknown> | undefined)?.['$t'] as string ?? ''
      const text = `${title} ${summary}`

      if (!candidates.has(href)) {
        candidates.set(href, { href, text })
      }
    }
  }

  const entryCandidates = [...candidates.values()]
  if (entryCandidates.length === 0) {
    throw new AssetFetchError(`irasutoya: no results for "${normalizedKeywords.join(', ')}"`)
  }

  const scoreCandidate = (candidate: SearchCandidate): number => {
    const haystack = `${candidate.href} ${candidate.text}`.toLowerCase()
    if (BLOCKED_CANDIDATE_TERMS.some((term) => haystack.includes(term.toLowerCase()))) {
      return -100
    }
    return normalizedKeywords.reduce((score, keyword, index) => {
      const needle = keyword.toLowerCase()
      if (!needle) return score
      if (haystack.includes(needle)) return score + (normalizedKeywords.length - index) * 10
      const compactNeedle = needle.replace(/\s+/g, '')
      if (compactNeedle && haystack.includes(compactNeedle)) return score + (normalizedKeywords.length - index) * 6
      return score
    }, 0)
  }

  const rankedCandidates = entryCandidates
    .map((candidate) => ({ ...candidate, score: scoreCandidate(candidate) }))
    .sort((a, b) => b.score - a.score)

  if ((rankedCandidates[0]?.score ?? 0) <= 0) {
    throw new AssetFetchError(`irasutoya: no scored match for "${normalizedKeywords.join(', ')}"`)
  }

  const entryUrl = rankedCandidates[0].href
  logger.info(`  → irasutoya entry: ${entryUrl} (score=${rankedCandidates[0].score}, candidates=${rankedCandidates.length})`)

  // Step 4: 記事ページを取得して画像 URL を抽出
  const entryRes = await fetchWithTimeout(entryUrl)
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
  const imgRes = await fetchWithTimeout(imageUrl, 15000)
  if (!imgRes.ok) {
    throw new AssetFetchError(`irasutoya image download failed: HTTP ${imgRes.status}`)
  }
  const dest = path.join(jobDir, filename)
  fs.writeFileSync(dest, Buffer.from(await imgRes.arrayBuffer()))
  return dest
}
