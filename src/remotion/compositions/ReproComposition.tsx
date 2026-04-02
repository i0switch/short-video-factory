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
  characterZoom?: { from: number; to: number }
  characterSlide?: { fromX: number; toX: number }
  captionTop?: number
  captionFontScale?: number
  note?: string
  mangaSymbol?: string
  captionColor?: string
  episodeTitleOverride?: string | null
  showREC?: boolean
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
    student_shocked_male: 'student_shocked_male.png',
    student_shocked_female: 'student_shocked_female.png',
    student_confused_male: 'student_confused_male.png',
    student_sitting_frozen: 'student_sitting_frozen.png',
    student_cool: 'student_cool.png',
    man_shocked: 'man_shocked.png',
    woman_shocked: 'woman_shocked.png',
    man_confused: 'man_confused.png',
    man_angry: 'man_angry.png',
    man_happy: 'man_happy.png',
    man_normal: 'man_normal.png',
    woman_angry: 'woman_angry.png',
    woman_happy: 'woman_happy.png',
    woman_normal: 'woman_normal.png',
    woman_sad: 'woman_sad.png',
    teacher_lecturing: 'teacher_lecturing.png',
    teacher_confused: 'teacher_confused.png',
    teacher_confused_female: 'teacher_female_confused.png',
    teacher_shocked: 'teacher_shocked.png',
    teacher_female: 'teacher_lecturing.png',
    teacher_math: 'teacher_lecturing.png',
    teacher_science: 'teacher_science.png',
    teacher_science_smile: 'teacher_science_smile.png',
    teacher_tired: 'teacher_male_tired.png',
    // lLBcGh4DZ8A — 競技化彼氏・誕生日ケーキ・キョンシー百貫
    woman_excited: 'woman_excited.png',
    grandma_normal: 'grandma_normal.png',
    grandma_bookmark: 'grandma_normal.png',  // しおり付きは同画像で代替
    birthday_cake: 'birthday_cake.png',
    cake_box: 'cake_box.png',
    bookmark: 'bookmark.png',
    library_staff: 'library_staff_normal.png',
    library_staff_angry: 'library_staff_angry.png',
    library_staff_normal: 'library_staff_normal.png',
    // lLBcGh4DZ8A — 競技化彼氏 正解版キャラ・小道具
    commentator: 'commentator.png',
    businessman_normal: 'businessman_normal.png',
    boyfriend_annoyed: 'boyfriend_annoyed.png',
    boyfriend_smug: 'boyfriend_smug.png',
    girlfriend_annoyed: 'girlfriend_annoyed.png',
    toaster_toast: 'toaster_toast.png',
    toast_hand: 'toast_hand.png',
    toothbrush: 'toothbrush.png',
    trophy: 'trophy.png',
    globe: 'globe.png',
    // PDCA追加
    boyfriend_casual: 'boyfriend_casual.png',
    boyfriend_angry_casual: 'boyfriend_angry_casual.png',
    boyfriend_banzai: 'boyfriend_banzai.png',
    faucet: 'faucet.png',
    toast_slice: 'toast_slice.png',
    businessman_tablet: 'businessman_tablet.png',
    toothbrush_paste: 'toothbrush_paste.png',
    // fwb8kpg94ys — 自作自演w
    obasan_angry: 'obasan_angry.png',
    obasan_normal: 'obasan_normal.png',
    obasan_cry: 'obasan_cry.png',
    police_officer: 'police_officer.png',
    patcar: 'patcar.png',
    businesswoman_angry: 'businesswoman_angry.png',
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
// Y 軸の基準を -200px 上げてキャラが画面中央寄りに配置されるようにした（A3対応）
function resolvePosition(position: string, index: number, total: number): { x: number; y: number } {
  switch (position) {
    case 'center':
      return { x: 540, y: 1400 }
    case 'center-bottom': {
      if (total <= 1) return { x: 540, y: 1440 }
      if (total === 2) return { x: index === 0 ? 300 : 780, y: 1400 }
      if (total === 3) {
        const positions = [{ x: 540, y: 1200 }, { x: 250, y: 900 }, { x: 830, y: 900 }]
        return positions[index]
      }
      if (total === 4) {
        const positions = [
          { x: 300, y: 1180 }, { x: 780, y: 1180 },
          { x: 350, y: 880 }, { x: 730, y: 880 },
        ]
        return positions[index]
      }
      if (total <= 6) {
        const frontCount = Math.min(3, Math.ceil(total / 2))
        if (index < frontCount) {
          const sp = 900 / (frontCount + 1)
          return { x: 90 + sp * (index + 1), y: 1150 }
        }
        const backCount = total - frontCount
        const bi = index - frontCount
        const sp2 = 900 / (backCount + 1)
        return { x: 90 + sp2 * (bi + 1), y: 880 }
      }
      const col = index % 3
      const row = Math.floor(index / 3)
      return { x: 180 + col * 260, y: 850 + row * 200 }
    }
    case 'left':
      return { x: 310, y: 1400 }
    case 'right':
      return { x: 770, y: 1400 }
    case 'left-bottom':
      return { x: 200 + index * 250, y: 1120 }
    case 'front-row': {
      const sp = 800 / (total + 1)
      return { x: 140 + sp * (index + 1), y: 1120 + (index % 2) * 40 }
    }
    case 'back-center':
      return { x: 540, y: 800 }
    default:
      return { x: 540, y: 980 }
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
    living_room: 'bg_living_room.jpg',
    home: 'bg_living_room.jpg',
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
    // lLBcGh4DZ8A — みんちりえ 3DCG 背景
    minchari_kitchen: 'bg_minchari_kitchen.png',
    minchari_living: 'bg_minchari_living.jpg',
    minchari_bedroom: 'bg_minchari_bedroom.jpg',
    minchari_hallway: 'bg_minchari_hallway.jpg',
    // 特殊背景
    dark_rain: '_effect_dark_rain',
    sparkle_green: '_effect_sparkle_green',
    no_signal: '_effect_no_signal',
  }

  // Keyword-based background fallback
  let filename = bgImageMap[bg]
  if (!filename) {
    if (bg.includes('vortex') || bg.includes('spiral')) filename = '_effect_vortex'
    else if (bg === 'concentration_gold_intro' || bg.includes('gold') && bg.includes('intro')) filename = '_effect_concentration_gold'
    else if (bg.includes('concentration') || bg.includes('radial') || bg.includes('sunburst')) filename = '_effect_concentration'
    else if (bg.includes('fire') || bg.includes('red_gradient')) filename = '_effect_fire'
    else if (bg === 'sparkle_pink' || bg.includes('excited') || bg.includes('joy')) filename = '_effect_sparkle_pink'
    else if (bg.includes('sparkle') || bg.includes('yellow') || bg.includes('warm') || bg.includes('pastel')) filename = '_effect_sparkle'
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
    else if (bg.includes('pink') || bg.includes('excited') || bg.includes('joy')) filename = '_effect_sparkle_pink'
    else if (bg.includes('gold') && (bg.includes('radial') || bg.includes('sunburst') || bg.includes('intro'))) filename = '_effect_concentration_gold'
    else filename = 'bg_classroom_front.jpg'
  }
  // Effect backgrounds rendered as CSS
  if (filename.startsWith('_effect_')) {
    const rotate = frame * 3
    if (filename === '_effect_vortex') {
      // 同心円（concentric rings）スタイル — 元動画準拠: 紫の渦巻き同心円
      const cx = 540, cy = 1100
      const maxR = 1400
      const ringCount = 16
      const ringWidth = maxR / ringCount
      const animOffset = (frame * 2) % ringWidth
      return (
        <AbsoluteFill style={{ background: '#1A003A' }}>
          <svg width="1080" height="1920" style={{ position: 'absolute', top: 0, left: 0 }}>
            {Array.from({ length: ringCount + 2 }, (_, i) => {
              const r = (i * ringWidth) + animOffset
              return (
                <circle key={i} cx={cx} cy={cy} r={r}
                  fill="none"
                  stroke={i % 2 === 0 ? '#5B0A91' : '#2A005A'}
                  strokeWidth={ringWidth - 2}
                  opacity={0.95}
                />
              )
            })}
          </svg>
        </AbsoluteFill>
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
    if (filename === '_effect_sparkle_pink') {
      return (
        <AbsoluteFill style={{
          background: `radial-gradient(circle at 50% 50%, #FFF0F5 0%, #FFB6C1 25%, #FF69B4 55%, #FF1493 85%, #C71585 100%)`,
        }} />
      )
    }
    if (filename === '_effect_concentration_gold') {
      return (
        <AbsoluteFill style={{
          background: `conic-gradient(from 0deg at 50% 55%,
            ${Array.from({ length: 36 }, (_, i) =>
              `${i % 2 === 0 ? 'rgba(255,200,0,0.9)' : 'rgba(180,100,0,0.7)'} ${i * 10}deg`
            ).join(', ')})`,
        }} />
      )
    }
    if (filename === '_effect_dark_rain') {
      return (
        <AbsoluteFill style={{
          background: 'linear-gradient(180deg, #0A1428 0%, #0D1E3A 40%, #0A1428 100%)',
        }} />
      )
    }
    if (filename === '_effect_sparkle_green') {
      return (
        <AbsoluteFill style={{
          background: 'radial-gradient(circle at 50% 50%, #E8FFE8 0%, #90EE90 30%, #32CD32 65%, #228B22 100%)',
        }} />
      )
    }
    if (filename === '_effect_no_signal') {
      // 元動画準拠: 下半分に巨大TV1台 + 上部に小TV3台
      const tvScreens = [
        { x: 90,  y: 1060, w: 850, h: 640 },                 // 前面巨大メインTV
        { x: -10, y: 560,  w: 380, h: 280, opacity: 0.75 },  // 奥左
        { x: 690, y: 590,  w: 380, h: 270, opacity: 0.70 },  // 奥右
        { x: 280, y: 490,  w: 460, h: 330, opacity: 0.60 },  // 奥中大
      ]
      return (
        <AbsoluteFill style={{ background: '#020208' }}>
          <svg width="1080" height="1920" style={{ position: 'absolute', top: 0, left: 0 }}>
            {tvScreens.map((tv, i) => {
              const scanOffset = (frame * 3 + i * 41) % Math.max(1, tv.h / 8)
              const blueIntensity = 100 + i * 14
              // メインTV(index=0)は太いノイズライン、小TVは細いライン
              const isMainTV = i === 0
              const lineCount = isMainTV ? 20 : 10
              const lineH = isMainTV ? 6 : 2
              const lineOpacity = isMainTV ? 0.55 : 0.4
              return (
                <g key={i} opacity={tv.opacity ?? 1}>
                  {/* TVボディ外枠（暗めのグレー） */}
                  <rect x={tv.x - 30} y={tv.y - 28} width={tv.w + 60} height={tv.h + 80}
                    fill="#1a1a24" rx={isMainTV ? 18 : 10} />
                  {/* TVボディ内枠（ハイライト） */}
                  <rect x={tv.x - 22} y={tv.y - 20} width={tv.w + 44} height={tv.h + 64}
                    fill="none" stroke="#2a2a3a" strokeWidth={isMainTV ? 3 : 2} rx={isMainTV ? 14 : 8} />
                  {/* 画面ベゼル（濃い枠） */}
                  <rect x={tv.x - 8} y={tv.y - 8} width={tv.w + 16} height={tv.h + 16}
                    fill="#050510" rx={isMainTV ? 6 : 4} />
                  {/* 画面（ブルーグロー） */}
                  <rect x={tv.x} y={tv.y} width={tv.w} height={tv.h}
                    fill={`rgb(0,20,${blueIntensity})`} />
                  {/* スキャンライン */}
                  {Array.from({ length: lineCount }, (_, j) => (
                    <rect key={j}
                      x={tv.x} y={tv.y + j * (tv.h / lineCount) + scanOffset}
                      width={tv.w} height={lineH} fill={`rgba(0,0,0,${lineOpacity})`} />
                  ))}
                  {/* グリッチライン（ランダムな水平帯） — メインTVは複数 */}
                  {isMainTV ? (
                    <>
                      <rect x={tv.x} y={tv.y + ((frame * 7) % tv.h)} width={tv.w} height={10} fill="rgba(0,0,80,0.5)" />
                      <rect x={tv.x} y={tv.y + ((frame * 11 + 200) % tv.h)} width={tv.w} height={7} fill="rgba(0,20,120,0.4)" />
                      <rect x={tv.x} y={tv.y + ((frame * 5 + 400) % tv.h)} width={tv.w} height={14} fill="rgba(0,0,40,0.6)" />
                    </>
                  ) : (
                    <rect x={tv.x} y={tv.y + ((frame * 7 + i * 53) % tv.h)}
                      width={tv.w} height={4 + (i % 3) * 2}
                      fill={`rgba(0,100,${blueIntensity + 60},0.3)`} />
                  )}
                  {/* NO SIGNAL テキスト */}
                  <text x={tv.x + tv.w / 2} y={tv.y + tv.h / 2 + tv.h * 0.04}
                    textAnchor="middle" fill="white"
                    fontSize={Math.round(tv.w * 0.13)} fontFamily="monospace" fontWeight="bold"
                    opacity={0.88 + Math.sin(frame * 0.2 + i * 1.5) * 0.08}>
                    NO SIGNAL
                  </text>
                  {/* TVスタンド */}
                  <rect x={tv.x + tv.w / 2 - (isMainTV ? 30 : 18)} y={tv.y + tv.h + 32}
                    width={isMainTV ? 60 : 36} height={isMainTV ? 22 : 14} fill="#181820" rx={5} />
                  {/* スタンド底面 */}
                  <rect x={tv.x + tv.w / 2 - (isMainTV ? 60 : 36)} y={tv.y + tv.h + 54}
                    width={isMainTV ? 120 : 72} height={isMainTV ? 12 : 8} fill="#141420" rx={3} />
                </g>
              )
            })}
          </svg>
        </AbsoluteFill>
      )
    }
  }

  const darkOverlay = bg === 'white_black' ? 0
    : bg === 'classroom_dark' ? 0.6
    : bg === 'library_dark' ? 0.55
    : bg === 'classroom_blackboard' ? 0.15
    : bg === 'classroom_bright' ? 0
    : 0.15

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

// ── Top Overlay: 参考動画準拠の黒帯（約13%）──
const TITLE_BAR_HEIGHT = 350
const ReproTopOverlay: React.FC = () => (
  <div style={{
    position: 'absolute',
    top: 0, left: 0, width: '100%', height: TITLE_BAR_HEIGHT,
    background: '#000000',
    pointerEvents: 'none',
    zIndex: 8,
  }} />
)

// ── Title Text: クリーム/ベージュ・画面幅90%・白アウトライン付き ──
// 参考動画準拠: タイトルは画面幅80%超の巨大テキスト
// 参考動画準拠: オレンジ〜ピーチ色・白太縁取り・左上寄せ・250px帯に収まるサイズ
const TITLE_LINE1_STYLE: React.CSSProperties = {
  fontFamily: '"Noto Sans JP", sans-serif',
  fontWeight: 900, fontSize: 145,
  color: '#FF7722',
  WebkitTextStroke: '8px #FFFFFF',
  paintOrder: 'stroke fill',
  textShadow: '5px 5px 0px rgba(0,0,0,0.95), 7px 7px 0px rgba(0,0,0,0.5)',
  lineHeight: 1.0,
  letterSpacing: 3,
}

const TITLE_LINE2_STYLE: React.CSSProperties = {
  ...TITLE_LINE1_STYLE,
  fontSize: 155,
}

const ReproTitleText: React.FC<{ band: ReproTitleBand }> = ({ band }) => {
  const color = band.textColor || '#FF7722'
  const stroke = band.strokeColor || '#FFFFFF'
  const sw = band.strokeWidth || 8
  return (
  <div style={{
    position: 'absolute',
    top: 0, left: 0, width: 1080, height: TITLE_BAR_HEIGHT,
    zIndex: 11,
    display: 'flex', flexDirection: 'column',
    alignItems: 'flex-start', justifyContent: 'center',
    paddingLeft: 55,
    gap: 4,
    pointerEvents: 'none',
  }}>
    <div style={{...TITLE_LINE1_STYLE, color, WebkitTextStroke: `${sw}px ${stroke}`}}>{band.line1}</div>
    <div style={{...TITLE_LINE2_STYLE, color, WebkitTextStroke: `${sw}px ${stroke}`}}>{band.line2}</div>
  </div>
  )
}

// ── REC Overlay ──
const RecOverlay: React.FC = () => {
  const frame = useCurrentFrame()
  const dotOpacity = Math.abs(Math.sin(frame * 0.08)) * 0.4 + 0.6
  return (
    <div style={{
      position: 'absolute',
      top: 1000,
      left: 40,
      zIndex: 20,
      display: 'flex',
      alignItems: 'center',
      gap: 18,
      background: 'rgba(0,0,0,0.35)',
      borderRadius: 12,
      padding: '14px 28px 14px 20px',
    }}>
      <div style={{
        width: 100, height: 100,
        borderRadius: '50%',
        background: '#FF0000',
        opacity: dotOpacity,
        flexShrink: 0,
      }} />
      <div style={{
        fontFamily: '"Noto Sans JP", sans-serif',
        fontWeight: 900,
        fontSize: 148,
        color: '#FF0000',
        textShadow: '-6px -6px 0 #FFF, 6px -6px 0 #FFF, -6px 6px 0 #FFF, 6px 6px 0 #FFF',
        letterSpacing: 8,
        lineHeight: 1,
      }}>REC</div>
    </div>
  )
}

// ── Caption with BudouX ──
const ReproCaption: React.FC<{ text: string; speaker: string; effect: string; captionColor?: string; captionTop?: number; captionFontScale?: number }> = ({ text, speaker, effect, captionColor, captionTop, captionFontScale }) => {
  const frame = useCurrentFrame()
  const opacity = interpolate(frame, [0, 2], [0.7, 1], { extrapolateRight: 'clamp' })
  const topPos = captionTop ?? 520

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
        position: 'absolute', top: (captionTop ?? 520), left: 0, width: 1080,
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
  const rawText = text
  const isDialog = rawText.includes('「') || rawText.includes('」')
  const subjectNames = ['数学', '現文', '国語', '理科', '英語', '社会', '体育', '化学', '物理', '倫理']
  const isSubjectName = subjectNames.some(s => rawText.trim() === s)

  // A-6: 教科名 — 黒文字+黄色グロー
  if (isSubjectName) {
    return (
      <div style={{
        position: 'absolute', top: topPos, left: 20, width: 1040,
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
        position: 'absolute', top: topPos, left: 20, width: 1040,
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

  // 元動画準拠: 黄色+ダークブルーアウトライン（ナレーター/男性）、ピンク+ダーク（女性キャラ）
  const textColor = captionColor ?? '#FFD700'
  // テキスト色からストローク色を導出: 黄→ダークブルー、ピンク→ダーク紫、それ以外→白
  const tc = textColor.toUpperCase()
  const strokeColor = (tc === '#FFD700' || tc === '#FFE000' || tc === '#FFC000' || tc === '#FFFF00')
    ? '#0A0087'
    : (tc === '#FF69B4' || tc === '#FF1493')
    ? '#3D0030'
    : '#FFFFFF'
  // フォントサイズ: 元動画は100px級の超巨大テロップ
  // 元動画準拠: BudouXで自然改行 → 最長行に合わせてフォント決定
  const maxW = 1060
  // 実効文字数: 半角英数字は0.6文字分として計算（英字混在テキストの1行判定用）
  const effectiveLen = Array.from(rawText).reduce((sum, c) => sum + (c.charCodeAt(0) < 256 ? 0.6 : 1), 0)
  let lines: string[]
  if (rawText.includes('\n')) {
    // 手動改行あり→そのまま尊重
    lines = rawText.split('\n').filter(s => s.length > 0)
  } else if (effectiveLen <= 9) {
    // 実効9文字以下→1行
    lines = [rawText]
  } else {
    // BudouXに十分な幅を渡して均等2分割（半分+2で余裕）
    const softMax = Math.ceil(rawText.length / 2) + 2
    lines = wrapJapanese(rawText, softMax, 3)
  }
  const longestLine = Math.max(...lines.map(l => l.length))
  // whiteSpace:nowrap + stroke8px で画面幅85%を目指す（クリッピング防止）
  let fontSize = Math.floor(maxW / longestLine * 0.85)
  fontSize = Math.min(fontSize, 200)
  const sw = 8  // 元動画準拠の白縁取り

  const scaledFontSize = Math.floor(fontSize * (captionFontScale ?? 1.0))
  return (
    <div style={{
      position: 'absolute', top: topPos, left: 0, width: 1080,
      zIndex: 9, opacity, overflow: 'visible',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
    }}>
      {lines.map((line, i) => {
        return (
          <div key={i} style={{
            fontFamily: '"Noto Sans JP", sans-serif',
            fontWeight: 900, fontSize: scaledFontSize,
            color: textColor,
            WebkitTextStroke: `${sw}px ${strokeColor}`,
            paintOrder: 'stroke fill',
            textShadow: '3px 3px 0px rgba(0,0,0,0.95), 5px 5px 0px rgba(0,0,0,0.6), -2px -2px 0px rgba(0,0,0,0.5)',
            lineHeight: 1.2, textAlign: 'center',
            letterSpacing: 2,
            whiteSpace: 'nowrap',
          }}>
            {line}
          </div>
        )
      })}
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
            rgba(42,8,69,0.55) 0deg, rgba(74,24,117,0.55) 45deg, rgba(26,5,48,0.55) 90deg, rgba(58,18,101,0.55) 135deg,
            rgba(10,0,32,0.55) 180deg, rgba(74,24,117,0.55) 225deg, rgba(42,8,69,0.55) 270deg, rgba(26,5,48,0.55) 315deg, rgba(42,8,69,0.55) 360deg)`,
        }} />
      </AbsoluteFill>
    )
  }

  if (effect === 'concentration_blue') {
    return (
      <AbsoluteFill style={{ zIndex: 1 }}>
        <div style={{
          width: '100%', height: '100%',
          background: `conic-gradient(from 0deg at 50% 55%,
            ${Array.from({ length: 36 }, (_, i) =>
              `${i % 2 === 0 ? 'rgba(30,100,220,0.8)' : 'rgba(10,40,120,0.9)'} ${i * 10}deg`
            ).join(', ')})`,
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

  // 白い放射集中線（SVG版・参考動画準拠: 太さランダム・高opacity・背景を突き破る）
  if (effect === 'concentration_white') {
    const NUM_LINES = 48
    const cx = 540, cy = 1150
    const lines = Array.from({ length: NUM_LINES }, (_, i) => {
      const baseAngle = (i / NUM_LINES) * 360
      const jitter = (i * 13 % 19) - 9  // ±9度のジッター
      const angleDeg = baseAngle + jitter
      const rad = (angleDeg * Math.PI) / 180
      const len = 1400 + (i * 53 % 500)
      const w = 1 + (i * 7 % 12)  // 1-12px（太さランダム）
      const op = 0.55 + (i * 11 % 40) * 0.01  // 0.55-0.95
      return {
        x2: cx + Math.cos(rad) * len,
        y2: cy + Math.sin(rad) * len,
        w, op,
      }
    })
    return (
      <AbsoluteFill style={{ zIndex: 1 }}>
        <svg width="1080" height="1920" style={{ position: 'absolute', top: 0, left: 0 }}>
          {lines.map((l, i) => (
            <line key={i} x1={cx} y1={cy} x2={l.x2} y2={l.y2}
              stroke={`rgba(255,255,255,${l.op})`} strokeWidth={l.w} />
          ))}
        </svg>
      </AbsoluteFill>
    )
  }

  // スピード線（水平方向・移動演出用）
  if (effect === 'speed_lines') {
    const NUM = 35
    const slines = Array.from({ length: NUM }, (_, i) => {
      const y = (i * 57 + 23) % 1920
      const len = 400 + (i * 43 % 400)
      const w = 3 + (i * 7 % 6)
      const op = 0.5 + (i * 11 % 40) * 0.01
      const speed = 18 + (i * 3 % 15)
      const offset = (i * 137) % 1800
      return { y, len, w, op, speed, offset }
    })
    return (
      <AbsoluteFill style={{ zIndex: 3 }}>
        <svg width="1080" height="1920" style={{ position: 'absolute', top: 0, left: 0 }}>
          {slines.map((l, i) => {
            const x = 1200 - ((frame * l.speed + l.offset) % 2200)
            return (
              <line key={i} x1={x} y1={l.y} x2={x + l.len} y2={l.y}
                stroke={`rgba(200,220,255,${l.op})`} strokeWidth={l.w}
                strokeLinecap="round" />
            )
          })}
        </svg>
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

  if (effect === 'rain') {
    // 参考動画準拠: 超高密度・太い青白雨筋（3倍太く5倍密度）
    const drops = Array.from({ length: 150 }, (_, i) => {
      const x = (i * 7 + 3) % 1080
      const speed = 22 + (i * 7 % 18)
      const y = ((frame * speed + i * 23) % 2400) - 500
      const len = 200 + (i * 41 % 350)
      const opacity = 0.55 + (i * 3 % 35) * 0.01  // 0.55-0.90
      const width = 4 + (i * 4 % 10)  // 4-13px
      return { x, y, len, opacity, width }
    })
    return (
      <AbsoluteFill style={{ zIndex: 1, pointerEvents: 'none' }}>
        <svg width="1080" height="1920" style={{ position: 'absolute', top: 0, left: 0 }}>
          {drops.map((d, i) => (
            <line key={i} x1={d.x} y1={d.y} x2={d.x} y2={d.y + d.len}
              stroke={`rgba(140,210,255,${d.opacity})`} strokeWidth={d.width} />
          ))}
        </svg>
      </AbsoluteFill>
    )
  }

  if (effect === 'sparkle') {
    // 参考動画準拠: 大きな色鮮やかな紙吹雪が画面いっぱいに舞う
    const colors = ['#FF2244', '#2266FF', '#FF44AA', '#FFDD00', '#22CC55', '#FF8800', '#00BBFF', '#FF5500', '#CC33FF', '#44DDFF']
    const particles = Array.from({ length: 80 }, (_, i) => ({
      x: (i * 67 + 30) % 1060 + 10,
      delay: (i * 3) % 20,
      color: colors[i % colors.length],
      rotation: (i * 47) % 360,
      size: 28 + (i * 13) % 40,
    }))
    return (
      <AbsoluteFill style={{ zIndex: 4, pointerEvents: 'none' }}>
        {particles.map((p, i) => {
          const localFrame = Math.max(0, frame - p.delay)
          const speed = 6 + (i * 3) % 12
          const y = ((localFrame * speed) % 2400) - 200
          const rot = (p.rotation + localFrame * 4) % 360
          const wobbleX = Math.sin(localFrame * 0.08 + i) * 25
          return (
            <div key={i} style={{
              position: 'absolute',
              left: p.x + wobbleX,
              top: y,
              width: p.size,
              height: p.size * (i % 3 === 0 ? 0.4 : i % 3 === 1 ? 0.6 : 0.8),
              backgroundColor: p.color,
              transform: `rotate(${rot}deg)`,
              opacity: 0.95,
              borderRadius: i % 5 === 0 ? '50%' : '2px',
            }} />
          )
        })}
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
  if (symbol === '!?' || symbol === 'exclamation' || symbol === 'exclaim') {
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
  if (symbol === 'sparkle') {
    return (
      <AbsoluteFill style={{ zIndex: 7, pointerEvents: 'none' }}>
        {[
          { left: 100, top: 700, size: 50 },
          { left: 900, top: 750, size: 40 },
          { left: 500, top: 650, size: 35 },
          { left: 200, top: 900, size: 30 },
          { left: 800, top: 950, size: 45 },
        ].map((s, i) => (
          <div key={i} style={{
            position: 'absolute', left: s.left + Math.sin(frame * 0.15 + i) * 10,
            top: s.top + Math.cos(frame * 0.1 + i) * 8,
            fontSize: s.size, opacity: 0.85,
            transform: `rotate(${frame * 3 + i * 72}deg)`,
          }}>✨</div>
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
  if (symbol === 'camera_arrow') {
    // 元動画準拠: 大きなオレンジ矢印が下向きに隠しカメラ位置を指す
    const arrowBounce = Math.sin(frame * 0.25) * 12
    return (
      <AbsoluteFill style={{ zIndex: 8, pointerEvents: 'none' }}>
        <svg width="1080" height="1920" style={{ position: 'absolute', top: 0, left: 0 }}>
          {/* 大きなオレンジ矢印（元動画準拠） */}
          <polygon
            points={`490,${900 + arrowBounce} 590,${900 + arrowBounce} 590,${1050 + arrowBounce} 650,${1050 + arrowBounce} 540,${1180 + arrowBounce} 430,${1050 + arrowBounce} 490,${1050 + arrowBounce}`}
            fill="#FF6600"
            stroke="#FF3300"
            strokeWidth={6}
            opacity={0.92}
          />
        </svg>
      </AbsoluteFill>
    )
  }
  return null
}

// ── Character Layer ──
const ReproCharacterLayer: React.FC<{
  characters: ReproCharacter[]
  basePath: string
  characterZoom?: { from: number; to: number }
  characterSlide?: { fromX: number; toX: number }
  durationFrames: number
}> = ({ characters, basePath, characterZoom, characterSlide, durationFrames }) => {
  const frame = useCurrentFrame()
  const zoomScale = characterZoom
    ? interpolate(frame, [0, durationFrames], [characterZoom.from, characterZoom.to], { extrapolateRight: 'clamp' })
    : 1.0
  const slideX = characterSlide
    ? interpolate(frame, [0, durationFrames], [characterSlide.fromX, characterSlide.toX], { extrapolateRight: 'clamp' })
    : 0
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
      <div style={{
        width: '100%', height: '100%', position: 'absolute',
        transform: `scale(${zoomScale}) translateX(${slideX}px)`,
        transformOrigin: 'center 35%',
      }}>
      {allChars.map((char) => {
          const groupTotal = posGroups[char.position]
          const groupIndex = posIndexes[char.position] ?? 0
          posIndexes[char.position] = groupIndex + 1
          const pos = resolvePosition(char.position, groupIndex, groupTotal)
          // Scale down significantly for multi-character scenes to avoid overlap
          const crowdFactor = allChars.length > 3 ? 0.55 : allChars.length > 1 ? 0.55 : 1.0
          const size = 1300 * char.scale * crowdFactor
          const float = Math.sin((frame + char.globalIdx * 11) / 30) * 3
          // Bottom-anchor: character always sits near screen bottom, never invading subtitle zone
          const bottomPx = 55 - float
          return (
            <Img
              key={`${char.type}-${char.globalIdx}`}
              src={getCharacterSrc(char.type, basePath)}
              style={{
                position: 'absolute',
                left: pos.x - size / 2,
                bottom: bottomPx,
                width: size, height: size, objectFit: 'contain',
                objectPosition: 'bottom center',
              }}
            />
          )
        })}
      </div>
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
      {/* タイトルテキスト（デフォルト：エピソードAタイトル） */}
      <ReproTitleText band={timeline.titleBand} />

      {timeline.shots.map((shot) => {
        const duration = Math.max(1, shot.endFrame - shot.startFrame)
        // エピソードタイトル上書き（オムニバス形式対応）
        const shotBand = shot.episodeTitleOverride
          ? { ...timeline.titleBand, line2: shot.episodeTitleOverride }
          : null
        return (
          <Sequence key={shot.id} from={shot.startFrame} durationInFrames={duration}>
            <AbsoluteFill>
              <ReproBackground bg={shot.background} basePath={assetBasePath} camera={shot.camera} />
              <ReproEffectLayer effect={shot.effect} />
              <ReproCharacterLayer characters={shot.characters} basePath={assetBasePath} characterZoom={shot.characterZoom} characterSlide={shot.characterSlide} durationFrames={duration} />
              <ReproMangaSymbol symbol={shot.mangaSymbol} />
              {shot.text && <ReproCaption text={shot.text} speaker={shot.speaker} effect={shot.effect} captionColor={shot.captionColor} captionTop={shot.captionTop} captionFontScale={shot.captionFontScale} />}
              {shot.showREC && <RecOverlay />}
              {shotBand && <ReproTitleText band={shotBand} />}
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
