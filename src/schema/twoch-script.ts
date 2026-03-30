import { z } from 'zod'

export const TwoChEmotionSchema = z.enum(['neutral', 'anger', 'confusion', 'shock', 'happy', 'sad'])

export const TwoChEffectSchema = z.enum(['none', 'concentration_lines', 'vortex', 'lightning', 'sparkle', 'rain', 'shake'])

export const TwoChSceneSchema = z.object({
  speaker: z.string().min(1),           // 'narrator', 'character1', 'character2', etc.
  text: z.string().min(1).max(40),      // displayed caption (20 chars recommended)
  narration: z.string().max(100).optional(), // TTS text (defaults to text if omitted)
  emotion: TwoChEmotionSchema,
  effect: TwoChEffectSchema.default('none'),
  imageKeywords: z.array(z.string()).min(1).max(5),
  imageKeywordsEn: z.array(z.string()).min(1).max(5),
  // Optional: frame-accurate control for reproduction work
  durationFrames: z.number().int().min(1).max(60 * 60).optional(),
  // Optional: prop keywords for additional scene objects (max 2 props)
  // Each entry is a keyword array for irasutoya search (e.g. [["ケーキ"], ["フォーク"]])
  // If omitted, props are auto-inferred from text and imageKeywords
  propKeywords: z.array(z.array(z.string()).min(1).max(5)).max(2).optional(),
  // Optional: custom asset paths (relative to project root) for reproduction work
  backgroundSrc: z.string().optional(),   // background image path (e.g. "assets/nicocommons/bg_kitchen.png")
  characterSrc: z.string().optional(),    // character standing image path (e.g. "assets/nicocommons/char_male_suit.png")
})

export const TwoChEpisodeSchema = z.object({
  title: z.string().max(30).optional(),  // episode title (for multi-episode)
  scenes: z.array(TwoChSceneSchema).min(3).max(50),
})

export const TwoChMetaSchema = z.object({
  width: z.number().int().min(1).optional(),
  height: z.number().int().min(1).optional(),
  fps: z.number().min(1).max(120).optional(),
  // Rendering budget controls (optional; defaults keep existing behavior)
  maxDurationSec: z.number().min(1).max(300).optional(),
  maxDurationFrames: z.number().int().min(1).max(60 * 60 * 2).optional(),
  minSceneFrames: z.number().int().min(1).max(60 * 10).optional(),
  maxSceneFrames: z.number().int().min(1).max(60 * 10).optional(),
  episodeTitleFrames: z.number().int().min(0).max(60 * 10).optional(),
  outroFrames: z.number().int().min(0).max(60 * 10).optional(),
  // Helps match reference audio specs in post-mix step
  audioSampleRate: z.number().int().min(8000).max(192000).optional(),
}).optional()

export const TwoChScriptSchema = z.object({
  format: z.literal('2ch'),
  videoTitle: z.string().min(1).max(40),
  // TitleBar controls (optional)
  seriesTitle: z.string().max(40).optional(),
  titleColor: z.string().max(30).optional(),
  captionColor: z.string().max(30).optional(),
  captionFadeInFrames: z.number().int().min(0).max(60 * 2).optional(),
  showEpisodeTitleCards: z.boolean().optional(),
  meta: TwoChMetaSchema,
  episodes: z.array(TwoChEpisodeSchema).min(1).max(5),
  // Allow disabling outro entirely for reproduction.
  outro: z.string().max(30).optional(),
})

export type TwoChScript = z.infer<typeof TwoChScriptSchema>
export type TwoChEpisode = z.infer<typeof TwoChEpisodeSchema>
export type TwoChScene = z.infer<typeof TwoChSceneSchema>
export type TwoChEmotion = z.infer<typeof TwoChEmotionSchema>
export type TwoChEffect = z.infer<typeof TwoChEffectSchema>
