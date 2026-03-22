/**
 * ReproComposition — 元動画再現用Remotionコンポジション
 *
 * 元動画のフレーム単位再現を目的とする。
 * いらすとや画像 + 文脈に合った背景 + BudouX改行 + エフェクト忠実再現
 */
import React from 'react'
import { AbsoluteFill, Audio, Img, Sequence, interpolate, useCurrentFrame, staticFile } from 'remotion'
import { wrapJapanese } from '../../utils/text-wrap'

// ── Types ──
export type ReproCharacter = {
  type: string
  count: number
  position: string
  scale: number
}

export type ReproShot = {
  id: string
  startFrame: number
  endFrame: number
  text: string
  narration: string
  speaker: string
  characters: ReproCharacter[]
  props?: string[]
  background: string
  effect: string
  camera?: { zoomFrom: number; zoomTo: number }
  note?: string
  mangaSymbol?: string
  captionColor?: string
}

export type ReproTitleBand = {
  line1: string
  line2: string
  backgroundColor: string
  textColor: string
  strokeColor: string
  strokeWidth: number
  height: number
}

export type ReproTimeline = {
  videoId: string
  title: string
  fps: number
  width: number
  height: number
  durationSec: number
  totalFrames: number
  seriesTitle: string
  episodeTitle: string
  titleBand: ReproTitleBand
  shots: ReproShot[]
}

export type ReproAudioEntry = {
  unitId: string
  src: string
  startFrame: number
  endFrame: number
  gainDb?: number
}

export type ReproProps = {
  timeline: ReproTimeline
  audioEntries: ReproAudioEntry[]
  bgmSrc?: string
  bgmVolume?: number
  assetBasePath: string
}

// ── Character image mapping ──
function getCharacterSrc(type: string, basePath: string): string {
  const map: Record<string, string> = {
    student_laughing: 'student_laughing.png',
    student_frozen: 'student_frozen.png',
    student_bending: 'student_bending.png',
    student_raising_hand: 'student_raising_hand.png',
    student_girl_smiling: 'student_girl_smiling.png',
    teacher_lecturing: 'teacher_lecturing.png',
    teacher_confused: 'teacher_confused.png',
    teacher_confused_female: 'teacher_female_confused.png',
    teacher_shocked: 'teacher_shocked.png',
    teacher_female: 'teacher_lecturing.png',
    teacher_math: 'teacher_lecturing.png',
    teacher_science: 'teacher_science.png',
    teacher_science_smile: 'teacher_science_smile.png',
    teacher_tired: 'teacher_male_tired.png',
    // Generic fallback patterns - match by keyword in type name
  }

  // Keyword-based fallback matching (adult characters preferred)
  const keywordMap: Array<[string, string]> = [
    // Emotions (gender-neutral, prefer adult images)
    ['shocked', 'man_shocked.png'],
    ['surprised', 'man_shocked.png'],
    ['startled', 'man_shocked.png'],
    ['confused', 'man_confused.png'],
    ['worried', 'woman_shocked.png'],
    ['doubt', 'man_confused.png'],
    ['panic', 'man_shocked.png'],
    ['angry', 'man_angry.png'],
    ['stern', 'man_angry.png'],
    ['crying', 'woman_sad.png'],
    ['sad', 'woman_sad.png'],
    ['depressed', 'woman_sad.png'],
    ['defeated', 'teacher_male_tired.png'],
    ['tired', 'teacher_male_tired.png'],
    ['happy', 'man_happy.png'],
    ['smiling', 'woman_happy.png'],
    ['excited', 'woman_happy.png'],
    ['overjoyed', 'woman_happy.png'],
    ['laughing', 'man_happy.png'],
    ['energetic', 'man_happy.png'],
    ['normal', 'man_normal.png'],
    ['neutral', 'man_normal.png'],
    ['calm', 'man_normal.png'],
    ['back', 'student_bending.png'],
    ['fallen', 'student_bending.png'],
    ['sleeping', 'student_bending.png'],
    ['pleading', 'woman_sad.png'],
    ['grabbing', 'woman_angry.png'],
    ['smirking', 'man_happy.png'],
    ['sparkle', 'woman_happy.png'],
    ['thumbsup', 'man_happy.png'],
    ['nervous', 'man_confused.png'],
    ['serious', 'man_normal.png'],
    // Roles (adult characters)
    ['wife', 'woman_happy.png'],
    ['woman', 'woman_normal.png'],
    ['mother', 'woman_normal.png'],
    ['grandmother', 'woman_normal.png'],
    ['sister', 'woman_normal.png'],
    ['husband', 'man_normal.png'],
    ['man_casual', 'man_normal.png'],
    ['man_father', 'man_normal.png'],
    ['man_suit', 'man_normal.png'],
    ['man', 'man_normal.png'],
    ['father', 'man_normal.png'],
    ['old_man', 'man_normal.png'],
    ['librarian', 'man_normal.png'],
    ['waiter', 'man_normal.png'],
    // Children
    ['girl', 'girl_happy.png'],
    ['boy', 'boy_happy.png'],
    ['child', 'girl_happy.png'],
    ['baby', 'girl_happy.png'],
    ['daughter', 'girl_happy.png'],
    // Misc
    ['narrator', 'man_normal.png'],
    ['mob', 'man_normal.png'],
    ['hyakkan', 'woman_normal.png'],
    ['ex_wife', 'woman_angry.png'],
    ['ex_mother', 'woman_angry.png'],
  ]

  if (!map[type]) {
    for (const [keyword, fallback] of keywordMap) {
      if (type.includes(keyword)) {
        return staticFile(`${basePath}/${fallback}`)
      }
    }
  }
  const filename = map[type] ?? 'student_frozen.png'
  return staticFile(`${basePath}/${filename}`)
}

