// TwoChVideoConfig — 2ch風ショート動画スキーマ

// v4 layout slot for character positioning
export interface V4CharacterSlot {
  role: 'main' | 'sub' | 'crowd'
  x: number       // % from left
  y: number       // % from top
  scale: number
  anchor: 'center' | 'bottom-center' | 'bottom-left' | 'bottom-right'
}

// v4 camera animation preset
export interface V4CameraPreset {
  zoomFrom: number
  zoomTo: number
  panX: number
  panY: number
}

// v4 caption style preset
export interface V4CaptionPreset {
  color: string
  strokeColor: string
  strokeWidth: number
  fontSize: number
  fontWeight: number
}

// v4 caption zone positioning
export interface V4CaptionZone {
  top: number
  left: number
  width: number
  maxLines: number
}

export interface V4CaptionSegment {
  startFrame: number
  endFrame: number
  text: string
  caption?: V4CaptionPreset
  captionZone?: V4CaptionZone
}

export interface V4CameraSegment {
  startFrame: number
  endFrame: number
  camera: V4CameraPreset
}

export interface V4EffectSegment {
  startFrame: number
  endFrame: number
  effect: string
}

export interface PropConfig {
  imageSrc: string
  position: 'left' | 'right' | 'top-right' | 'top-left'
  scale: number  // 0.2–1.0
}

export interface TwoChSceneConfig {
  durationFrames: number
  speaker: string
  speakerColor: string      // caption color based on speaker
  text: string              // displayed caption
  emotion: string           // drives background color
  effect: string            // drives effect layer
  audioSrc: string          // TTS WAV path (relative)
  imageSrc: string          // character illustration path (relative)
  backgroundImageSrc?: string // 3D CG background image path (relative)
  props?: PropConfig[]      // scene prop images (max 2)
  mangaSymbol?: string          // manga emotion symbol overlay
  fallbackUsed: boolean
  captionColor?: string          // per-video caption color override (default: '#FFFFFF')
  captionFadeInFrames?: number  // per-scene override
  backgroundOverlayOpacity?: number
  captionSegments?: V4CaptionSegment[]
  cameraSegments?: V4CameraSegment[]
  effectSegments?: V4EffectSegment[]

  // v4 layout engine fields
  v4?: {
    beatRole: string
    shotTemplateId: string
    layoutVariantId: string
    cameraPresetId: string
    captionPresetId: string
    characterSlots: V4CharacterSlot[]
    camera: V4CameraPreset
    caption: V4CaptionPreset
    captionZone: V4CaptionZone
  }
}

export interface TwoChEpisodeTitleConfig {
  type: 'episode_title'
  durationFrames: number    // typically 45 frames (1.5s at 30fps)
  title: string
}

export interface TwoChMeta {
  width: number
  height: number
  fps: number
  audioSampleRate?: number
}

export interface TwoChVideoConfig {
  meta: TwoChMeta
  videoTitle: string
  seriesTitle?: string          // series name (line 1 of title bar, e.g. "笑える迷言集")
  titleColor?: string           // override title color (default #FFD700)
  hideTitle?: boolean           // hide title bar entirely
  hideCaption?: boolean         // hide caption overlay entirely
  captionColor?: string         // per-video caption color override (default: '#FFFFFF')
  captionFadeInFrames?: number  // per-video caption fade-in (default: 6)
  masterAudioSrc?: string       // optional full-length audio track for the composition
  scenes: (TwoChSceneConfig | TwoChEpisodeTitleConfig)[]
  outro: {
    text: string
    audioSrc?: string
    durationFrames: number
  }
}

export function isTwoChScene(scene: TwoChSceneConfig | TwoChEpisodeTitleConfig): scene is TwoChSceneConfig {
  return !('type' in scene)
}

export function isEpisodeTitle(scene: TwoChSceneConfig | TwoChEpisodeTitleConfig): scene is TwoChEpisodeTitleConfig {
  return 'type' in scene && scene.type === 'episode_title'
}
