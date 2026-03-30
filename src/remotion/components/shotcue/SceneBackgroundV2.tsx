import React from 'react'
import { AbsoluteFill, Img } from 'remotion'

export const SceneBackgroundV2: React.FC<{
  src: string
}> = ({ src }) => {
  return (
    <AbsoluteFill style={{ zIndex: 0 }}>
      {src ? (
        <Img
          src={src}
          style={{
            width: 1080,
            height: 1920,
            objectFit: 'cover',
          }}
        />
      ) : (
        <div style={{ width: 1080, height: 1920, backgroundColor: '#222' }} />
      )}
      {/* 30% black overlay */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: 1080,
          height: 1920,
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
        }}
      />
    </AbsoluteFill>
  )
}
