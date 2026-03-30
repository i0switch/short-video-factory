// v4-layers.ts — 5-layer template engine definitions (spec v4 Section 4-9)

// ============================================================
// Layer 1: beat_template — 物語上の役割
// ============================================================
export type BeatRole =
  | 'intro'
  | 'setup'
  | 'incident'
  | 'reaction'
  | 'escalation'
  | 'climax'
  | 'aftermath'
  | 'outro'

// ============================================================
// Layer 2: shot_template — このカットで何を見せるか
// ============================================================
export const SHOT_TEMPLATE_IDS = [
  'classroom_intro',
  'teacher_statement',
  'student_reaction',
  'object_reveal',
  'duo_dialogue',
  'group_dialogue',
  'punchline_freeze',
  'aftermath_wide',
  'caption_only',
] as const

export type ShotTemplateId = typeof SHOT_TEMPLATE_IDS[number]

export interface ShotTemplate {
  id: ShotTemplateId
  description: string
  requiredElements: ('character' | 'background' | 'prop' | 'text_only')[]
  minCharacterCount: number
  maxCharacterCount: number
  propRequired: boolean
  preferredBeatRoles: BeatRole[]
}

export const SHOT_TEMPLATES: ShotTemplate[] = [
  {
    id: 'classroom_intro',
    description: '引き構図で場面を見せる導入カット',
    requiredElements: ['background', 'character'],
    minCharacterCount: 0,
    maxCharacterCount: 3,
    propRequired: false,
    preferredBeatRoles: ['intro', 'setup'],
  },
  {
    id: 'teacher_statement',
    description: 'ナレーターが語る説明カット',
    requiredElements: ['background', 'character'],
    minCharacterCount: 1,
    maxCharacterCount: 1,
    propRequired: false,
    preferredBeatRoles: ['setup', 'incident'],
  },
  {
    id: 'student_reaction',
    description: 'リアクション寄りカット',
    requiredElements: ['background', 'character'],
    minCharacterCount: 1,
    maxCharacterCount: 2,
    propRequired: false,
    preferredBeatRoles: ['reaction', 'incident'],
  },
  {
    id: 'object_reveal',
    description: '物や小道具を見せるインサートカット',
    requiredElements: ['background', 'prop'],
    minCharacterCount: 0,
    maxCharacterCount: 1,
    propRequired: true,
    preferredBeatRoles: ['incident', 'escalation'],
  },
  {
    id: 'duo_dialogue',
    description: '2人の掛け合いカット',
    requiredElements: ['background', 'character'],
    minCharacterCount: 2,
    maxCharacterCount: 2,
    propRequired: false,
    preferredBeatRoles: ['setup', 'escalation', 'reaction'],
  },
  {
    id: 'group_dialogue',
    description: '3人以上の会話・群衆カット',
    requiredElements: ['background', 'character'],
    minCharacterCount: 2,
    maxCharacterCount: 4,
    propRequired: false,
    preferredBeatRoles: ['setup', 'aftermath'],
  },
  {
    id: 'punchline_freeze',
    description: 'オチの決めカット（ズームイン+フリーズ）',
    requiredElements: ['background', 'character'],
    minCharacterCount: 1,
    maxCharacterCount: 1,
    propRequired: false,
    preferredBeatRoles: ['climax'],
  },
  {
    id: 'aftermath_wide',
    description: '結末の引き構図',
    requiredElements: ['background', 'character'],
    minCharacterCount: 0,
    maxCharacterCount: 2,
    propRequired: false,
    preferredBeatRoles: ['aftermath', 'outro'],
  },
  {
    id: 'caption_only',
    description: 'テキストのみ（画面転換）',
    requiredElements: ['text_only'],
    minCharacterCount: 0,
    maxCharacterCount: 0,
    propRequired: false,
    preferredBeatRoles: ['intro', 'outro'],
  },
]

// ============================================================
// Layer 3: layout_variant — どう配置するか
// ============================================================
export interface CharacterSlot {
  role: 'main' | 'sub' | 'crowd'
  x: number       // % from left
  y: number       // % from top
  scale: number
  anchor: 'center' | 'bottom-center' | 'bottom-left' | 'bottom-right'
}

export interface CaptionZone {
  top: number      // % from top
  left: number     // % from left
  width: number    // % width
  maxLines: number
}

