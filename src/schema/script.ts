import { z } from 'zod'

export const RankingItemSchema = z.object({
  rank: z.number().int().positive(),
  topic: z.string().min(1).max(24),
  comment1: z.string().min(1).max(50),
  comment2: z.string().min(1).max(50),
  body: z.string().min(1).max(100),
  imageKeywords: z.array(z.string()).min(1).max(5),
  imageKeywordsEn: z.array(z.string()).min(1).max(5),
})

export const ScriptSchema = z.object({
  videoTitle: z.string().min(1).max(40),
  intro: z.string().min(1).max(40),
  items: z.array(RankingItemSchema)
    .min(3).max(10)
    .refine(
      items => new Set(items.map(i => i.rank)).size === items.length,
      { message: 'rank must be unique' }
    )
    .refine(
      items => items.every((item, i, arr) =>
        i === 0 || item.rank < arr[i - 1].rank
      ),
      { message: 'items must be in descending rank order' }
    ),
  outro: z.string().min(1).max(30),
})

export type Script = z.infer<typeof ScriptSchema>
export type RankingItem = z.infer<typeof RankingItemSchema>

import { TwoChScriptSchema } from './twoch-script'

export const UnifiedScriptSchema = z.discriminatedUnion('format', [
  ScriptSchema.extend({ format: z.literal('ranking') }),
  TwoChScriptSchema,
])

export type UnifiedScript = z.infer<typeof UnifiedScriptSchema>
