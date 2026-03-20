import { z } from 'zod'

// ══════════════════════════════════════════════════════════════════
// Task 1-3: New 4-layer enums & schemas (Story → Beat → Shot → Cue)
// ══════════════════════════════════════════════════════════════════

export const SpeakerEnum = z.enum(['narrator', 'character1', 'character2'])
export type Speaker = z.infer<typeof SpeakerEnum>

export const EmotionEnum = z.enum(['neutral', 'anger', 'confusion', 'shock', 'happy', 'sad'])
export type Emotion = z.infer<typeof EmotionEnum>

export const EffectEnum = z.enum(['none', 'concentration_lines', 'vortex', 'lightning', 'sparkle', 'rain', 'shake'])
export type Effect = z.infer<typeof EffectEnum>

export const BeatRoleEnum = z.enum([
  'intro', 'situation', 'incident', 'reaction',
  'development', 'climax', 'punchline', 'aftermath', 'outro',
])
export type BeatRole = z.infer<typeof BeatRoleEnum>

export const ShotTemplateIdEnum = z.enum([
  'intro_title', 'narration_plain', 'reaction_closeup', 'object_reveal',
  'explanation_cut', 'two_person_dialog', 'punchline_freeze', 'aftermath_caption',
  'group_scene', 'episode_title_card',
])
export type ShotTemplateId = z.infer<typeof ShotTemplateIdEnum>

export const CueTemplateIdEnum = z.enum([
  'caption_in_fast', 'caption_replace_snap', 'flash_short',
  'shake_small', 'shake_impact', 'concentration_lines_on',
  'vortex_on', 'sparkle_on', 'lightning_flash', 'rain_on',
  'se_hit', 'se_reveal', 'bgm_duck_short', 'manga_symbol_pop',
])
export type CueTemplateId = z.infer<typeof CueTemplateIdEnum>

// ── New core schemas ───────────────────────────────────────────────

export const StoryUnitSchema = z.object({
  id: z.string().min(1),
  speaker: SpeakerEnum,
  text: z.string().min(1),
  narration: z.string().optional(),
  emotion: EmotionEnum,
  startFrame: z.number().int().min(0),
  endFrame: z.number().int().min(1),
})
export type StoryUnit = z.infer<typeof StoryUnitSchema>

export const BeatSchema = z.object({
  beat_id: z.string().min(1),
  role: BeatRoleEnum,
  text: z.string().min(1),
  speaker: SpeakerEnum,
  emotion: EmotionEnum,
  shot_template: ShotTemplateIdEnum,
  cue_templates: z.array(CueTemplateIdEnum),
  asset_needs: z.array(z.string()),
  estimated_duration_frames: z.number().int().min(1),
  story_unit_ids: z.array(z.string()).optional(),
})
export type Beat = z.infer<typeof BeatSchema>

export const NewShotTemplateSchema = z.object({
  id: ShotTemplateIdEnum,
  background: z.object({
    type: z.enum(['scene', 'emotion', 'effect']),
    src: z.string().optional(),
  }),
  character: z.object({
    position: z.enum(['center', 'left', 'right', 'none']),
    scale: z.number().min(0).max(3),
    framing: z.enum(['bust', 'full', 'closeup', 'none']),
  }),
  caption: z.object({
    position: z.enum(['top-left', 'center', 'bottom-center']),
    maxCharsPerLine: z.number().int().min(1),
    fontSize: z.number().int().min(1),
  }),
  camera: z.object({
    zoomFrom: z.number().min(0),
    zoomTo: z.number().min(0),
  }).optional(),
})
export type ShotTemplateDef = z.infer<typeof NewShotTemplateSchema>

export const NewCueTemplateSchema = z.object({
  id: CueTemplateIdEnum,
  type: z.string().min(1),
  startFrame: z.number().int().min(0),
  endFrame: z.number().int().min(0),
  params: z.record(z.unknown()).optional(),
})
export type CueTemplateDef = z.infer<typeof NewCueTemplateSchema>

