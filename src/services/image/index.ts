import { fetchPexelsImage } from './pexels'
import { fetchIrasutoyaImage } from './irasutoya'
import { copyFallbackImage } from './fallback'
import { logger } from '../../utils/logger'

export interface ImageResult {
  imagePath: string   // 絶対パス（jobDir 内）
  fallbackUsed: boolean
}

export async function fetchImage(
  keywords: string[],
  apiKey: string | null,
  jobDir: string,
  filename: string,
  keywordsJa?: string[],  // いらすとや用日本語キーワード (優先)
): Promise<ImageResult> {
  // 1st: いらすとや (日本語キーワードがあれば優先)
  if (keywordsJa && keywordsJa.length > 0) {
    try {
      const imagePath = await fetchIrasutoyaImage(keywordsJa, jobDir, filename)
      return { imagePath, fallbackUsed: false }
    } catch (err) {
      logger.warn(`irasutoya failed (${(err as Error).message}), trying Pexels`)
    }
  }

  // 2nd: Pexels (英語キーワード + APIキー)
  if (apiKey) {
    try {
      const imagePath = await fetchPexelsImage(keywords, apiKey, jobDir, filename)
      return { imagePath, fallbackUsed: false }
    } catch (err) {
      logger.warn(`Pexels failed (${(err as Error).message}), using fallback`)
    }
  }

  // 3rd: fallback
  const imagePath = copyFallbackImage(jobDir, filename)
  return { imagePath, fallbackUsed: true }
}
