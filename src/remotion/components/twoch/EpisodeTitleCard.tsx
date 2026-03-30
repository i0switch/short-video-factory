import React from 'react'
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion'
import { FONT_FAMILY, FONT_WEIGHT } from '../../constants/typography'

interface Props {
  title: string
}

export const EpisodeTitleCard: React.FC<Props> = ({ title }) => {
  const frame = useCurrentFrame()
  const opacity = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: 'clamp' })

  return (
    <AbsoluteFill style={{ background: '#111111' }}>
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        opacity,
        textAlign: 'center',
      }}>
        <span style={{
          fontFamily: `'${FONT_FAMILY}', sans-serif`,
          fontWeight: FONT_WEIGHT,
          fontSize: 56,
          color: '#FFFFFF',
          WebkitTextStroke: '3px #333333',
          paintOrder: 'stroke fill' as React.CSSProperties['paintOrder'],
          textShadow: '2px 2px 8px rgba(0,0,0,0.8)',
          lineHeight: 1.3,
        }}>
          {title}
        </span>
      </div>
    </AbsoluteFill>
  )
}