// ── Position resolver ──
function resolvePosition(position: string, index: number, total: number): { x: number; y: number } {
  switch (position) {
    case 'center':
      return { x: 540, y: 1320 }
    case 'center-bottom': {
      if (total <= 1) return { x: 540, y: 1180 }
      if (total === 2) return { x: index === 0 ? 300 : 780, y: 1220 }
      if (total === 3) {
        const positions = [{ x: 540, y: 1400 }, { x: 250, y: 1100 }, { x: 830, y: 1100 }]
        return positions[index]
      }
      if (total === 4) {
        const positions = [
          { x: 300, y: 1380 }, { x: 780, y: 1380 },
          { x: 350, y: 1080 }, { x: 730, y: 1080 },
        ]
        return positions[index]
      }
      if (total <= 6) {
        const frontCount = Math.min(3, Math.ceil(total / 2))
        if (index < frontCount) {
          const sp = 900 / (frontCount + 1)
          return { x: 90 + sp * (index + 1), y: 1350 }
        }
        const backCount = total - frontCount
        const bi = index - frontCount
        const sp2 = 900 / (backCount + 1)
        return { x: 90 + sp2 * (bi + 1), y: 1080 }
      }
      const col = index % 3
      const row = Math.floor(index / 3)
      return { x: 180 + col * 260, y: 1050 + row * 200 }
    }
    case 'left':
      return { x: 280, y: 1180 }
    case 'right':
      return { x: 800, y: 1180 }
    case 'left-bottom':
      return { x: 200 + index * 250, y: 1320 }
    case 'front-row': {
      const sp = 800 / (total + 1)
      return { x: 140 + sp * (index + 1), y: 1320 + (index % 2) * 40 }
    }
    case 'back-center':
      return { x: 540, y: 1000 }
    default:
      return { x: 540, y: 1180 }
  }
}

