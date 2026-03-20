import path from 'path'
import { fetchImage } from '../image/index'
import type { AssetManifest } from '../../schema/template-engine'
import { logger } from '../../utils/logger'

export interface AssetRequest {
  beat_id: string
  asset_needs: string[]
  imageKeywords: string[]
  imageKeywordsEn: string[]
}

export interface ResolvedAsset {
  asset_id: string
  beat_id: string
  local_path: string
  source_name: string
  source_url: string
  license_notes: string
  attribution_text: string
  preprocessing_steps: string[]
  fallbackUsed: boolean
}

export async function resolveAssets(
  requests: AssetRequest[],
  jobDir: string,
  pexelsApiKey: string | null,
): Promise<{ resolved: ResolvedAsset[]; unresolved: AssetRequest[] }> {
  const resolved: ResolvedAsset[] = []
  const unresolved: AssetRequest[] = []

  for (const req of requests) {
    try {
      const filename = `asset_${req.beat_id}.png`
      const result = await fetchImage(
        req.imageKeywordsEn,
        pexelsApiKey,
        jobDir,
        filename,
        req.imageKeywords,
      )

      resolved.push({
        asset_id: `a_${req.beat_id}_0`,
        beat_id: req.beat_id,
        local_path: result.imagePath,
        source_name: result.fallbackUsed ? 'fallback' : 'fetched',
        source_url: '',
        license_notes: result.fallbackUsed ? 'fallback generic image' : 'API sourced',
        attribution_text: '',
        preprocessing_steps: [],
        fallbackUsed: result.fallbackUsed,
      })
    } catch (err) {
      logger.warn(`Asset resolve failed for beat ${req.beat_id}: ${(err as Error).message}`)
      unresolved.push(req)
    }
  }

  return { resolved, unresolved }
}

export function buildAssetManifest(resolved: ResolvedAsset[]): AssetManifest {
  return {
    assets: resolved.map((r) => ({
      id: r.asset_id,
      type: 'image' as const,
      src: r.local_path,
      keywords: [],
    })),
  }
}

export function buildAssetRequests(unresolved: AssetRequest[]): object {
  return {
    pending: unresolved.map((req) => ({
      beat_id: req.beat_id,
      asset_needs: req.asset_needs,
      imageKeywords: req.imageKeywords,
      imageKeywordsEn: req.imageKeywordsEn,
    })),
  }
}
