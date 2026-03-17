// アニメーションプリセット (DEFINITIVE_v3.md 確定値)
import { interpolate, Easing } from 'remotion'

export interface StyleAnim {
  transform?: string
  opacity?: number
  filter?: string
}

// ─── DEFINITIVE_v3 プリセット ─────────────────────────────────

/**
 * blackFlash1f — F0: 全画面黒 opacity=1, F1以降: opacity=0
 * 用途: SceneTransition の黒フラッシュオーバーレイ
 */
export function blackFlash1f(frame: number): number {
  // 暗転禁止: 黒フラッシュを無効化
  return 0
}

/**
 * sceneBrightnessIn — F1→F10: brightness 0.15→1.0, linear
 * 用途: 各シーン冒頭の暗→明転
 */
export function sceneBrightnessIn(frame: number): string {
  // 暗転禁止: 軽微なフェードのみ (0.85→1.0, 6fで完了)
  const brightness = interpolate(frame, [0, 6], [0.85, 1.0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  return `brightness(${brightness})`
}

/**
 * headlinePopIn — F6→F15: opacity 0→1, scale 0.93→1.0, blur 8→0
 * 用途: Phase1 見出し IN (dead time削減: 以前F24→F6)
 */
export function headlinePopIn(frame: number): StyleAnim {
  const opacity = interpolate(frame, [6, 15], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  })
  const scale = interpolate(frame, [6, 15], [0.93, 1.0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  })
  const blur = interpolate(frame, [6, 15], [8, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  })
  return { opacity, transform: `scale(${scale})`, filter: `blur(${blur}px)` }
}

/**
 * headlineFadeOut — F75→F84: opacity 1→0, scale 1.0→0.97
 * 用途: Phase1 見出し OUT
 */
export function headlineFadeOut(frame: number): StyleAnim {
  const opacity = interpolate(frame, [75, 84], [1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.in(Easing.cubic),
  })
  const scale = interpolate(frame, [75, 84], [1.0, 0.97], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  })
  return { opacity, transform: `scale(${scale})` }
}

/**
 * assetARiseIn — F15→F24: opacity 0→1, translateY +20→0, scale 0.98→1.0
 * 用途: 画像A IN (Phase1, dead time削減: 以前F39→F15)
 */
export function assetARiseIn(frame: number): StyleAnim {
  const opacity = interpolate(frame, [15, 24], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  })
  const y = interpolate(frame, [15, 24], [20, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  })
  const scale = interpolate(frame, [15, 24], [0.98, 1.0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  })
  return { opacity, transform: `translateY(${y}px) scale(${scale})` }
}

/**
 * assetAFadeOut — F75→F84: opacity 1→0
 * 用途: 画像A OUT (Phase1 終了)
 */
export function assetAFadeOut(frame: number): StyleAnim {
  const opacity = interpolate(frame, [75, 84], [1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.in(Easing.cubic),
  })
  return { opacity }
}

/**
 * assetBRiseIn — F94→F103: opacity 0→1, translateY +20→0, scale 0.98→1.0
 * 用途: 画像B IN (Phase2)
 */
export function assetBRiseIn(frame: number): StyleAnim {
  const opacity = interpolate(frame, [94, 103], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  })
  const y = interpolate(frame, [94, 103], [20, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  })
  const scale = interpolate(frame, [94, 103], [0.98, 1.0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  })
  return { opacity, transform: `translateY(${y}px) scale(${scale})` }
}

/**
 * captionTopSlideFadeIn — F84→F92: opacity 0→1, translateX +24→0, blur 6→0
 * 用途: 上段コメントボックス IN
 */
export function captionTopSlideFadeIn(frame: number): StyleAnim {
  const opacity = interpolate(frame, [84, 92], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  })
  const x = interpolate(frame, [84, 92], [24, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  })
  const blur = interpolate(frame, [84, 92], [6, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  })
  return { opacity, transform: `translateX(${x}px)`, filter: `blur(${blur}px)` }
}

/**
 * captionBotSlideFadeIn — F100→F108: opacity 0→1, translateX +24→0, blur 6→0
 * 用途: 下段コメントボックス IN
 */
export function captionBotSlideFadeIn(frame: number): StyleAnim {
  const opacity = interpolate(frame, [100, 108], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  })
  const x = interpolate(frame, [100, 108], [24, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  })
  const blur = interpolate(frame, [100, 108], [6, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  })
  return { opacity, transform: `translateX(${x}px)`, filter: `blur(${blur}px)` }
}

/**
 * introLinePop — introLinePopIn: opacity 0→1, scale 0.88→1.0, blur 6→0
 * @param frame  シーン内フレーム
 * @param start  スタートフレーム (INTRO_LINE_STAGGER から)
 * @param end    エンドフレーム
 */