// ── Background: 台本文脈に応じた背景 ──
const ReproBackground: React.FC<{
  bg: string
  basePath: string
  camera?: { zoomFrom: number; zoomTo: number }
}> = ({ bg, basePath, camera }) => {
  const frame = useCurrentFrame()
  const zoomFrom = camera?.zoomFrom ?? 1.0
  const zoomTo = camera?.zoomTo ?? 1.02
  const zoom = interpolate(frame, [0, 90], [zoomFrom, zoomTo], { extrapolateRight: 'clamp' })

  if (bg === 'white_black') {
    return <AbsoluteFill style={{ background: '#FFFFFF' }} />
  }

  // Background image: context-specific mapping
  const bgImageMap: Record<string, string> = {
    // Classroom
    classroom_bright: 'bg_classroom_front.jpg',
    classroom_dark: 'bg_classroom_dark_freeze.jpg',
    classroom_blackboard: 'bg_classroom_blackboard.jpg',
    classroom_window_sketch: 'bg_classroom_window.jpg',
    classroom_wide: 'bg_classroom_wide.jpg',
    // Kitchen / Home
    kitchen: 'bg_kitchen.jpg',
    kitchen_fridge: 'bg_kitchen.jpg',
    living_room: 'bg_living.jpg',
    home: 'bg_living.jpg',
    // Library
    library: 'bg_library.jpg',
    library_dark: 'bg_library.jpg',
    // Restaurant / Izakaya
    restaurant: 'bg_restaurant.jpg',
    izakaya: 'bg_izakaya.jpg',
    // Outdoor
    vending_machine: 'bg_vending_machine.jpg',
    outdoor: 'bg_classroom_front.jpg',
    // Effect / special
    effect_bg: 'bg_classroom_blackboard.jpg',
  }

  // Keyword-based background fallback
  let filename = bgImageMap[bg]
  if (!filename) {
    if (bg.includes('vortex') || bg.includes('spiral')) filename = '_effect_vortex'
    else if (bg.includes('concentration') || bg.includes('radial') || bg.includes('sunburst')) filename = '_effect_concentration'
    else if (bg.includes('fire') || bg.includes('red_gradient')) filename = '_effect_fire'
    else if (bg.includes('sparkle') || bg.includes('yellow') || bg.includes('pink') || bg.includes('warm') || bg.includes('pastel')) filename = '_effect_sparkle'
    // Scene-specific backgrounds FIRST (before generic dark/light)
    else if (bg.includes('kitchen') || bg.includes('fridge') || bg.includes('shelf')) filename = 'bg_kitchen.jpg'
    else if (bg.includes('dining') || bg.includes('table')) filename = 'bg_dining.jpg'
    else if (bg.includes('living')) filename = 'bg_living_room.jpg'
    else if (bg.includes('library') || bg.includes('bookstore')) filename = 'bg_library.jpg'
    else if (bg.includes('hallway') || bg.includes('corridor') || bg.includes('elevator')) filename = 'bg_hallway.jpg'
    else if (bg.includes('restaurant') || bg.includes('fancy')) filename = 'bg_restaurant.jpg'
    else if (bg.includes('izakaya') || bg.includes('tatami') || bg.includes('japanese')) filename = 'bg_japanese_room.jpg'
    else if (bg.includes('outdoor') || bg.includes('street') || bg.includes('patisserie') || bg.includes('shop')) filename = 'bg_street.jpg'
    else if (bg.includes('vending')) filename = 'bg_vending_machine.jpg'
    // Generic fallbacks LAST
    else if (bg.includes('dark') || bg.includes('black') || bg.includes('shock')) filename = 'bg_classroom_dark_freeze.jpg'
    else if (bg.includes('rain') || bg.includes('blue')) filename = 'bg_classroom_dark_freeze.jpg'
    else if (bg.includes('money') || bg.includes('confetti')) filename = '_effect_sparkle'
    else filename = 'bg_classroom_front.jpg'
  }
  // Effect backgrounds rendered as CSS
  if (filename.startsWith('_effect_')) {
    const rotate = frame * 3
    if (filename === '_effect_vortex') {
      return (
        <AbsoluteFill style={{
          background: `conic-gradient(from ${rotate}deg at 50% 60%,
            #2A0845 0deg, #4A1875 45deg, #1A0530 90deg, #3A1265 135deg,
            #0A0020 180deg, #4A1875 225deg, #2A0845 270deg, #1A0530 315deg, #2A0845 360deg)`,
        }} />
      )
    }
    if (filename === '_effect_concentration') {
      return (
        <AbsoluteFill style={{
          background: `conic-gradient(from 0deg at 50% 55%,
            ${Array.from({ length: 36 }, (_, i) =>
              `${i % 2 === 0 ? 'rgba(180,20,20,0.7)' : 'rgba(60,0,30,0.9)'} ${i * 10}deg`
            ).join(', ')})`,
        }} />
      )
    }
    if (filename === '_effect_fire') {
      const flicker = Math.sin(frame * 0.5) * 0.1
      return (
        <AbsoluteFill style={{
          background: `linear-gradient(180deg,
            rgba(200,50,0,${0.7 + flicker}) 0%, rgba(255,100,0,${0.5 + flicker}) 30%,
            rgba(255,180,0,${0.3 + flicker}) 60%, rgba(120,20,0,0.9) 100%)`,
        }} />
      )
    }
    if (filename === '_effect_sparkle') {
      return (
        <AbsoluteFill style={{
          background: `radial-gradient(circle at 50% 50%, #FFE066 0%, #FFD700 30%, #FFA500 70%, #FF8C00 100%)`,
        }} />
      )
    }
  }

  const darkOverlay = bg === 'white_black' ? 0
    : bg.includes('dark') ? 0.6
    : 0.45

  return (
    <AbsoluteFill>
      <div style={{
        width: '100%', height: '100%',
        transform: `scale(${zoom})`,
        transformOrigin: 'center center',
      }}>
        <Img
          src={staticFile(`${basePath}/${filename}`)}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>
      {darkOverlay > 0 && (
        <AbsoluteFill style={{ background: `rgba(0,0,0,${darkOverlay})` }} />
      )}
    </AbsoluteFill>
  )
}

