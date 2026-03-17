// BackgroundLayer — 静止サンバースト (DEFINITIVE_v3: 回転・ズームなし)
import React from 'react'
import { BurstBackground } from './BurstBackground'

interface BackgroundLayerProps {
  colorA?: string
  colorB?: string
  centerX?: number  // 0.0-1.0
  centerY?: number  // 0.0-1.0
  burstCount?: number
  // 旧 VideoConfig 互換
  config?: {
    color1: string
    color2: string
    stripeCount: number
    center: { x: number; y: number }
  }
}

export const BackgroundLayer: React.FC<BackgroundLayerProps> = ({
  colorA,
  colorB,
  centerX,
  centerY,
  burstCount,
  config,
}) => {
  // 旧 VideoConfig 互換パス
  const c1 = colorA ?? config?.color1 ?? '#FB9B18'
  const c2 = colorB ?? config?.color2 ?? '#FED04B'
  const cx = centerX !== undefined ? centerX * 100 : (config ? (config.center.x / 1080) * 100 : 50)
  const cy = centerY !== undefined ? centerY * 100 : (config ? (config.center.y / 1920) * 100 : 51)
  const count = burstCount ?? config?.stripeCount ?? 40

  // DEFINITIVE_v3: rotation=0 (静止固定)
  return (
    <BurstBackground
      color1={c1}
      color2={c2}
      stripeCount={count}
      rotation={0}
      centerX={cx}
      centerY={cy}
    />
  )
}
