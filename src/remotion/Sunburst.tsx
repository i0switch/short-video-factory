import React from 'react'
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion'
import { TEMPLATE } from './design-tokens'

function generateSunburstGradient(light: string, dark: string, rays: number): string {
  const angle = 360 / rays
  const half = angle / 2
  const stops: string[] = []
  for (let i = 0; i < rays; i++) {
    const start = i * angle
    stops.push(`${light} ${start}deg ${start + half}deg`)
    stops.push(`${dark} ${start + half}deg ${start + angle}deg`)
  }
  return `conic-gradient(${stops.join(', ')})`
}

export const Sunburst: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const rotationDeg = (frame / fps) * TEMPLATE.sunburst.rotationSpeedDegPerSec

  return (
    // overflow:hidden で回転時の黒角を隠す
    <AbsoluteFill style={{ overflow: 'hidden', background: TEMPLATE.sunburst.colorLight }}>
      <div style={{
        position: 'absolute',
        width: '160%',
        height: '160%',
        left: '-30%',
        top: '-30%',
        transform: `rotate(${rotationDeg}deg)`,
        transformOrigin: 'center center',
        background: generateSunburstGradient(
          TEMPLATE.sunburst.colorLight,
          TEMPLATE.sunburst.colorDark,
          TEMPLATE.sunburst.rayCount,
        ),
      }} />
    </AbsoluteFill>
  )
}
