import React from 'react'
import { AbsoluteFill, Audio, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import { RenderScene } from '../schema/render-plan'
import { TEMPLATE } from './design-tokens'
import { OutlineText } from './OutlineText'
import { Sunburst } from './Sunburst'
import { TextBox } from './TextBox'

interface RankingSceneProps {
  scene: RenderScene
}

const FPS = 30
const PHASE_A_END = Math.round(TEMPLATE.rankingScene.subSceneA.animation.topicFadeSlide.delaySec * FPS + 60)  // ~69
const PHASE_B_END = PHASE_A_END + 75
const SLIDE_DUR = Math.round(TEMPLATE.rankingScene.subSceneB.animation.durationSec * FPS)  // 9

function slideX(frame: number, start: number): number {
  return interpolate(frame - start, [0, SLIDE_DUR], [-1200, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
}

export const RankingScene: React.FC<RankingSceneProps> = ({ scene }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const aEnd = scene.subSceneTiming?.aEndFrame ?? PHASE_A_END
  const bEnd = scene.subSceneTiming?.bEndFrame ?? PHASE_B_END

  // 順位 pop-in
  const rankScale = spring({
    frame,
    fps,
    config: { mass: 0.5, stiffness: 200, damping: 12 },
    durationInFrames: Math.round(TEMPLATE.rankingScene.subSceneA.animation.rankPopIn.durationSec * fps),
  })

  const inPhaseA = frame < aEnd
  const inPhaseC = frame >= bEnd

  // トピックテキスト: フェーズA のみ（フェードアウト）
  const topicOpacity = interpolate(frame, [aEnd - 8, aEnd], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  const comment1X = inPhaseA ? -1200 : slideX(frame, aEnd)
  const comment2X = frame < bEnd ? -1200 : slideX(frame, bEnd)

  const imgOpacity = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  const { subSceneA, subSceneB, subSceneC } = TEMPLATE.rankingScene

  return (
    <AbsoluteFill style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start',
      padding: '100px 40px 60px',
      gap: 16,
    }}>
      <Sunburst />

      {/* 順位 pop-in */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        transform: `scale(${rankScale})`,
        transformOrigin: 'center',
      }}>
        <OutlineText
          fontSize={subSceneA.rankText.fontSize}
          color={subSceneA.rankText.color}
          strokeColor={subSceneA.rankText.strokeColor}
          strokeWidth={subSceneA.rankText.strokeWidth}
        >
          {`第${scene.rank}位`}
        </OutlineText>
      </div>

      {/* フェーズA: トピックテキスト（赤・大・縁取り） */}
      {frame < aEnd + 2 && (
        <div style={{
          opacity: topicOpacity,
          position: 'relative',
          zIndex: 1,
          width: '90%',
          textAlign: 'center',
        }}>
          <OutlineText
            fontSize={subSceneA.topicText.fontSize}
            color={subSceneA.topicText.color}
            strokeColor={subSceneA.topicText.strokeColor}
            strokeWidth={subSceneA.topicText.strokeWidth}
          >
            {scene.topic ?? scene.title}
          </OutlineText>
        </div>
      )}

      {/* フェーズB/C: comment1 青枠ボックス */}
      {!inPhaseA && (
        <div style={{
          position: 'relative',
          zIndex: 1,
          width: `${subSceneB.commentBox.widthPercent}%`,
          transform: `translateX(${comment1X}px)`,
        }}>
          <TextBox>{scene.comment1 ?? ''}</TextBox>
        </div>
      )}

      {/* フェーズC: comment2 赤背景ボックス */}
      {inPhaseC && (
        <div style={{
          position: 'relative',
          zIndex: 1,
          width: `${subSceneC.commentBox.widthPercent}%`,
          transform: `translateX(${comment2X}px)`,
          background: subSceneC.commentBox.background,
          borderRadius: subSceneC.commentBox.borderRadius,
          paddingTop: subSceneC.commentBox.paddingVertical,
          paddingBottom: subSceneC.commentBox.paddingVertical,
          paddingLeft: subSceneC.commentBox.paddingHorizontal,
          paddingRight: subSceneC.commentBox.paddingHorizontal,
          fontFamily: `'${TEMPLATE.fonts.primary}', sans-serif`,
          fontSize: subSceneC.commentBox.fontSize,
          fontWeight: TEMPLATE.fonts.weight,
          color: subSceneC.commentBox.textColor,
          textAlign: 'center',
          lineHeight: 1.4,
          wordBreak: 'keep-all',
          overflowWrap: 'break-word',
          boxSizing: 'border-box',
          marginTop: subSceneC.commentBox.marginTop,
        }}>
          {scene.comment2 ?? ''}
        </div>
      )}

      {/* 画像（フェーズ全体） */}
      {scene.imagePath ? (
        <div style={{
          opacity: imgOpacity,
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          justifyContent: 'center',
          marginTop: 8,
        }}>
          <Img
            src={staticFile(scene.imagePath)}
            style={{
              maxWidth: 600,
              maxHeight: 500,
              objectFit: 'contain',
              display: 'block',
            }}
          />
        </div>
      ) : null}

      {scene.audioPath && <Audio src={staticFile(scene.audioPath)} />}
    </AbsoluteFill>
  )
}