// ── Top Overlay (帯ではなく全面オーバーレイ) ──
const ReproTopOverlay: React.FC = () => (
  <div style={{
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(to bottom, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.72) 18%, rgba(0,0,0,0.28) 32%, rgba(0,0,0,0) 50%)',
    pointerEvents: 'none',
    zIndex: 8,
  }} />
)

// ── Title Text (背景の上に直接置く、帯パネルなし) ──
const ReproTitleText: React.FC<{ band: ReproTitleBand }> = ({ band }) => (
  <div style={{
    position: 'absolute',
    top: 25, left: 0, width: 1080,
    zIndex: 11,
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    pointerEvents: 'none',
  }}>
    <div style={{
      fontFamily: '"Noto Sans JP", sans-serif',
      fontWeight: 900, fontSize: 110,
      color: band.textColor,
      WebkitTextStroke: `${band.strokeWidth + 4}px ${band.strokeColor}`,
      paintOrder: 'stroke fill',
      textShadow: '0 0 12px #FFE000, 0 0 24px rgba(255,224,0,0.5), -4px -4px 0 #000, 4px -4px 0 #000, -4px 4px 0 #000, 4px 4px 0 #000',
      lineHeight: 1.15,
    }}>
      {band.line1}
    </div>
    <div style={{
      fontFamily: '"Noto Sans JP", sans-serif',
      fontWeight: 900, fontSize: 68,
      color: '#FFFFFF',
      WebkitTextStroke: '3px #3366FF',
      paintOrder: 'stroke fill',
      textShadow: '0 0 10px #3399FF, 0 0 20px rgba(51,153,255,0.4), -3px -3px 0 #000, 3px -3px 0 #000, -3px 3px 0 #000, 3px 3px 0 #000',
      lineHeight: 1.15, marginTop: 6,
    }}>
      {band.line2}
    </div>
  </div>
)

