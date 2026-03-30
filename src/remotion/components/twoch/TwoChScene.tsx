import React from 'react'
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, interpolate } from 'remotion'
import { EmotionBackground } from './EmotionBackground'
import { EffectLayer } from './EffectLayer'
import { CharacterDisplay } from './CharacterDisplay'
import { CaptionOverlay } from './CaptionOverlay'
import { MangaSymbolOverlay } from './MangaSymbolOverlay'
import { PropDisplay } from './PropDisplay'
import { ConfettiParticles } from './ConfettiParticles'
import type { TwoChSceneConfig } from '../../types/video-2ch'

interface Props {
  scene: TwoChSceneConfig
  hideCaption?: boolean
}

const CameraWrapper: React.FC<{
  camera: { zoomFrom: number; zoomTo: number; panX: number; panY: number }
  durationFrames: number
  frameOffset?: number
  children: React.ReactNode
}> = ({ camera, durationFrames, frameOffset = 0, children }) => {
  const frame = useCurrentFrame()
  const localFrame = Math.max(0, frame - frameOffset)

  const zoom = interpolate(
    localFrame,
    [0, Math.max(durationFrames - 1, 1)],
    [camera.zoomFrom, camera.zoomTo],
    { extrapolateRight: 'clamp' },
  )
  const panX = interpolate(
    localFrame,
    [0, Math.max(durationFrames - 1, 1)],
    [0, camera.panX],
    { extrapolateRight: 'clamp' },
  )
  const panY = interpolate(
    localFrame,
    [0, Math.max(durationFrames - 1, 1)],
    [0, camera.panY],
    { extrapolateRight: 'clamp' },
  )

  return (
    <AbsoluteFill style={{
      transform: `scale(${zoom}) translate(${panX}px, ${panY}px)`,
      transformOrigin: 'center center',
    }}>
      {children}
    </AbsoluteFill>
  )
}

export const TwoChScene: React.FC<Props> = ({ scene, hideCaption }) => {
  const v4 = scene.v4
  const frame = useCurrentFrame()
  const activeCaptionSegment = scene.captionSegments?.find((segment) => frame >= segment.startFrame && frame < segment.endFrame)
    ?? scene.captionSegments?.[scene.captionSegments.length - 1]
  const activeCameraSegment = scene.cameraSegments?.find((segment) => frame >= segment.startFrame && frame < segment.endFrame)
    ?? scene.cameraSegments?.[scene.cameraSegments.length - 1]
  const activeEffect = scene.effectSegments?.find((segment) => frame >= segment.startFrame && frame < segment.endFrame)?.effect
    ?? scene.effect

  const visualContent = (
    <>
      <EmotionBackground
        emotion={scene.emotion}
        backgroundImageSrc={scene.backgroundImageSrc}
        overlayOpacity={scene.backgroundOverlayOpacity}
      />
      {activeEffect !== 'shake' && activeEffect !== 'none' && (
        <EffectLayer effect={activeEffect} />
      )}
      {scene.imageSrc && (
        <CharacterDisplay
          imageSrc={scene.imageSrc}
          fallbackUsed={scene.fallbackUsed}
          characterSlots={scene.v4?.characterSlots}
        />
      )}
      <MangaSymbolOverlay symbol={(scene.mangaSymbol as 'none' | 'surprise' | 'sweat' | 'anger' | 'music' | 'tears' | 'heart') ?? 'none'} />
    </>
  )

  // Wrap with camera animation if v4 is available
  const visualWithCamera = v4?.camera
    ? (
      <CameraWrapper
        camera={activeCameraSegment?.camera ?? v4.camera}
        durationFrames={(activeCameraSegment?.endFrame ?? scene.durationFrames) - (activeCameraSegment?.startFrame ?? 0)}
        frameOffset={activeCameraSegment?.startFrame ?? 0}
      >
        {visualContent}
      </CameraWrapper>
    )
    : <AbsoluteFill>{visualContent}</AbsoluteFill>

  const visualLayer = activeEffect === 'shake'
    ? <EffectLayer effect="shake">{visualWithCamera}</EffectLayer>
    : visualWithCamera

  return (
    <AbsoluteFill>
      {visualLayer}
      {scene.props && scene.props.length > 0 && (
        <PropDisplay props={scene.props} />
      )}
      {(v4?.shotTemplateId === 'punchline_freeze' || v4?.shotTemplateId === 'aftermath_caption') && (
        <ConfettiParticles durationFrames={scene.durationFrames} />
      )}
      {!hideCaption && (
        <CaptionOverlay
          text={activeCaptionSegment?.text ?? scene.text}
          speakerColor={scene.speakerColor}
          speaker={scene.speaker}
          captionColor={activeCaptionSegment?.caption?.color ?? scene.captionColor}
          fadeInFrames={scene.captionFadeInFrames}
          v4Caption={activeCaptionSegment?.caption ?? v4?.caption}
          v4CaptionZone={activeCaptionSegment?.captionZone ?? v4?.captionZone}
        />
      )}
      {scene.audioSrc && <Audio src={staticFile(scene.audioSrc)} />}
    </AbsoluteFill>
  )
}
