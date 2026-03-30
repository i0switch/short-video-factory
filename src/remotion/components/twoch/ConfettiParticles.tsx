import React from 'react'
import { useCurrentFrame, interpolate } from 'remotion'

const COLORS = ['#FF3366', '#3366FF', '#9933FF', '#FFCC00', '#33CC66', '#FF9900']

const PARTICLES = Array.from({ length: 40 }, (_, i) => ({
  id: i,
  x: (i * 37 + 13) % 100, // pseudo-random x 0-100%
  delay: (i * 7) % 30, // stagger delay in frames
  color: COLORS[i % COLORS.length],
  rotation: (i * 47) % 360,
  size: 12 + (i * 11) % 20,
  xDrift: ((i * 23) % 40) - 20, // horizontal drift -20 to +20%
}))

interface Props {
  durationFrames: number
}

export const ConfettiParticles: React.FC<Props> = ({ durationFrames }) => {
  const frame = useCurrentFrame()

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 50 }}>
      {PARTICLES.map((p) => {
        const localFrame = Math.max(0, frame - p.delay)
        const progress = interpolate(
          localFrame,
          [0, Math.max(durationFrames - p.delay - 1, 1)],
          [0, 1],
          { extrapolateRight: 'clamp' },
        )
        const yPos = interpolate(progress, [0, 1], [-5, 110])
        const rot = p.rotation + progress * 720
        const opacity = interpolate(progress, [0, 0.1, 0.85, 1], [0, 1, 1, 0], { extrapolateRight: 'clamp' })
        const xPos = p.x + p.xDrift * Math.sin(progress * Math.PI * 3)

        return (
          <div
            key={p.id}
            style={{
              position: 'absolute',
              left: `${xPos}%`,
              top: `${yPos}%`,
              width: p.size,
              height: p.size * 0.6,
              backgroundColor: p.color,
              borderRadius: 2,
              opacity,
              transform: `rotate(${rot}deg)`,
            }}
          />
        )
      })}
    </div>
  )
}
