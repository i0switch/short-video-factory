// CtaScene — Outro CTA シーン (DEFINITIVE_v3)
// outroLinePopIn タイミング: 行1: F2-8, 行2: F11-16, 行3: F18-23
// テキスト: 赤#CC0000 + 黒縁 + 黒shadow, fontSize 100-120px
// duration: 63f
import React from 'react'
import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { BackgroundLayer } from '../background/BackgroundLayer'
import { FONT_FAMILY, FONT_WEIGHT } from '../../constants/typography'
import { COLORS } from '../../constants/colors'
import { blackFlash1f, sceneBrightnessIn, outroLinePop } from '../animation/AnimationPreset'
import { OUTRO_LINE_STAGGER } from '../../constants/timing'
import type { V3Background } from '../../types/video-v3'

interface CtaSceneProps {
  lines: string[]
  background: V3Background
}

const BASE_FONT_SIZE = 110

export const CtaScene: React.FC<CtaSceneProps> = ({ lines, background }) => {
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

      <AbsoluteFill
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 30,
        }}
      >
        <div style={{ textAlign: 'center', padding: '0 60px' }}>
          {lines.map((line, i) => {
            const isLast = i === lines.length - 1
            const stagger = OUTRO_LINE_STAGGER[i] ?? [i * 8 + 2, i * 8 + 8]
            const anim = outroLinePop(frame, stagger[0], stagger[1])
            // 最終行はさらに大きく
            const fontSize = isLast ? BASE_FONT_SIZE * 1.1 : BASE_FONT_SIZE
            return (
              <div key={i} style={anim}>
                <span
                  style={{
                    fontFamily: `'${FONT_FAMILY}', sans-serif`,
                    fontWeight: FONT_WEIGHT,
                    fontSize,
                    color: COLORS.ctaRed,
                    WebkitTextStroke: `8px ${COLORS.black}`,
                    paintOrder: 'stroke fill',
                    textShadow: '0px 0px 14px rgba(0,0,0,0.9), 3px 3px 8px rgba(0,0,0,0.8)',
                    lineHeight: 1.25,
                    display: 'block',
                  }}
                >
                  {line}
                </span>
              </div>
            )
          })}
        </div>
      </AbsoluteFill>

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
