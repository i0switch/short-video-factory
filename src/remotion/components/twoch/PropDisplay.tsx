import React from 'react'
import { Img, staticFile, useCurrentFrame, interpolate } from 'remotion'
import type { PropConfig } from '../../types/video-2ch'

interface Props {
  props: PropConfig[]
}

const POSITION_STYLES: Record<string, React.CSSProperties> = {
  left: {
    left: '4%',
    bottom: '25%',
    transform: 'translateX(0)',
  },
  right: {
    right: '4%',
    bottom: '25%',
    transform: 'translateX(0)',
  },
  'top-right': {
    right: '5%',
    top: '38%',
    transform: 'translateX(0)',
  },
  'top-left': {
    left: '5%',
    top: '38%',
    transform: 'translateX(0)',
  },
}

/** スライドイン方向: 位置に応じて端から登場 */
const SLIDE_DIRECTION: Record<string, number> = {
  left: -80,
  right: 80,
  'top-right': 80,
  'top-left': -80,
}

export const PropDisplay: React.FC<Props> = ({ props }) => {
  const frame = useCurrentFrame()

  if (props.length === 0) return null

  return (
    <>
      {props.map((prop, idx) => {
        const opacity = interpolate(frame, [0, 3], [0, 1], { extrapolateRight: 'clamp' })
        const slideX = interpolate(
          frame,
          [0, 8],
          [SLIDE_DIRECTION[prop.position] ?? 0, 0],
          { extrapolateRight: 'clamp' },
        )
        const posStyle = POSITION_STYLES[prop.position] ?? POSITION_STYLES['top-right']
        const width = `${Math.round(prop.scale * 35)}%`

        return (
          <div
            key={idx}
            style={{
              position: 'absolute',
              ...posStyle,
              width,
              opacity,
              transform: `${posStyle.transform ?? ''} translateX(${slideX}px)`,
              zIndex: 15,
              pointerEvents: 'none',
              filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.4))',
            }}
          >
            <Img
              src={staticFile(prop.imageSrc)}
              style={{
                width: '100%',
                objectFit: 'contain',
                maxHeight: 380,
              }}
              onError={() => { /* prop取得失敗時は非表示 */ }}
            />
          </div>
        )
      })}
    </>
  )
}