export interface LayoutVariant {
  id: string
  applicableTo: ShotTemplateId[]
  characters: CharacterSlot[]
  backgroundRequirement: string
  cameraPreset: string
  captionZone: CaptionZone
}

// 参考動画準拠レイアウト:
// タイトル: y:0-12% (直接オーバーレイ、黒帯なし)
// テロップ: y:18-40% (白+黒ストローク、巨大フォント)
// キャラ: y:45-100% (画面幅60-90%、デカい)
export const LAYOUT_VARIANTS: LayoutVariant[] = [
  {
    id: 'wide_center_single',
    applicableTo: ['classroom_intro', 'teacher_statement', 'aftermath_wide'],
    characters: [
      { role: 'main', x: 50, y: 98, scale: 0.9, anchor: 'bottom-center' },
    ],
    backgroundRequirement: 'any',
    cameraPreset: 'wide_hold',
    captionZone: { top: 18, left: 3, width: 94, maxLines: 3 },
  },
  {
    id: 'left_character_statement',
    applicableTo: ['teacher_statement', 'classroom_intro'],
    characters: [
      { role: 'main', x: 40, y: 98, scale: 0.9, anchor: 'bottom-center' },
    ],
    backgroundRequirement: 'any',
    cameraPreset: 'slow_push_in',
    captionZone: { top: 18, left: 3, width: 94, maxLines: 3 },
  },
  {
    id: 'right_character_reaction',
    applicableTo: ['student_reaction', 'teacher_statement'],
    characters: [
      { role: 'main', x: 55, y: 98, scale: 0.95, anchor: 'bottom-center' },
    ],
    backgroundRequirement: 'any',
    cameraPreset: 'reaction_snap_zoom',
    captionZone: { top: 18, left: 3, width: 94, maxLines: 3 },
  },
  {
    id: 'closeup_reaction',
    applicableTo: ['student_reaction', 'punchline_freeze'],
    characters: [
      { role: 'main', x: 50, y: 98, scale: 1.1, anchor: 'bottom-center' },
    ],
    backgroundRequirement: 'any',
    cameraPreset: 'reaction_snap_zoom',
    captionZone: { top: 18, left: 3, width: 94, maxLines: 3 },
  },
  {
    id: 'duo_left_right',
    applicableTo: ['duo_dialogue', 'group_dialogue'],
    characters: [
      { role: 'main', x: 30, y: 98, scale: 0.75, anchor: 'bottom-center' },
      { role: 'sub', x: 70, y: 98, scale: 0.75, anchor: 'bottom-center' },
    ],
    backgroundRequirement: 'any',
    cameraPreset: 'wide_hold',
    captionZone: { top: 18, left: 3, width: 94, maxLines: 3 },
  },
  {
    id: 'object_center_closeup',
    applicableTo: ['object_reveal'],
    characters: [],
    backgroundRequirement: 'any',
    cameraPreset: 'object_insert_zoom',
    captionZone: { top: 18, left: 3, width: 94, maxLines: 3 },
  },
  {
    id: 'object_with_character',
    applicableTo: ['object_reveal', 'student_reaction'],
    characters: [
      { role: 'main', x: 45, y: 98, scale: 0.8, anchor: 'bottom-center' },
    ],
    backgroundRequirement: 'any',
    cameraPreset: 'object_insert_zoom',
    captionZone: { top: 18, left: 3, width: 94, maxLines: 3 },
  },
  {
    id: 'punchline_center_freeze',
    applicableTo: ['punchline_freeze', 'climax' as ShotTemplateId].filter(
      (id): id is ShotTemplateId => SHOT_TEMPLATE_IDS.includes(id as ShotTemplateId),
    ),
    backgroundRequirement: 'effect_bg',
    cameraPreset: 'freeze_punch_in',
    characters: [
      { role: 'main', x: 50, y: 98, scale: 1.1, anchor: 'bottom-center' },
    ],
    captionZone: { top: 18, left: 3, width: 94, maxLines: 3 },
  },
  {
    id: 'aftermath_wide_pull',
    applicableTo: ['aftermath_wide', 'classroom_intro'],
    characters: [
      { role: 'main', x: 50, y: 98, scale: 0.8, anchor: 'bottom-center' },
    ],
    backgroundRequirement: 'any',
    cameraPreset: 'slight_pan',
    captionZone: { top: 18, left: 3, width: 94, maxLines: 3 },
  },
  {
    id: 'caption_only_screen',
    applicableTo: ['caption_only'],
    characters: [],
    backgroundRequirement: 'any',
    cameraPreset: 'wide_hold',
    captionZone: { top: 30, left: 5, width: 90, maxLines: 4 },
  },
]

