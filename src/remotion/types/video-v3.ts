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
  audioSrc?: string        // legacy: body audio (使用廃止)
  // per-step 音声 (spec v5: 画面表示テキストだけを読む)
  rankAudioSrc?: string    // Step 1: "第○位" (ずんだもん)
  topicAudioSrc?: string   // Step 2: topic text (ずんだもん)
  blueAudioSrc?: string    // Step 3: 青枠コメント (男性声)
  redAudioSrc?: string     // Step 4: 赤枠コメント (女性声)
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
  intro: { lines: V3IntroLine[]; audioSrc?: string; imageSrc?: string }
  scenes: V3Scene[]
  outro: { lines: string[]; audioSrc?: string }
}
