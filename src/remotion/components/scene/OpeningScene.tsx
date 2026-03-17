// OpeningScene — Intro シーン (DEFINITIVE_v3)
// introLinePopIn タイミング:
//   行1: F3-9, 行2: F11-18, 行3: F19-26, 行4: F26-32
// 行の色: introBlack=黒, introRed=赤+黒縁, introYellow=黄+黒縁
// duration: 102f
import React from 'react'
import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { BackgroundLayer } from '../background/BackgroundLayer'
import { FONT_FAMILY, FONT_WEIGHT } from '../../constants/typography'
import { COLORS } from '../../constants/colors'
import { blackFlash1f, sceneBrightnessIn, introLinePop } from '../animation/AnimationPreset'
import { INTRO_LINE_STAGGER } from '../../constants/timing'
import type { V3IntroLine, V3Background } from '../../types/video-v3'

interface OpeningSceneProps {
  lines: V3IntroLine[]
  background: V3Background
}

const LINE_FONT_SIZE = 76

const getLineColor = (style: V3IntroLine['style']): { color: string; stroke?: string; strokeWidth?: number } => {
  switch (style) {
    case 'introRed':    return { color: COLORS.openingRed, stroke: COLORS.black, strokeWidth: 6 }
    case 'introYellow': return { color: COLORS.openingYellow, stroke: COLORS.black, strokeWidth: 6 }
    case 'introBlack':
    default:            return { color: COLORS.openingBlack }
  }
}

export const OpeningScene: React.FC<OpeningSceneProps> = ({ lines, background }) => {
  const frame = useCurrentFrame()

  const flashOpacity = blackFlash1f(frame)
  const brightness = sceneBrightnessIn(frame)

  return (
    <AbsoluteFill style={{ filter: brightness }}>
      <BackgroundLayer
        colorA={background.colorA}
        colorB={background.colorB}
        centerX={background.centerX}
        centerY={background.centerY}
        burstCount={background.burstCount}
      />

      {/* タイトル行 (stagger pop-in) */}
      <div
        style={{
          position: 'absolute',
          top: 120,
          left: 60,
          right: 60,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          zIndex: 30,
        }}
      >
        {lines.map((line, i) => {
          const stagger = INTRO_LINE_STAGGER[i] ?? [i * 8, i * 8 + 6]
          const anim = introLinePop(frame, stagger[0], stagger[1])
          const style = getLineColor(line.style)
          return (
            <div key={i} style={{ textAlign: 'center', ...anim }}>
              <span
                style={{
                  fontFamily: `'${FONT_FAMILY}', sans-serif`,
                  fontWeight: FONT_WEIGHT,
                  fontSize: LINE_FONT_SIZE,
                  color: style.color,
                  ...(style.stroke ? {
                    WebkitTextStroke: `${style.strokeWidth}px ${style.stroke}`,
                    paintOrder: 'stroke fill',
                  } : {}),
                  textShadow: '2px 2px 8px rgba(0,0,0,0.6)',
                  lineHeight: 1.2,
                  display: 'block',
                }}
              >
                {line.text}
              </span>
            </div>
          )
        })}
      </div>

      {/* 1f黒フラッシュ */}
      {flashOpacity > 0 && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: '#000',
            opacity: flashOpacity,
            zIndex: 1000,
            pointerEvents: 'none',
          }}
        />
      )}
    </AbsoluteFill>
  )
}
