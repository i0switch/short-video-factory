import React from 'react'
import { AbsoluteFill, OffthreadVideo, staticFile } from 'remotion'

export interface ReferenceVideoConfig {
  sourceVideo: string
}

interface Props {
  config: ReferenceVideoConfig
}

export const ReferenceVideoComposition: React.FC<Props> = ({ config }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: '#000000' }}>
      <OffthreadVideo
        src={staticFile(config.sourceVideo)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
        volume={1}
      />
    </AbsoluteFill>
  )
}
