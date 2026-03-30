import { z } from 'zod'

export const ReconstructionSpeakerSchema = z.enum(['narrator', 'character1', 'character2'])

export const ReconstructionCaptionSchema = z.object({
  text: z.string().default(''),
  speaker: ReconstructionSpeakerSchema,
  color: z.string().default('#FFFFFF'),
  x: z.number().default(0),
  y: z.number().default(0),
  width: z.number().default(1040),
  align: z.enum(['left', 'center', 'right']).default('left'),
})

export const ReconstructionCameraSchema = z.object({
  x: z.number().default(0),
  y: z.number().default(0),
  scale: z.number().default(1),
  rotate: z.number().default(0),
  opacity: z.number().min(0).max(1).default(1),
})

export const ReconstructionBackgroundSchema = z.object({
  kind: z.string().default('neutral'),
  tone: z.string().default('neutral'),
  src: z.string().optional(),
})

export const ReconstructionCharacterSchema = z.object({
  kind: z.string().default('none'),
  emotion: z.string().default('neutral'),
  x: z.number().default(0),
  y: z.number().default(0),
  scale: z.number().default(1),
  opacity: z.number().min(0).max(1).default(1),
  src: z.string().optional(),
})

export const ReconstructionShotSchema = z.object({
  id: z.string().min(1),
  startFrame: z.number().int().min(0),
  endFrame: z.number().int().min(0),
  storyUnitIds: z.array(z.string()).default([]),
  background: ReconstructionBackgroundSchema,
  character: ReconstructionCharacterSchema,
  caption: ReconstructionCaptionSchema,
  camera: ReconstructionCameraSchema.default({ x: 0, y: 0, scale: 1, rotate: 0, opacity: 1 }),
  effect: z.enum(['none', 'shake', 'sparkle', 'lightning', 'vortex', 'concentration_lines', 'rain']).default('none'),
  overlay: z.object({
    titleVisible: z.boolean().default(true),
    subtitle: z.string().default(''),
  }).default({ titleVisible: true, subtitle: '' }),
})

export const ReconstructionCueSchema = z.object({
  id: z.string().min(1),
  frame: z.number().int().min(0),
  type: z.string().min(1),
  payload: z.record(z.unknown()).default({}),
})

export const ReconstructionStoryUnitSchema = z.object({
  id: z.string().min(1),
  speaker: ReconstructionSpeakerSchema,
  text: z.string().min(1),
  narration: z.string().optional(),
  startFrame: z.number().int().min(0),
  endFrame: z.number().int().min(0),
  shotId: z.string().optional(),
})

export const ReconstructionStorySchema = z.object({
  videoId: z.string().min(1),
  seriesTitle: z.string().min(1),
  episodeTitle: z.string().min(1),
  fps: z.number().min(1).default(60),
  width: z.number().int().min(1).default(1080),
  height: z.number().int().min(1).default(1920),
  units: z.array(ReconstructionStoryUnitSchema).min(1),
})

export const ReconstructionTimelineSchema = z.object({
  videoId: z.string().min(1),
  fps: z.number().min(1).default(60),
  width: z.number().int().min(1).default(1080),
  height: z.number().int().min(1).default(1920),
  totalFrames: z.number().int().min(1),
  seriesTitle: z.string().min(1),
  episodeTitle: z.string().min(1),
  shots: z.array(ReconstructionShotSchema).min(1),
  cues: z.array(ReconstructionCueSchema).default([]),
})

export const ReconstructionAudioEntrySchema = z.object({
  unitId: z.string().min(1),
  speaker: ReconstructionSpeakerSchema,
  text: z.string().min(1),
  narration: z.string().optional(),
  src: z.string().default(''),
  durationSec: z.number().min(0).default(0),
  startFrame: z.number().int().min(0).default(0),
  endFrame: z.number().int().min(0).default(0),
  gainDb: z.number().default(0),
})

export const ReconstructionSeSchema = z.object({
  id: z.string().min(1),
  frame: z.number().int().min(0),
  durationFrames: z.number().int().min(1).optional(),
  src: z.string().min(1),
  volume: z.number().min(0).max(1).default(1),
})

export const ReconstructionAudioSchema = z.object({
  ttsSpeed: z.number().min(0.5).max(3).default(1),
  sampleRate: z.number().int().min(8000).max(192000).default(44100),
  entries: z.array(ReconstructionAudioEntrySchema).default([]),
  se: z.array(ReconstructionSeSchema).default([]),
  bgm: z.object({
    src: z.string().default(''),
    volume: z.number().min(0).max(1).default(0.1),
    startFrame: z.number().int().min(0).default(0),
    endFrame: z.number().int().min(0).default(0),
  }).default({ src: '', volume: 0.1, startFrame: 0, endFrame: 0 }),
})

export const ReconstructionAssetSchema = z.object({
  kind: z.string().min(1),
  src: z.string().min(1),
  origin: z.string().default('self'),
  note: z.string().default(''),
})

export const ReconstructionAssetsManifestSchema = z.object({
  videoId: z.string().min(1),
  sourceVideoAssets: z.array(ReconstructionAssetSchema).default([]),
  generatedAssets: z.array(ReconstructionAssetSchema).default([]),
  independentAssets: z.array(ReconstructionAssetSchema).default([]),
  contaminationFree: z.boolean().default(true),
})

export type ReconstructionSpeaker = z.infer<typeof ReconstructionSpeakerSchema>
export type ReconstructionCaption = z.infer<typeof ReconstructionCaptionSchema>
export type ReconstructionCamera = z.infer<typeof ReconstructionCameraSchema>
export type ReconstructionBackground = z.infer<typeof ReconstructionBackgroundSchema>
export type ReconstructionCharacter = z.infer<typeof ReconstructionCharacterSchema>
export type ReconstructionShot = z.infer<typeof ReconstructionShotSchema>
export type ReconstructionCue = z.infer<typeof ReconstructionCueSchema>
export type ReconstructionStoryUnit = z.infer<typeof ReconstructionStoryUnitSchema>
export type ReconstructionStory = z.infer<typeof ReconstructionStorySchema>
export type ReconstructionTimeline = z.infer<typeof ReconstructionTimelineSchema>
export type ReconstructionAudioEntry = z.infer<typeof ReconstructionAudioEntrySchema>
export type ReconstructionSe = z.infer<typeof ReconstructionSeSchema>
export type ReconstructionAudio = z.infer<typeof ReconstructionAudioSchema>
export type ReconstructionAssetsManifest = z.infer<typeof ReconstructionAssetsManifestSchema>