// ============================================================
// Layer 5: render_presets — 字幕・カメラ・エフェクト
// ============================================================
export interface CaptionPreset {
  color: string
  strokeColor: string
  strokeWidth: number
  fontSize: number
  fontWeight: number
}

export const CAPTION_PRESETS: Record<string, CaptionPreset> = {
  // 参考動画準拠: テロップは全話者とも白+黒ストローク
  narration: {
    color: '#FFFFFF',
    strokeColor: '#000000',
    strokeWidth: 8,
    fontSize: 96,
    fontWeight: 900,
  },
  character_dialogue: {
    color: '#FFFFFF',
    strokeColor: '#000000',
    strokeWidth: 8,
    fontSize: 96,
    fontWeight: 900,
  },
  punchline_emphasis: {
    color: '#FFFFFF',
    strokeColor: '#000000',
    strokeWidth: 8,
    fontSize: 110,
    fontWeight: 900,
  },
  whisper: {
    color: '#CCCCCC',
    strokeColor: '#000000',
    strokeWidth: 6,
    fontSize: 80,
    fontWeight: 700,
  },
}

export interface CameraPreset {
  zoomFrom: number
  zoomTo: number
  panX: number   // pixels to pan horizontally
  panY: number   // pixels to pan vertically
}

// 参考動画準拠: 通常シーンはズームなし、感情時のみ控えめに
export const CAMERA_PRESETS: Record<string, CameraPreset> = {
  wide_hold: { zoomFrom: 1.0, zoomTo: 1.0, panX: 0, panY: 0 },
  slow_push_in: { zoomFrom: 1.0, zoomTo: 1.02, panX: 0, panY: 0 },
  reaction_snap_zoom: { zoomFrom: 1.0, zoomTo: 1.03, panX: 0, panY: 0 },
  object_insert_zoom: { zoomFrom: 1.0, zoomTo: 1.02, panX: 0, panY: 0 },
  freeze_punch_in: { zoomFrom: 1.0, zoomTo: 1.05, panX: 0, panY: 0 },
  slight_pan: { zoomFrom: 1.0, zoomTo: 1.0, panX: 5, panY: 0 },
}

// ============================================================
// Beat role assignment from emotion/position
// ============================================================
export function assignBeatRole(
  index: number,
  total: number,
  emotion: string,
  effect: string,
): BeatRole {
  const pos = index / Math.max(total - 1, 1)

  // Explicit overrides
  if (index === 0) return 'intro'
  if (index === total - 1) return 'outro'
  if (emotion === 'shock' || effect === 'lightning') return 'climax'
  if (emotion === 'anger' && (effect === 'concentration_lines' || effect === 'shake')) return 'escalation'

  // Position-based
  if (pos < 0.15) return 'setup'
  if (pos < 0.35) return 'incident'
  if (pos < 0.55) return 'reaction'
  if (pos < 0.75) return 'escalation'
  if (pos < 0.9) return 'climax'
  return 'aftermath'
}

// ============================================================
// Shot template selection from beat role
// ============================================================
export function selectShotTemplate(
  role: BeatRole,
  speaker: string,
  characterCount: number,
): ShotTemplate {
  // Find best matching template
  const candidates = SHOT_TEMPLATES.filter((t) =>
    t.preferredBeatRoles.includes(role),
  )

  if (candidates.length === 0) {
    return SHOT_TEMPLATES.find((t) => t.id === 'teacher_statement')!
  }

  // Prefer duo/group for multi-character beats
  if (characterCount >= 2) {
    const duo = candidates.find((t) => t.id === 'duo_dialogue' || t.id === 'group_dialogue')
    if (duo) return duo
  }

  // Prefer reaction for character speakers
  if (speaker !== 'narrator' && role !== 'intro' && role !== 'outro') {
    const reaction = candidates.find((t) => t.id === 'student_reaction')
    if (reaction) return reaction
  }

  return candidates[0]
}

// ============================================================
// Caption preset resolution
// ============================================================
export function resolveCaptionPreset(
  speaker: string,
  role: BeatRole,
): string {
  if (role === 'climax') return 'punchline_emphasis'
  if (speaker === 'narrator') return 'narration'
  return 'character_dialogue'
}
