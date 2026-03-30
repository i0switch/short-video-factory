import React from 'react'
import { AbsoluteFill, Img } from 'remotion'

export const CharacterLayerV2: React.FC<{
  characterSrc: string
}> = ({ characterSrc }) => {
  if (!characterSrc) return null

  return (
    <AbsoluteFill style={{ zIndex: 3 }}>
      <Img
        src={characterSrc}
        style={{
          position: 'absolute',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          maxWidth: 900,
          maxHeight: 1200,
          objectFit: 'contain',
        }}
      />
    </AbsoluteFill>
  )
}