export const TimelineEntrySchema = z.object({
  beat_id: z.string().min(1),
  startFrame: z.number().int().min(0),
  endFrame: z.number().int().min(1),
  shot: NewShotTemplateSchema,
  cues: z.array(NewCueTemplateSchema),
  audio: z.object({
    voiceSrc: z.string().optional(),
    seSrc: z.string().optional(),
    bgmDuck: z.boolean().optional(),
  }).optional(),
  assets: z.record(z.string()).optional(),
})
export type TimelineEntry = z.infer<typeof TimelineEntrySchema>

export const StoryJsonSchema = z.object({
  units: z.array(StoryUnitSchema).min(1),
})
export type StoryJson = z.infer<typeof StoryJsonSchema>

export const BeatsJsonSchema = z.object({
  beats: z.array(BeatSchema).min(1),
})
export type BeatsJson = z.infer<typeof BeatsJsonSchema>

export const TimelineJsonSchema = z.object({
  entries: z.array(TimelineEntrySchema).min(1),
  totalFrames: z.number().int().min(1),
})
export type TimelineJson = z.infer<typeof TimelineJsonSchema>

export const AudioJsonSchema = z.object({
  segments: z.array(z.object({
    type: z.enum(['voice', 'se', 'bgm']),
    src: z.string(),
    startFrame: z.number().int().min(0),
    endFrame: z.number().int().min(0),
    volume: z.number().min(0).max(1).optional(),
  })),
})
export type AudioJson = z.infer<typeof AudioJsonSchema>

export const AssetManifestEntrySchema = z.object({
  id: z.string().min(1),
  type: z.enum(['image', 'audio', 'video']),
  src: z.string().min(1),
  keywords: z.array(z.string()).optional(),
})
export type AssetManifestEntry = z.infer<typeof AssetManifestEntrySchema>

export const AssetManifestSchema = z.object({
  assets: z.array(AssetManifestEntrySchema),
})
export type AssetManifest = z.infer<typeof AssetManifestSchema>

export const NewTemplateManifestSchema = z.object({
  shots: z.record(ShotTemplateIdEnum, NewShotTemplateSchema),
  cueDefaults: z.record(CueTemplateIdEnum, z.object({
    durationFrames: z.number().int().min(1),
  })),
})
export type NewTemplateManifest = z.infer<typeof NewTemplateManifestSchema>

// ══════════════════════════════════════════════════════════════════
// Legacy schemas (pre-existing, kept for backward compatibility)
// ══════════════════════════════════════════════════════════════════

export const TemplateSpeakerSchema = z.enum(['narrator', 'character1', 'character2'])
export const TemplateEmotionSchema = z.enum(['neutral', 'anger', 'confusion', 'shock', 'happy', 'sad'])
export const TemplateShotTemplateSchema = z.enum([
  'intro_title',
  'narration_plain',
  'dialogue_two_person',
  'reaction_closeup',
  'punchline_freeze',
  'aftermath_caption',
])
export const TemplateCueTemplateSchema = z.enum([
  'title_hold',
  'caption_in_fast',
  'caption_replace_snap',
  'flash_short',
  'shake_small',
  'se_hit',
  'bgm_duck_short',
  'freeze_hold',
])

export const TemplateStoryUnitSchema = z.object({
  id: z.string().min(1),
  speaker: TemplateSpeakerSchema,
  text: z.string().min(1),
  narration: z.string().min(1),
  emotion: TemplateEmotionSchema,
  startFrame: z.number().int().min(0),
  endFrame: z.number().int().min(1),
  beatId: z.string().min(1),
})

export const TemplateBeatSchema = z.object({
  id: z.string().min(1),
  role: z.string().min(1),
  summary: z.string().min(1),
  speaker: TemplateSpeakerSchema,
  emotion: TemplateEmotionSchema,
  shotTemplate: TemplateShotTemplateSchema,
  cueTemplates: z.array(TemplateCueTemplateSchema).default([]),
  weight: z.number().positive(),
  startFrame: z.number().int().min(0).optional(),
  endFrame: z.number().int().min(1).optional(),
  storyUnitIds: z.array(z.string()).default([]),
  assetNeeds: z.array(z.string()).default([]),
})

export const TemplateShotCharacterSchema = z.object({
  role: TemplateSpeakerSchema,
  x: z.number(),
  y: z.number(),
  scale: z.number(),
  emotion: TemplateEmotionSchema,
})

