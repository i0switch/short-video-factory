import React from 'react'
import { useCurrentFrame, interpolate } from 'remotion'

type SymbolType = 'none' | 'surprise' | 'sweat' | 'anger' | 'music' | 'tears' | 'heart'

interface Props {
  symbol: SymbolType
}

const SYMBOL_CONFIG: Record<Exclude<SymbolType, 'none'>, { content: string; color: string; fontSize: number }> = {
  surprise: { content: '!?', color: '#FF2020', fontSize: 110 },
  sweat:    { content: '💧', color: '#87CEEB', fontSize: 90 },
  anger:    { content: '💢', color: '#FF3333', fontSize: 100 },
  music:    { content: '♪♪', color: '#FFD700', fontSize: 95 },
  tears:    { content: '😢', color: '#4488FF', fontSize: 100 },
  heart:    { content: '♥', color: '#FF69B4', fontSize: 110 },
}

export const MangaSymbolOverlay: React.FC<Props> = ({ symbol }) => {
  const frame = useCurrentFrame()

  if (symbol === 'none') return null

  const config = SYMBOL_CONFIG[symbol]
  if (!config) return null

  // Pop-in: scale 0 → 1.2 → 1.0 over 6 frames
  const popScale = interpolate(frame, [0, 3, 6], [0, 1.2, 1.0], {
    extrapolateRight: 'clamp',
  })

  // Gentle bobbing after pop-in (starts at frame 6)
  const bobOffset = frame > 6
    ? Math.sin((frame - 6) * 0.15) * 4
    : 0

  // Use text rendering for surprise (3D-style bold text), emoji for others
  const isSurprise = symbol === 'surprise'

  const symbolStyle: React.CSSProperties = {
    position: 'absolute',
    top: `${62 + bobOffset * 0.1}%`,
    left: '68%',
    transform: `translate(-50%, -50%) scale(${popScale})`,
    fontSize: config.fontSize,
    color: config.color,
    opacity: 0.9,
    zIndex: 50,
    lineHeight: 1,
    pointerEvents: 'none',
    ...(isSurprise
      ? {
          fontWeight: 900,
          fontFamily: '"Noto Sans JP", "Hiragino Kaku Gothic Pro", sans-serif',
          WebkitTextStroke: '3px #880000',
          textShadow: '4px 4px 0 #880000, 6px 6px 0 rgba(0,0,0,0.3)',
          letterSpacing: '-4px',
        }
      : {}),
  }

  return <div style={symbolStyle}>{config.content}</div>
}
