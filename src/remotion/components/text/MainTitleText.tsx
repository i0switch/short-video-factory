// MainTitleText — Phase1 見出し (DEFINITIVE_v3)
// IN: F24-33 (headlinePopIn), OUT: F75-84 (headlineFadeOut) で消える
import React from 'react'
import { useCurrentFrame } from 'remotion'
import { FONT_FAMILY, FONT_WEIGHT, FONT_SIZE, STROKE_WIDTH, TEXT_SHADOW } from '../../constants/typography'
import { COLORS } from '../../constants/colors'
import { MAIN_TITLE } from '../../constants/layout'
import { Z_INDEX } from '../../constants/zIndex'
import { headlinePopIn, headlineFadeOut } from '../animation/AnimationPreset'

interface MainTitleTextProps {
  lines: string[]
  fontSize?: number
}

// DEFINITIVE_v3: 赤fill + 白stroke10-14px + 黒shadow blur18-28
// 位置: x=270, y=805, w=540, h=220, 中央揃え
// IN: F24-33, OUT: F75-84 (消える)
export const MainTitleText: React.FC<MainTitleTextProps> = ({
  lines,
  fontSize = FONT_SIZE.mainTitle,
}) => {
  const frame = useCurrentFrame()

  // F84以降は完全非表示 (headlineFadeOut後)
  if (frame >= 84) return null

  const inAnim = headlinePopIn(frame)
  const outAnim = headlineFadeOut(frame)

  // F75以降はOUTアニメーション、それ以前はINアニメーション
  const anim = frame >= 75 ? outAnim : inAnim

  return (
    <div
      style={{
        position: 'absolute',
        top: MAIN_TITLE.y,
        left: MAIN_TITLE.x,
        width: MAIN_TITLE.width,
        textAlign: 'center',
        zIndex: Z_INDEX.mainTitle,
        ...anim,
      }}
    >
      {lines.map((line, i) => (
        <span
          key={i}
          style={{
            fontFamily: `'${FONT_FAMILY}', sans-serif`,
            fontWeight: FONT_WEIGHT,
            fontSize,
            color: COLORS.mainTitleFill,
            WebkitTextStroke: `10px #FFFFFF`,
            paintOrder: 'stroke fill',
            textShadow: '0 0 20px rgba(0,0,0,0.8), 3px 3px 6px rgba(0,0,0,0.6)',
            lineHeight: 1.3,
            whiteSpace: 'pre',
            display: 'block',
          }}
        >
          {line}
        </span>
      ))}
    </div>
  )
}
