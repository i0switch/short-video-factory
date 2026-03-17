// CtaScene — Outro CTA シーン (spec v5: エフェクトなし・突然中央表示)
// テキスト: 赤#CC0000 + 黒縁 + 黒shadow, fontSize 100-120px
// duration: 63f
import React from 'react'
import { AbsoluteFill, Audio, staticFile } from 'remotion'
import { BackgroundLayer } from '../background/BackgroundLayer'
import { FONT_FAMILY, FONT_WEIGHT } from '../../constants/typography'
import { COLORS } from '../../constants/colors'
import type { V3Background } from '../../types/video-v3'

interface CtaSceneProps {
  lines: string[]
  background: V3Background
  audioSrc?: string
}

const BASE_FONT_SIZE = 110

export const CtaScene: React.FC<CtaSceneProps> = ({ lines, background, audioSrc }) => {
  // spec v5: CTAはエフェクトなし。突然中央に大きく表示 (アニメーション一切なし)
  return (
    <AbsoluteFill>
      {/* CTA音声 */}
      {audioSrc && <Audio src={staticFile(audioSrc)} />}
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
            const fontSize = isLast ? BASE_FONT_SIZE * 1.1 : BASE_FONT_SIZE
            return (
              <div key={i}>
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
    </AbsoluteFill>
  )
}
