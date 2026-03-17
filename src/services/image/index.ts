import { fetchPexelsImage } from './pexels'
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
): Promise<ImageResult> {
  if (apiKey) {
    try {
      const imagePath = await fetchPexelsImage(keywords, apiKey, jobDir, filename)
      return { imagePath, fallbackUsed: false }
    } catch (err) {
      logger.warn(`Pexels failed (${(err as Error).message}), using fallback`)
    }
  }
  const imagePath = copyFallbackImage(jobDir, filename)
  return { imagePath, fallbackUsed: true }
}
