// CaptionBox — コメントボックス (DEFINITIVE_v3)
// 上段: F107-115 IN, 下段: F123-131 IN (OUTなし、次シーンの黒フラッシュで消える)
import React from 'react'
import { useCurrentFrame } from 'remotion'
import { FONT_FAMILY, FONT_WEIGHT, FONT_SIZE } from '../../constants/typography'
import { COLORS } from '../../constants/colors'
import { CAPTION_BOX_1, CAPTION_BOX_2, CAPTION_BOX } from '../../constants/layout'
import { Z_INDEX } from '../../constants/zIndex'
import { captionTopSlideFadeIn, captionBotSlideFadeIn } from '../animation/AnimationPreset'

interface CaptionBoxProps {
  text: string
  variant: 'top' | 'bottom'
}

// DEFINITIVE_v3:
// 上段: x=28, y=376, w=992, 青枠#233CFF
// 下段: x=54, y=570, w=936, 赤枠#FA4A3A
// 背景#F5F6EF, 角丸なし, padding 22×18, 黒テキスト, 左揃え
// フォント: 48-56px, 太字
export const CaptionBox: React.FC<CaptionBoxProps> = ({ text, variant }) => {
  const frame = useCurrentFrame()

  const isTop = variant === 'top'
  const anim = isTop ? captionTopSlideFadeIn(frame) : captionBotSlideFadeIn(frame)
  const borderColor = isTop ? COLORS.captionBlueBorder : COLORS.captionRedBorder
  const bbox = isTop ? CAPTION_BOX_1 : CAPTION_BOX_2

  // 表示前は非表示 (F107 / F123 以前は opacity=0 だが念のため)
  const isVisible = isTop ? frame >= 107 : frame >= 123
  if (!isVisible) return null

  return (
    <div
      style={{
        position: 'absolute',
        top: bbox.y,
        left: bbox.x,
        width: bbox.width,
        zIndex: Z_INDEX.caption,
        opacity: anim.opacity,
        transform: anim.transform,
        filter: anim.filter,
      }}
    >
      <div
        style={{
          background: COLORS.captionBackground,
          border: `${CAPTION_BOX.borderWidth}px solid ${borderColor}`,
          paddingTop: CAPTION_BOX.paddingV,
          paddingBottom: CAPTION_BOX.paddingV,
          paddingLeft: CAPTION_BOX.paddingH,
          paddingRight: CAPTION_BOX.paddingH,
          boxSizing: 'border-box',
        }}
      >
        <span
          style={{
            fontFamily: `'${FONT_FAMILY}', sans-serif`,
            fontWeight: FONT_WEIGHT,
            fontSize: FONT_SIZE.caption,
            color: COLORS.captionText,
            lineHeight: 1.3,
            display: 'block',
            whiteSpace: 'pre-line',
            textAlign: 'left',
          }}
        >
          {text}
        </span>
      </div>
    </div>
  )
}