export const TemplateCueSchema = z.object({
  id: z.string().min(1),
  beatId: z.string().min(1).optional(),
  frame: z.number().int().min(0),
  type: z.string().min(1),
  durationFrames: z.number().int().min(1).optional(),
  payload: z.record(z.unknown()).default({}),
})

export const TemplateShotSchema = z.object({
  id: z.string().min(1),
  beatId: z.string().min(1),
  startFrame: z.number().int().min(0),
  endFrame: z.number().int().min(1),
  template: TemplateShotTemplateSchema,
  background: z.object({
    motif: z.string().min(1),
    tone: z.string().min(1),
    pattern: z.string().min(1),
  }),
  caption: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number(),
    align: z.enum(['left', 'center', 'right']),
    fontSize: z.number(),
    color: z.string(),
  }),
  camera: z.object({
    x: z.number(),
    y: z.number(),
    scale: z.number(),
    rotate: z.number(),
    opacity: z.number(),
  }),
  effect: z.enum(['none', 'concentration_lines', 'vortex', 'lightning', 'sparkle', 'rain', 'shake']),
  characters: z.array(TemplateShotCharacterSchema).default([]),
  storyUnitIds: z.array(z.string()).default([]),
  cues: z.array(TemplateCueSchema).default([]),
})

export const TemplateStorySchema = z.object({
  videoId: z.string().min(1),
  seriesTitle: z.string().min(1),
  episodeTitle: z.string().min(1),
  fps: z.number().min(1),
  width: z.number().int().min(1),
  height: z.number().int().min(1),
  units: z.array(TemplateStoryUnitSchema).min(1),
})

export const TemplateBeatsSchema = z.object({
  videoId: z.string().min(1),
  fps: z.number().min(1),
  width: z.number().int().min(1),
  height: z.number().int().min(1),
  totalFrames: z.number().int().min(1),
  seriesTitle: z.string().min(1),
  episodeTitle: z.string().min(1),
  beats: z.array(TemplateBeatSchema).min(1),
})

export const TemplateTimelineSchema = z.object({
  videoId: z.string().min(1),
  fps: z.number().min(1),
  width: z.number().int().min(1),
  height: z.number().int().min(1),
  totalFrames: z.number().int().min(1),
  seriesTitle: z.string().min(1),
  episodeTitle: z.string().min(1),
  shots: z.array(TemplateShotSchema).min(1),
  cues: z.array(TemplateCueSchema).default([]),
})

export const TemplateAudioEntrySchema = z.object({
  unitId: z.string().min(1),
  speaker: TemplateSpeakerSchema,
  text: z.string().min(1),
  narration: z.string().min(1),
  src: z.string().min(1),
  startFrame: z.number().int().min(0),
  endFrame: z.number().int().min(1),
  gainDb: z.number().optional(),
})

export const TemplateAudioSeSchema = z.object({
  id: z.string().min(1),
  frame: z.number().int().min(0),
  durationFrames: z.number().int().min(1).optional(),
  src: z.string().min(1),
  volume: z.number().min(0).max(1).optional(),
})

export const TemplateAudioBgmSchema = z.object({
  src: z.string().min(1),
  volume: z.number().min(0).max(1),
  startFrame: z.number().int().min(0),
  endFrame: z.number().int().min(1),
})

export const TemplateAudioSchema = z.object({
  videoId: z.string().min(1),
  ttsSpeed: z.number().min(0.1),
  sampleRate: z.number().int().min(8000),
  entries: z.array(TemplateAudioEntrySchema).default([]),
  se: z.array(TemplateAudioSeSchema).default([]),
  bgm: TemplateAudioBgmSchema,
})

export const TemplateAssetEntrySchema = z.object({
  asset_id: z.string().min(1),
  source_name: z.string().min(1),
  source_url: z.string().optional().default(''),
  local_path: z.string().min(1),
  license_notes: z.string().min(1),
  attribution_text: z.string().default(''),
  usage_count_in_video: z.number().int().min(0),
  allowed_for_template_distribution: z.boolean(),
  beat_ids: z.array(z.string()).default([]),
  preprocessing_steps: z.array(z.string()).default([]),
})

export const TemplateAssetRequestSchema = z.object({
  request_id: z.string().min(1),
  source_type: z.enum(['pexels', 'irasutoya', 'other']),
  query: z.string().min(1),
  beat_ids: z.array(z.string()).default([]),
  rationale: z.string().min(1),
  notes: z.array(z.string()).default([]),
})

