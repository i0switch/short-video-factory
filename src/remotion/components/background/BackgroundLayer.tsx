// BackgroundLayer — 常時右回転サンバースト (spec v5: 12秒で1回転)
import React from 'react'
import { useCurrentFrame, useVideoConfig } from 'remotion'
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
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  // 旧 VideoConfig 互換パス
  const c1 = colorA ?? config?.color1 ?? '#FB9B18'
  const c2 = colorB ?? config?.color2 ?? '#FED04B'
  const cx = centerX !== undefined ? centerX * 100 : (config ? (config.center.x / 1080) * 100 : 50)
  const cy = centerY !== undefined ? centerY * 100 : (config ? (config.center.y / 1920) * 100 : 51)
  const count = burstCount ?? config?.stripeCount ?? 40

  // 常時右回転: 12秒で1回転 (spec v5)
  const rotation = (frame / fps) * (360 / 12)

  return (
    <BurstBackground
      color1={c1}
      color2={c2}
      stripeCount={count}
      rotation={rotation}
      centerX={cx}
      centerY={cy}
    />
  )
}
