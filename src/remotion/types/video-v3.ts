// VideoV3Config — DEFINITIVE_v3 スキーマ (sample-video.json に対応)

export interface V3AssetRef {
  src: string
  fallbackLabel: string
}

export interface V3Phase1 {
  headlineLines: string[]
  asset: V3AssetRef
}

export interface V3Phase2 {
  topComment: string
  bottomComment: string
  asset: V3AssetRef
}

export interface V3Scene {
  rank: number
  durationFrames?: number  // 省略時は meta.sceneFrames を使用
  phase1: V3Phase1
  phase2: V3Phase2
}

export type IntroLineStyle = 'introBlack' | 'introRed' | 'introYellow'

export interface V3IntroLine {
  text: string
  style: IntroLineStyle
}

export interface V3TextStyle {
  fontFamily: string
  fontWeight: number
  fontSize: number
  fill: string
  stroke: string
  strokeWidth: number
  shadowColor: string
  shadowBlur: number
}

export interface V3BoxStyle {
  fill: string
  borderColor: string
  borderWidth: number
  textColor: string
  fontSize: number
  fontWeight: number
  textAlign: string
  paddingH: number
  paddingV: number
  x: number
  y: number
  w: number
}

export interface V3Background {
  type: 'sunburst'
  colorA: string
  colorB: string
  centerX: number  // 0.0-1.0
  centerY: number  // 0.0-1.0
  burstCount: number
}

export interface V3Theme {
  background: V3Background
  rankText: V3TextStyle
  phase1Caption: V3TextStyle
  topBox: V3BoxStyle
  bottomBox: V3BoxStyle
}

export interface V3Meta {
  width: number
  height: number
  fps: number
  introFrames: number
  sceneFrames: number
  outroFrames: number
}

export interface VideoV3Config {
  meta: V3Meta
  theme: V3Theme
  intro: { lines: V3IntroLine[] }
  scenes: V3Scene[]
  outro: { lines: string[] }
}
