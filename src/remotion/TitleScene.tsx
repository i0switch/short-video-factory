import React from 'react'
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import { RenderScene } from '../schema/render-plan'
import { TEMPLATE } from './design-tokens'
import { OutlineText } from './OutlineText'
import { Sunburst } from './Sunburst'

interface TitleSceneProps {
  scene: RenderScene
}

/** RenderPlan の titleLines か、videoTitle を自動分割して行データを返す */
function resolveLines(scene: RenderScene) {
  if (scene.titleLines && scene.titleLines.length > 0) return scene.titleLines
  // fallback: title を改行で分割
  const lines = scene.title.split(/\n/).filter(Boolean)
  const defaultColors = TEMPLATE.titleScene.lines.map(l => l.color)
  return lines.map((text, i) => ({ text, color: defaultColors[i % defaultColors.length] }))
}

export const TitleScene: React.FC<TitleSceneProps> = ({ scene }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const lines = resolveLines(scene)
  const staggerFrames = Math.round(TEMPLATE.titleScene.animation.staggerDelaySec * fps)

  return (
    <AbsoluteFill style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start',
      paddingTop: 100,
      paddingBottom: 80,
      gap: TEMPLATE.titleScene.lineSpacing,
    }}>
      <Sunburst />

      {/* タイトル行（行ごとに時差 pop-in） */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        width: '88%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: TEMPLATE.titleScene.lineSpacing,
      }}>
        {lines.map((line, i) => {
          const delay = i * staggerFrames
          const scale = spring({
            frame: Math.max(0, frame - delay),
            fps,
            config: { mass: 0.5, stiffness: 200, damping: 12 },
          })
          return (
            <div key={i} style={{ transform: `scale(${scale})`, transformOrigin: 'center', opacity: scale > 0.01 ? 1 : 0 }}>
              <OutlineText
                fontSize={TEMPLATE.titleScene.fontSize}
                color={line.color}
                strokeWidth={TEMPLATE.titleScene.strokeWidth}
                strokeColor={TEMPLATE.titleScene.strokeColor}
              >
                {line.text}
              </OutlineText>
            </div>
          )
        })}
      </div>

      {/* 関連画像（傾き + 白枠） */}
      {scene.imagePath ? (
        <div style={{
          position: 'relative',
          zIndex: 1,
          opacity: interpolate(frame, [10, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
          transform: `rotate(${TEMPLATE.titleScene.image.rotationDeg}deg)`,
          border: `${TEMPLATE.titleScene.image.borderWidth}px solid ${TEMPLATE.titleScene.image.borderColor}`,
          boxShadow: '2px 2px 8px rgba(0,0,0,0.3)',
          display: 'inline-block',
          marginTop: TEMPLATE.titleScene.image.marginTop,
          overflow: 'hidden',
        }}>
          <Img
            src={staticFile(scene.imagePath)}
            style={{
              maxWidth: Math.round(TEMPLATE.canvas.width * TEMPLATE.titleScene.image.widthPercent / 100),
              objectFit: 'contain',
              display: 'block',
            }}
          />
        </div>
      ) : null}
    </AbsoluteFill>
  )
}
