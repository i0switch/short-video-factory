// タイムライン定数 (DEFINITIVE_v3.md 確定値)

export const FPS = 30
export const CANVAS_WIDTH = 1080
export const CANVAS_HEIGHT = 1920

// シーン尺 (frames)
export const OPENING_FRAMES = 90    // 3.0秒
export const RANKING_FRAMES = 162   // テンプレート運用時の固定値
export const CTA_FRAMES = 75        // 2.5秒

// DEFINITIVE_v3: ランキングシーン実測値 (rank10→rank1の順)
export const SCENE_DURATIONS = [143, 166, 166, 164, 147, 164, 144, 174, 174, 178] as const

// ─── DEFINITIVE_v3 マイクロタイムライン (全シーン共通) ───────────
// F0: 1f全画面黒フラッシュ
// F1-10: brightness 0.15→1.0 フェードイン
export const BLACK_FLASH_END = 1
export const SCENE_FADE_IN_START = 1
export const SCENE_FADE_IN_END = 10

// Phase1: 見出し
export const HEADLINE_IN_START = 24
export const HEADLINE_IN_END = 33
export const HEADLINE_OUT_START = 75
export const HEADLINE_OUT_END = 84

// Phase1: 画像A
export const ASSET_A_IN_START = 39
export const ASSET_A_IN_END = 48
export const ASSET_A_OUT_START = 75
export const ASSET_A_OUT_END = 84

// Phase2: コメントボックス + 画像B
export const CAPTION_TOP_IN_START = 107
export const CAPTION_TOP_IN_END = 115
export const ASSET_B_IN_START = 117
export const ASSET_B_IN_END = 126
export const CAPTION_BOT_IN_START = 123
export const CAPTION_BOT_IN_END = 131

// Intro stagger (introLinePopIn)
export const INTRO_LINE_STAGGER = [
  [3, 9],   // 行1
  [11, 18], // 行2
  [19, 26], // 行3
  [26, 32], // 行4
] as const

// Outro stagger (outroLinePopIn)
export const OUTRO_LINE_STAGGER = [
  [2, 8],   // 行1
  [11, 16], // 行2
  [18, 23], // 行3
] as const

// レガシー互換 (旧コードで参照されている可能性)
export const TITLE_PHASE_FRAMES = 75
export const COMMENT_PHASE_FRAMES = 87
export const ANIM_POPIN_DURATION = 8
export const ANIM_SLIDE_DURATION = 8
export const ANIM_FADE_DURATION = 10
export const ANIM_STAGGER_OFFSET = 8
export const ANIM_FADEOUT_DURATION = 6