export const TemplateAssetRequestsSchema = z.object({
  videoId: z.string().min(1),
  requests: z.array(TemplateAssetRequestSchema).default([]),
  notes: z.array(z.string()).default([]),
})

export const TemplateAssetsManifestSchema = z.object({
  videoId: z.string().min(1),
  sourceVideoAssets: z.array(TemplateAssetEntrySchema).default([]),
  generatedAssets: z.array(TemplateAssetEntrySchema).default([]),
  independentAssets: z.array(TemplateAssetEntrySchema).default([]),
  contaminationFree: z.boolean().default(true),
})

export const TemplateManifestSchema = z.object({
  videoId: z.string().min(1),
  family: z.string().min(1),
  referenceVideos: z.array(z.object({
    videoId: z.string().min(1),
    title: z.string().min(1),
    durationFrames: z.number().int().min(1),
    fps: z.number().min(1),
    pacing: z.string().min(1),
    visualDensity: z.string().min(1),
    notes: z.string().min(1),
  })).min(1),
  shotTemplates: z.array(z.object({
    id: TemplateShotTemplateSchema,
    summary: z.string().min(1),
    useCases: z.array(z.string()).min(1),
  })).min(1),
  cueTemplates: z.array(z.object({
    id: TemplateCueTemplateSchema,
    summary: z.string().min(1),
  })).min(1),
  stylePresets: z.object({
    titleBand: z.object({
      top: z.number(),
      height: z.number(),
      titleColor: z.string(),
      subtitleColor: z.string(),
    }),
    caption: z.object({
      fontColor: z.string(),
      strokeColor: z.string(),
      top: z.number(),
      width: z.number(),
    }),
    safeArea: z.object({
      top: z.number(),
      bottom: z.number(),
      left: z.number(),
      right: z.number(),
    }),
  }),
  assetBuckets: z.object({
    visual: z.array(z.string()).default([]),
    audio: z.array(z.string()).default([]),
  }),
  notes: z.array(z.string()).default([]),
})

export const TemplatePackSchema = z.object({
  story: TemplateStorySchema,
  beats: TemplateBeatsSchema,
  timeline: TemplateTimelineSchema,
  audio: TemplateAudioSchema,
  assetManifest: TemplateAssetsManifestSchema,
  templateManifest: TemplateManifestSchema,
  assetRequests: TemplateAssetRequestsSchema.optional(),
})

export type TemplateSpeaker = z.infer<typeof TemplateSpeakerSchema>
export type TemplateEmotion = z.infer<typeof TemplateEmotionSchema>
export type TemplateShotTemplate = z.infer<typeof TemplateShotTemplateSchema>
export type TemplateCueTemplate = z.infer<typeof TemplateCueTemplateSchema>
export type TemplateStoryUnit = z.infer<typeof TemplateStoryUnitSchema>
export type TemplateBeat = z.infer<typeof TemplateBeatSchema>
export type TemplateShot = z.infer<typeof TemplateShotSchema>
export type TemplateCue = z.infer<typeof TemplateCueSchema>
export type TemplateStory = z.infer<typeof TemplateStorySchema>
export type TemplateBeats = z.infer<typeof TemplateBeatsSchema>
export type TemplateTimeline = z.infer<typeof TemplateTimelineSchema>
export type TemplateAudioEntry = z.infer<typeof TemplateAudioEntrySchema>
export type TemplateAudioSe = z.infer<typeof TemplateAudioSeSchema>
export type TemplateAudioBgm = z.infer<typeof TemplateAudioBgmSchema>
export type TemplateAudio = z.infer<typeof TemplateAudioSchema>
export type TemplateAssetEntry = z.infer<typeof TemplateAssetEntrySchema>
export type TemplateAssetRequest = z.infer<typeof TemplateAssetRequestSchema>
export type TemplateAssetRequests = z.infer<typeof TemplateAssetRequestsSchema>
export type TemplateAssetsManifest = z.infer<typeof TemplateAssetsManifestSchema>
export type TemplateManifest = z.infer<typeof TemplateManifestSchema>
export type TemplatePack = z.infer<typeof TemplatePackSchema>
