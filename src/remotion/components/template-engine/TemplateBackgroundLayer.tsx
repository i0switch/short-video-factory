import React from 'react'
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion'

type TemplateBackground = {
  motif: string
  tone: string
  pattern: string
}

const PALETTES: Record<string, { top: string; mid: string; bottom: string }> = {
  neutral: { top: '#F4E8D5', mid: '#E7D0B0', bottom: '#D8B98A' },
  anger: { top: '#D84A4A', mid: '#A72121', bottom: '#540F0F' },
  confusion: { top: '#6460D6', mid: '#4338A8', bottom: '#26256C' },
  shock: { top: '#242424', mid: '#121212', bottom: '#000000' },
  happy: { top: '#FFD95E', mid: '#FFB32C', bottom: '#D97A00' },
  sad: { top: '#48698A', mid: '#2A445D', bottom: '#122336' },
}

export const TemplateBackgroundLayer: React.FC<{
  background: TemplateBackground
}> = ({ background }) => {
  const frame = useCurrentFrame()
  const palette = PALETTES[background.tone] ?? PALETTES.neutral
  const drift = interpolate(frame % 120, [0, 60, 120], [0, 1, 0])
  const patternOpacity = background.pattern === 'burst' ? 0.22 : background.pattern === 'halftone' ? 0.16 : 0.11

  const baseStyle: React.CSSProperties = {
    background: `linear-gradient(180deg, ${palette.top} 0%, ${palette.mid} 48%, ${palette.bottom} 100%)`,
  }

  return (
    <AbsoluteFill style={baseStyle}>
      <AbsoluteFill
        style={{
          background: background.pattern === 'stripes'
            ? 'repeating-linear-gradient(135deg, rgba(255,255,255,0.12) 0 16px, rgba(0,0,0,0.02) 16px 32px)'
            : background.pattern === 'dots'
              ? 'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.17) 0 3%, transparent 4%), radial-gradient(circle at 80% 30%, rgba(255,255,255,0.14) 0 3%, transparent 4%), radial-gradient(circle at 40% 75%, rgba(255,255,255,0.12) 0 3%, transparent 4%)'
              : background.pattern === 'burst'
                ? 'conic-gradient(from 0deg at 50% 50%, rgba(255,255,255,0.15) 0deg 10deg, transparent 10deg 20deg, rgba(255,255,255,0.08) 20deg 30deg, transparent 30deg 40deg)'
                : 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.16) 0 3%, transparent 4%)',
          opacity: patternOpacity,
          transform: `scale(${1 + drift * 0.02})`,
          mixBlendMode: 'screen',
        }}
      />
      <AbsoluteFill
        style={{
          background: 'radial-gradient(ellipse at center, transparent 20%, rgba(0,0,0,0.18) 100%)',
        }}
      />
      <AbsoluteFill
        style={{
          background: 'linear-gradient(180deg, rgba(0,0,0,0.06), rgba(0,0,0,0.28))',
        }}
      />
    </AbsoluteFill>
  )
}
