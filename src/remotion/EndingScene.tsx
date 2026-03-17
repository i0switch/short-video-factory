import React from 'react'
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { RenderScene } from '../schema/render-plan'
import { TEMPLATE } from './design-tokens'
import { OutlineText } from './OutlineText'
import { Sunburst } from './Sunburst'

interface EndingSceneProps {
  scene: RenderScene
}

export const EndingScene: React.FC<EndingSceneProps> = ({ scene }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const scale = spring({
    frame,
    fps,
    config: { mass: 0.5, stiffness: 200, damping: 12 },
  })

  return (
    <AbsoluteFill style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <Sunburst />
      <div style={{
        position: 'relative',
        zIndex: 1,
        width: '80%',
        transform: `scale(${scale})`,
        transformOrigin: 'center',
        opacity: scale > 0.01 ? 1 : 0,
      }}>
        <OutlineText
          fontSize={TEMPLATE.endingScene.fontSize}
          color={TEMPLATE.endingScene.color}
          strokeWidth={TEMPLATE.endingScene.strokeWidth}
          strokeColor={TEMPLATE.endingScene.strokeColor}
        >
          {scene.title}
        </OutlineText>
      </div>
    </AbsoluteFill>
  )
}
