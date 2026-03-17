// BurstBackground — conic-gradient サンバースト (Phase 2 で実装)
import React from 'react'
import { AbsoluteFill } from 'remotion'

interface BurstBackgroundProps {
  color1: string
  color2: string
  stripeCount: number
  rotation: number
  centerX?: number  // 0-100 (%)
  centerY?: number  // 0-100 (%)
}

export const BurstBackground: React.FC<BurstBackgroundProps> = ({
  color1,
  color2,
  stripeCount,
  rotation,
  centerX = 50,
  centerY = 53,
}) => {
  const angle = 360 / stripeCount
  const half = angle / 2
  const stops: string[] = []
  for (let i = 0; i < stripeCount; i++) {
    const start = i * angle
    stops.push(`${color1} ${start}deg ${start + half}deg`)
    stops.push(`${color2} ${start + half}deg ${start + angle}deg`)
  }
  // at <cx> <cy> で回転中心を指定 (50%, 53% = 下寄りの中心)
  const gradient = `conic-gradient(from 0deg at ${centerX}% ${centerY}%, ${stops.join(', ')})`

  return (
    <AbsoluteFill style={{ overflow: 'hidden', background: color1 }}>
      <div
        style={{
          position: 'absolute',
          width: '210%',
          height: '210%',
          left: '-55%',
          top: '-55%',
          transform: `rotate(${rotation}deg)`,
          transformOrigin: 'center center',
          background: gradient,
        }}
      />
    </AbsoluteFill>
  )
}