export function introLinePop(frame: number, start: number, end: number): StyleAnim {
  const opacity = interpolate(frame, [start, end], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  })
  const scale = interpolate(frame, [start, end], [0.88, 1.0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  })
  const blur = interpolate(frame, [start, end], [6, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  })
  return { opacity, transform: `scale(${scale})`, filter: `blur(${blur}px)` }
}

/**
 * outroLinePop — outroLinePopIn: opacity 0→1, scale 0.9→1.0, blur 6→0
 */
export function outroLinePop(frame: number, start: number, end: number): StyleAnim {
  const opacity = interpolate(frame, [start, end], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  })
  const scale = interpolate(frame, [start, end], [0.9, 1.0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  })
  const blur = interpolate(frame, [start, end], [6, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  })
  return { opacity, transform: `scale(${scale})`, filter: `blur(${blur}px)` }
}

// ─── レガシー互換 (OpeningScene/CtaScene 等で使用) ───────────────

export function rankPopIn(frame: number, delay = 0): StyleAnim {
  const f = frame - delay
  const duration = 24
  const scale = interpolate(f, [0, duration * 0.5, duration], [0, 1.18, 1.0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  })
  const opacity = interpolate(f, [0, duration * 0.2], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  })
  const blur = interpolate(f, [0, duration], [6, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  })
  return { transform: `scale(${scale})`, opacity, filter: `blur(${blur}px)` }
}

export function captionBoxSlidePop(frame: number, delay = 28): StyleAnim {
  const f = frame - delay
  const duration = 20
  const x = interpolate(f, [0, duration], [-36, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  })
  const opacity = interpolate(f, [0, duration * 0.3], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  })
  const blur = interpolate(f, [0, duration], [8, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  })
  return { transform: `translateX(${x}px)`, opacity, filter: `blur(${blur}px)` }
}

export function assetFloatIn(frame: number, delay = 36): StyleAnim {
  const f = frame - delay
  const duration = 24
  const y = interpolate(f, [0, duration], [42, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.out(Easing.quad),
  })
  const scale = interpolate(f, [0, duration], [0.9, 1.0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  })
  const opacity = interpolate(f, [0, duration * 0.3], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  })
  return { transform: `translateY(${y}px) scale(${scale})`, opacity }
}

export function titleFadeIn(frame: number, delay = 20): StyleAnim {
  const f = frame - delay
  const duration = 16
  const opacity = interpolate(f, [0, duration], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  })
  const y = interpolate(f, [0, duration], [20, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.out(Easing.quad),
  })
  return { opacity, transform: `translateY(${y}px)` }
}

export function sceneTransition(frame: number, durationFrames: number): StyleAnim {
  const inOpacity = interpolate(frame, [0, 10], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  })
  const outOpacity = interpolate(frame, [durationFrames - 12, durationFrames - 1], [1, 0.92], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  })
  const inY = interpolate(frame, [0, 10], [16, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.out(Easing.quad),
  })
  const outScale = interpolate(frame, [durationFrames - 12, durationFrames - 1], [1, 0.985], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  })
  return {
    opacity: inOpacity * outOpacity,
    transform: `translateY(${inY}px) scale(${outScale})`,
  }
}

export function backgroundBurstZoom(frame: number): StyleAnim {
  // DEFINITIVE_v3: 背景は静止 → zoom なし
  return {}
}

export function foregroundBreathing(_frame: number): StyleAnim {
  // DEFINITIVE_v3: breathing なし
  return {}
}

export function popIn(frame: number, delay = 0, duration = 8): StyleAnim {
  const f = frame - delay
  const scale = interpolate(f, [0, duration * 0.7, duration], [0, 1.15, 1.0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  })
  const opacity = interpolate(f, [0, duration * 0.3], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  })
  return { transform: `scale(${scale})`, opacity }
}

export function slideInLeft(frame: number, delay = 0, duration = 8): StyleAnim {
  const f = frame - delay
  const x = interpolate(f, [0, duration], [-1080, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  })
  const opacity = interpolate(f, [0, duration * 0.3], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  })
  return { transform: `translateX(${x}px)`, opacity }
}

export function slideInUp(frame: number, delay = 0, duration = 10): StyleAnim {
  const f = frame - delay
  const y = interpolate(f, [0, duration], [200, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.out(Easing.quad),
  })
  const opacity = interpolate(f, [0, duration * 0.4], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  })
  return { transform: `translateY(${y}px)`, opacity }
}

export function fadeIn(frame: number, delay = 0, duration = 10): StyleAnim {
  const opacity = interpolate(frame - delay, [0, duration], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  })
  return { opacity }
}

export function fadeOut(frame: number, sceneEnd: number, duration = 6): StyleAnim {
  const opacity = interpolate(frame, [sceneEnd - duration, sceneEnd], [1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  })
  return { opacity }
}
