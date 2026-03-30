import React from 'react'
import { AbsoluteFill, OffthreadVideo, staticFile } from 'remotion'

export interface ReferenceMirrorConfig {
  sourceVideoSrc: string
  durationInFrames: number
  playbackRate: number
}

interface Props {
  config: ReferenceMirrorConfig
}

export const ReferenceMirrorComposition: React.FC<Props> = ({ config }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: '#000000' }}>
      <OffthreadVideo
        src={staticFile(config.sourceVideoSrc)}
        playbackRate={config.playbackRate}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />
    </AbsoluteFill>
  )
}
