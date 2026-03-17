// VideoScene — シーンラッパー（BackgroundLayerは外から注入）
import React from 'react'
import { AbsoluteFill } from 'remotion'

interface VideoSceneProps {
  children?: React.ReactNode
}

export const VideoScene: React.FC<VideoSceneProps> = ({ children }) => {
  return (
    <AbsoluteFill>
      {children}
    </AbsoluteFill>
  )
}
