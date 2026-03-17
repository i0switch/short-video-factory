import { z } from 'zod'

export const RenderSceneSchema = z.object({
  type: z.enum(['title', 'ranking', 'ending']),
  rank: z.number().optional(),
  // タイトルシーン用: 行ごとの色情報
  titleLines: z.array(z.object({ text: z.string(), color: z.string() })).optional(),
  // ランキングシーン用
  topic: z.string().optional(),    // サブシーンAのトピックテキスト
  title: z.string(),               // 後方互換（=topic と同値でも可）
  comment1: z.string().optional(), // サブシーンBの青枠コメント
  comment2: z.string().optional(), // サブシーンCの赤背景コメント
  // サブシーンのタイミング（ランキングのみ）
  subSceneTiming: z.object({
    aEndFrame: z.number().int(),
    bEndFrame: z.number().int(),
  }).optional(),
  // 共通
  imagePath: z.string(),
  audioPath: z.string().nullable(),
  audioDurationSec: z.number().nullable(),
  durationInFrames: z.number().int().positive(),
  fallbackUsed: z.boolean(),
})

export const RenderPlanSchema = z.object({
  videoTitle: z.string(),
  fps: z.number().int().positive(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  totalDurationInFrames: z.number().int().positive(),
  scenes: z.array(RenderSceneSchema).min(2),
})

export type RenderPlan = z.infer<typeof RenderPlanSchema>
export type RenderScene = z.infer<typeof RenderSceneSchema>
