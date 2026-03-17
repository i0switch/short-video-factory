// タイポグラフィ定数 (DEFINITIVE_v3.md 確定値)

export const FONT_FAMILY = 'Noto Sans JP'
export const FONT_WEIGHT = 900

export const FONT_SIZE = {
  // RankHeader: 110-125px
  rankHeader: 120,
  // Phase1見出し: 72-88px (デフォルト80px, 段階縮小: 88→84→80→76→72→68→64)
  mainTitle: 80,
  mainTitleSteps: [88, 84, 80, 76, 72, 68, 64] as const,
  // CaptionBox: 56-72px (デフォルト64px, 段階縮小: 72→68→64→60→56)
  caption: 64,
  captionSteps: [72, 68, 64, 60, 56] as const,
  // Intro/Outro
  openingTitle: 76,
  cta: 110,
} as const

export const STROKE_WIDTH = {
  // RankHeader: 黒stroke 8px
  rankHeader: 8,
  // Phase1見出し: 白stroke 10-14px
  mainTitle: 12,
  // CTA: 黒stroke 8px
  cta: 8,
} as const

export const STROKE_COLOR = {
  white: '#FFFFFF',
  black: '#000000',
} as const

export const TEXT_SHADOW = {
  // RankHeader: 黒 blur14
  rankHeader: '0px 0px 14px rgba(0,0,0,0.85), 2px 2px 8px rgba(0,0,0,0.7)',
  // Phase1見出し: 黒 blur18-28
  mainTitle: '0px 0px 24px rgba(0,0,0,0.9), 3px 3px 12px rgba(0,0,0,0.8)',
  // CTA
  cta: '0px 0px 14px rgba(0,0,0,0.9), 3px 3px 8px rgba(0,0,0,0.8)',
} as const

export const LINE_HEIGHT = 1.3
export const LETTER_SPACING = '-0.02em'
