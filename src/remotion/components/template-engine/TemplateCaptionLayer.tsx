import React from 'react'
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion'
import { wrapJapanese } from '../../../utils/text-wrap'

export const TemplateCaptionLayer: React.FC<{
  text: string
  x: number
  y: number
  width: number
  fontSize: number
  align: 'left' | 'center' | 'right'
  color: string
}> = ({ text, x, y, width, fontSize, align, color }) => {
  const frame = useCurrentFrame()
  if (!text) return null

  const opacity = interpolate(frame, [0, 6], [0, 1], { extrapolateRight: 'clamp' })
  const wrapWidth = Math.max(6, Math.floor(width / Math.max(1, fontSize * 0.88)))
  const lines = wrapJapanese(text, wrapWidth, 3)

  return (
    <AbsoluteFill style={{ zIndex: 4, pointerEvents: 'none' }}>
      <div
        style={{
          position: 'absolute',
          left: x,
          top: y,
          width,
          opacity,
        }}
      >
        <div
          style={{
            width: 6,
            height: 38,
            borderRadius: 999,
            background: color,
            boxShadow: `0 0 10px ${color}`,
            marginBottom: 10,
          }}
        />
        {lines.map((line, index) => (
          <div
            key={`${line}-${index}`}
            style={{
              fontFamily: '"Noto Sans JP", sans-serif',
              fontWeight: 900,
              fontSize,
              lineHeight: 1.22,
              color,
              WebkitTextStroke: '6px #000000',
              paintOrder: 'stroke fill',
              textShadow: '4px 4px 10px rgba(0,0,0,0.75)',
              whiteSpace: 'pre-line',
              textAlign: align,
            }}
          >
            {line}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  )
}
