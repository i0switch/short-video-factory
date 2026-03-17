// VideoConfig — 動画全体のデータ型 (Remotion設計書 D章)

export interface ImageConfig {
  src: string
  width: number
  height?: number
  position: { x: number; y: number }
  objectFit: 'contain' | 'cover'
}

export interface CommentData {
  text: string
  variant: 'blue' | 'red'
}

export interface RankingPhase {
  type: 'title' | 'comment'
  durationFrames: number
  titleText?: string
  comments?: CommentData[]
  image?: ImageConfig
}

export interface RankingItem {
  rank: number
  phases: RankingPhase[]
}

export interface BackgroundConfig {
  color1: string
  color2: string
  stripeCount: number
  rotationSpeed: number
  center: { x: number; y: number }
}

export interface TitleLine {
  text: string
  color: string
  fontSize: number
}

export interface OpeningConfig {
  durationFrames: number
  titleLines: TitleLine[]
  image: ImageConfig
}

export interface EndingConfig {
  durationFrames: number
  text: string
  fontSize: number
}

export interface DefaultConfig {
  titlePhaseDuration: number
  commentPhaseDuration: number
  defaultTitleFontSize: number
  defaultCommentFontSize: number
  defaultImageWidth: number
  defaultImageY: number
  fontFamily: string
}

export interface VideoMeta {
  title: string
  fps: 30
  width: 1080
  height: 1920
}

export interface VideoConfig {
  meta: VideoMeta
  background: BackgroundConfig
  opening: OpeningConfig
  rankings: RankingItem[]
  ending: EndingConfig
  defaults: DefaultConfig
}