// ── Caption with BudouX ──
const ReproCaption: React.FC<{ text: string; speaker: string; effect: string; captionColor?: string }> = ({ text, speaker, effect, captionColor }) => {
  const frame = useCurrentFrame()
  const opacity = interpolate(frame, [0, 2], [0.7, 1], { extrapolateRight: 'clamp' })

  // AA display (特殊シーン - 白背景上にAA + 青テロップ)
  if (effect === 'aa_display') {
    const parts = text.split('\n')
    return (
      <>
        {/* 白背景をオーバーレイの上に重ねてAAを読みやすく */}
        <AbsoluteFill style={{ background: '#FFFFFF', zIndex: 9 }} />
        <div style={{
          position: 'absolute', top: 550, left: 40, width: 1000,
          zIndex: 12, opacity,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 24,
        }}>
          {parts.map((line, i) => (
            <div key={i} style={{
              fontFamily: i === 0 ? '"Courier New", monospace' : '"Noto Sans JP", sans-serif',
              fontWeight: i === 0 ? 400 : 900,
              fontSize: i === 0 ? 64 : 52,
              color: i === 0 ? '#000000' : '#0033CC',
              textShadow: i === 0 ? 'none' : '-3px -3px 0 #FFF, 3px -3px 0 #FFF, -3px 3px 0 #FFF, 3px 3px 0 #FFF',
              lineHeight: 1.4, textAlign: 'center',
            }}>
              {line}
            </div>
          ))}
        </div>
      </>
    )
  }

  // Impact text (ボカーン等)
  if (effect === 'impact_text') {
    return (
      <div style={{
        position: 'absolute', top: 350, left: 0, width: 1080,
        zIndex: 8, opacity,
        display: 'flex', justifyContent: 'center',
      }}>
        <div style={{
          fontFamily: '"Noto Sans JP", sans-serif',
          fontWeight: 900, fontSize: 120,
          color: '#0033CC',
          textShadow: '-6px -6px 0 #FFF, 6px -6px 0 #FFF, -6px 6px 0 #FFF, 6px 6px 0 #FFF, -6px 0 0 #FFF, 6px 0 0 #FFF, 0 -6px 0 #FFF, 0 6px 0 #FFF, -10px -10px 0 #000, 10px -10px 0 #000, -10px 10px 0 #000, 10px 10px 0 #000, 0 0 20px rgba(0,0,0,0.8)',
          letterSpacing: 8,
        }}>
          {text}
        </div>
      </div>
    )
  }

  // Text type detection for A-6 color differentiation
  const rawText = text.replace(/\n/g, '')
  const isDialog = rawText.includes('「') || rawText.includes('」')
  const subjectNames = ['数学', '現文', '国語', '理科', '英語', '社会', '体育', '化学', '物理', '倫理']
  const isSubjectName = subjectNames.some(s => rawText.trim() === s)

  // A-6: 教科名 — 黒文字+黄色グロー
  if (isSubjectName) {
    return (
      <div style={{
        position: 'absolute', top: 300, left: 20, width: 1040,
        zIndex: 9, opacity,
        display: 'flex', justifyContent: 'center',
      }}>
        <div style={{
          fontFamily: '"Noto Sans JP", sans-serif',
          fontWeight: 900, fontSize: 100,
          color: '#000000',
          textShadow: '0 0 12px #FFE000, 0 0 24px #FFD700, 0 0 36px rgba(255,215,0,0.6), -4px -4px 0 #FFE000, 4px -4px 0 #FFE000, -4px 4px 0 #FFE000, 4px 4px 0 #FFE000',
          lineHeight: 1.2, textAlign: 'center',
        }}>
          {rawText}
        </div>
      </div>
    )
  }

  // A-6: セリフ「」— 白文字+黒縁取り+半透明黒背景ボックス
  if (isDialog) {
    const dialogLines = wrapJapanese(rawText, 9, 4)
    const dialogFontSize = rawText.length > 18 ? 64 : rawText.length > 9 ? 72 : 80
    return (
      <div style={{
        position: 'absolute', top: 300, left: 20, width: 1040,
        zIndex: 9, opacity,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>
        <div style={{
          background: 'rgba(0,0,0,0.82)',
          borderRadius: 16, padding: '14px 24px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
        }}>
          {dialogLines.map((line, i) => (
            <div key={i} style={{
              fontFamily: '"Noto Sans JP", sans-serif',
              fontWeight: 900, fontSize: dialogFontSize,
              color: '#FFFFFF',
              textShadow: '-4px -4px 0 #000, 4px -4px 0 #000, -4px 4px 0 #000, 4px 4px 0 #000, -4px 0 0 #000, 4px 0 0 #000, 0 -4px 0 #000, 0 4px 0 #000',
              lineHeight: 1.25, textAlign: 'center', letterSpacing: 2,
            }}>
              {line}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Normal caption: 青文字+白縁+黒締め
  const fontSize = rawText.length > 20 ? 64 : rawText.length > 10 ? 72 : 80
  const lines = wrapJapanese(rawText, 8, 5)
  const textColor = '#0033CC'
  const shadow = '-5px -5px 0 #FFF, 5px -5px 0 #FFF, -5px 5px 0 #FFF, 5px 5px 0 #FFF, -5px 0 0 #FFF, 5px 0 0 #FFF, 0 -5px 0 #FFF, 0 5px 0 #FFF, -8px -8px 0 #000, 8px -8px 0 #000, -8px 8px 0 #000, 8px 8px 0 #000, -8px 0 0 #000, 8px 0 0 #000, 0 -8px 0 #000, 0 8px 0 #000, 0 0 12px rgba(0,0,0,0.8)'

  return (
    <div style={{
      position: 'absolute', top: 300, left: 20, width: 1040,
      zIndex: 9, opacity,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
    }}>
      {lines.map((line, i) => (
        <div key={i} style={{
          fontFamily: '"Noto Sans JP", sans-serif',
          fontWeight: 900, fontSize,
          color: textColor,
          textShadow: shadow,
          lineHeight: 1.25, textAlign: 'center',
          letterSpacing: 2,
        }}>
          {line}
        </div>
      ))}
    </div>
  )
}

// ── Effect Layer (渦巻き・集中線・漫符の忠実再現) ──
const ReproEffectLayer: React.FC<{ effect: string }> = ({ effect }) => {
  const frame = useCurrentFrame()

  if (effect === 'vortex' || effect === 'vortex_purple') {
    const rotate = frame * 3
    return (
      <AbsoluteFill style={{ zIndex: 1 }}>
        <div style={{
          width: '100%', height: '100%',
          background: `conic-gradient(from ${rotate}deg at 50% 60%,
            #2A0845 0deg, #4A1875 45deg, #1A0530 90deg, #3A1265 135deg,
            #0A0020 180deg, #4A1875 225deg, #2A0845 270deg, #1A0530 315deg, #2A0845 360deg)`,
          opacity: 0.85,
        }} />
      </AbsoluteFill>
    )
  }

  if (effect === 'concentration_lines' || effect === 'concentration_red') {
    return (
      <AbsoluteFill style={{ zIndex: 1 }}>
        <div style={{
          width: '100%', height: '100%',
          background: `conic-gradient(from 0deg at 50% 55%,
            ${Array.from({ length: 36 }, (_, i) =>
              `${i % 2 === 0 ? 'rgba(180,20,20,0.7)' : 'rgba(60,0,30,0.9)'} ${i * 10}deg`
            ).join(', ')})`,
        }} />
      </AbsoluteFill>
    )
  }

  if (effect === 'golden_radial') {
    return (
      <AbsoluteFill style={{ zIndex: 1 }}>
        <div style={{
          width: '100%', height: '100%',
          background: `conic-gradient(from 0deg at 50% 50%,
            ${Array.from({ length: 36 }, (_, i) =>
              `${i % 2 === 0 ? 'rgba(255,215,0,0.8)' : 'rgba(200,150,0,0.6)'} ${i * 10}deg`
            ).join(', ')})`,
        }} />
      </AbsoluteFill>
    )
  }

  if (effect === 'fire') {
    const flicker = Math.sin(frame * 0.5) * 0.1
    return (
      <AbsoluteFill style={{ zIndex: 1 }}>
        <div style={{
          width: '100%', height: '100%',
          background: `linear-gradient(180deg,
            rgba(200,50,0,${0.7 + flicker}) 0%,
            rgba(255,100,0,${0.5 + flicker}) 30%,
            rgba(255,180,0,${0.3 + flicker}) 60%,
            rgba(120,20,0,0.9) 100%)`,
        }} />
      </AbsoluteFill>
    )
  }

  return null
}

// ── Manga Symbol (漫符) ──
const ReproMangaSymbol: React.FC<{ symbol?: string }> = ({ symbol }) => {
  if (!symbol) return null
  const frame = useCurrentFrame()
  const bounce = Math.sin(frame * 0.3) * 5

  if (symbol === 'sweat') {
    return (
      <AbsoluteFill style={{ zIndex: 7, pointerEvents: 'none' }}>
        {[
          { left: 160, top: 780 + bounce, size: 40 },
          { left: 200, top: 830 - bounce, size: 30 },
          { left: 840, top: 800 + bounce * 0.7, size: 35 },
          { left: 870, top: 850 - bounce * 0.5, size: 25 },
        ].map((s, i) => (
          <div key={i} style={{
            position: 'absolute', left: s.left, top: s.top,
            width: s.size, height: s.size * 1.4,
            background: 'linear-gradient(180deg, rgba(100,180,255,0.9) 0%, rgba(60,140,220,0.7) 100%)',
            borderRadius: '50% 50% 50% 50% / 30% 30% 70% 70%',
            border: '2px solid rgba(255,255,255,0.4)',
          }} />
        ))}
      </AbsoluteFill>
    )
  }
  if (symbol === '!?' || symbol === 'exclamation') {
    const scale = interpolate(frame, [0, 6], [0, 1], { extrapolateRight: 'clamp' })
    return (
      <AbsoluteFill style={{ zIndex: 7, pointerEvents: 'none' }}>
        <div style={{
          position: 'absolute', right: 120, top: 700,
          fontSize: 100, fontWeight: 900, color: '#FF3333',
          WebkitTextStroke: '4px #FFFFFF', paintOrder: 'stroke fill',
          transform: `scale(${scale})`, textShadow: '4px 4px 8px rgba(0,0,0,0.5)',
        }}>!?</div>
      </AbsoluteFill>
    )
  }
  if (symbol === 'anger') {
    return (
      <AbsoluteFill style={{ zIndex: 7, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', right: 200, top: 750 + bounce, fontSize: 60 }}>💢</div>
      </AbsoluteFill>
    )
  }
  if (symbol === 'question') {
    return (
      <AbsoluteFill style={{ zIndex: 7, pointerEvents: 'none' }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            position: 'absolute', left: 200 + i * 250,
            top: 600 + Math.sin(frame * 0.2 + i) * 20,
            fontSize: 70, color: '#FFFFFF', opacity: 0.7,
          }}>?</div>
        ))}
      </AbsoluteFill>
    )
  }
  if (symbol === 'gaan') {
    return (
      <AbsoluteFill style={{ zIndex: 7, pointerEvents: 'none' }}>
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} style={{
            position: 'absolute', left: 120 + i * 110, top: 400,
            width: 3, height: 600, backgroundColor: 'rgba(100,80,150,0.3)',
          }} />
        ))}
      </AbsoluteFill>
    )
  }
  if (symbol === 'sigh') {
    return (
      <AbsoluteFill style={{ zIndex: 7, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', right: 150, top: 1100 + bounce, fontSize: 80, opacity: 0.6 }}>💨</div>
      </AbsoluteFill>
    )
  }
  return null
}

// ── Character Layer ──
const ReproCharacterLayer: React.FC<{
  characters: ReproCharacter[]
  basePath: string
}> = ({ characters, basePath }) => {
  const frame = useCurrentFrame()
  // Flatten all characters into a single list with global index
  const allChars: Array<{ type: string; position: string; scale: number; globalIdx: number }> = []
  for (const char of characters) {
    for (let i = 0; i < char.count; i++) {
      allChars.push({ type: char.type, position: char.position, scale: char.scale, globalIdx: allChars.length })
    }
  }
  // Group by position to calculate correct total per position group
  const posGroups: Record<string, number> = {}
  for (const c of allChars) {
    posGroups[c.position] = (posGroups[c.position] ?? 0) + 1
  }
  const posIndexes: Record<string, number> = {}

  return (
    <AbsoluteFill style={{ zIndex: 5, pointerEvents: 'none', overflow: 'hidden' }}>
      {allChars.map((char) => {
          const groupTotal = posGroups[char.position]
          const groupIndex = posIndexes[char.position] ?? 0
          posIndexes[char.position] = groupIndex + 1
          const pos = resolvePosition(char.position, groupIndex, groupTotal)
          // Scale down when many characters (avoid overlap)
          const crowdFactor = allChars.length > 3 ? 0.80 : allChars.length > 1 ? 0.90 : 1.0
          const size = 1920 * char.scale * crowdFactor
          const float = Math.sin((frame + char.globalIdx * 11) / 30) * 3
          return (
            <Img
              key={`${char.type}-${char.globalIdx}`}
              src={getCharacterSrc(char.type, basePath)}
              style={{
                position: 'absolute',
                left: pos.x - size / 2,
                top: pos.y - size / 2 + float,
                width: size, height: size, objectFit: 'contain',
              }}
            />
          )
        })}
    </AbsoluteFill>
  )
}

// ── Main Composition ──
export const ReproComposition: React.FC<ReproProps> = ({
  timeline, audioEntries, bgmSrc, bgmVolume, assetBasePath,
}) => {
  return (
    <AbsoluteFill style={{ backgroundColor: '#000000' }}>
      {/* 全面暗部オーバーレイ（帯ではない） */}
      <ReproTopOverlay />
      {/* タイトルテキスト（背景の上に直接） */}
      <ReproTitleText band={timeline.titleBand} />

      {timeline.shots.map((shot) => {
        const duration = Math.max(1, shot.endFrame - shot.startFrame)
        return (
          <Sequence key={shot.id} from={shot.startFrame} durationInFrames={duration}>
            <AbsoluteFill>
              <ReproBackground bg={shot.background} basePath={assetBasePath} camera={shot.camera} />
              <ReproEffectLayer effect={shot.effect} />
              <ReproCharacterLayer characters={shot.characters} basePath={assetBasePath} />
              <ReproMangaSymbol symbol={shot.mangaSymbol} />
              {shot.text && <ReproCaption text={shot.text} speaker={shot.speaker} effect={shot.effect} captionColor={shot.captionColor} />}
            </AbsoluteFill>
          </Sequence>
        )
      })}

      {audioEntries.map((entry) => {
        if (!entry.src) return null
        const dur = Math.max(1, entry.endFrame - entry.startFrame)
        return (
          <Sequence key={entry.unitId} from={entry.startFrame} durationInFrames={dur}>
            <Audio src={staticFile(entry.src)} startFrom={0} endAt={dur}
              volume={Math.pow(10, (entry.gainDb ?? 0) / 20)} />
          </Sequence>
        )
      })}

      {bgmSrc && (
        <Sequence from={0} durationInFrames={timeline.totalFrames}>
          <Audio src={staticFile(bgmSrc)} startFrom={0} endAt={timeline.totalFrames}
            volume={bgmVolume ?? 0.1} />
        </Sequence>
      )}
    </AbsoluteFill>
  )
}

export function getReproTotalFrames(timeline: ReproTimeline): number {
  return timeline.totalFrames > 0
    ? timeline.totalFrames
    : Math.max(...timeline.shots.map((s) => s.endFrame))
}
