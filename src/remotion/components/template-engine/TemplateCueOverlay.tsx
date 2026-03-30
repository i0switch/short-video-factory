import React from 'react'
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion'

export const TemplateCueOverlay: React.FC<{
  cueTemplates: string[]
}> = ({ cueTemplates }) => {
  const frame = useCurrentFrame()
  const has = (name: string) => cueTemplates.includes(name)

  const flash = has('flash_short')
    ? interpolate(frame, [0, 1, 3, 5], [0.72, 0.5, 0.15, 0], { extrapolateRight: 'clamp' })
    : 0
  const freeze = has('freeze_hold')
    ? interpolate(frame, [0, 16, 24], [0, 0, 0.28], { extrapolateRight: 'clamp' })
    : 0
  const ring = has('se_hit')
    ? interpolate(frame, [0, 2, 6], [0.65, 0.45, 0], { extrapolateRight: 'clamp' })
    : 0

  if (flash <= 0 && freeze <= 0 && ring <= 0) return null

  return (
    <AbsoluteFill style={{ zIndex: 5, pointerEvents: 'none' }}>
      {flash > 0 && (
        <AbsoluteFill style={{ backgroundColor: '#FFFFFF', opacity: flash }} />
      )}
      {freeze > 0 && (
        <AbsoluteFill style={{ backgroundColor: '#000000', opacity: freeze }} />
      )}
      {ring > 0 && (
        <AbsoluteFill
          style={{
            border: '12px solid rgba(255,255,255,0.75)',
            borderRadius: 32,
            margin: 18,
            opacity: ring,
          }}
        />
      )}
    </AbsoluteFill>
  )
}
