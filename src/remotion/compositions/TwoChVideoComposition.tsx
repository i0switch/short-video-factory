import React from 'react'
import { AbsoluteFill, Sequence, Audio, staticFile } from 'remotion'
import { TwoChScene } from '../components/twoch/TwoChScene'
import { TitleBar } from '../components/twoch/TitleBar'
import { EpisodeTitleCard } from '../components/twoch/EpisodeTitleCard'
import { buildTwoChTimeline } from '../components/timeline/TwoChTimelineController'
import { isTwoChScene, isEpisodeTitle } from '../types/video-2ch'
import type { TwoChVideoConfig, TwoChSceneConfig, TwoChEpisodeTitleConfig } from '../types/video-2ch'
import { FONT_FAMILY, FONT_WEIGHT } from '../constants/typography'

interface Props {
  config: TwoChVideoConfig
}

export const TwoChVideoComposition: React.FC<Props> = ({ config }) => {
  const timeline = buildTwoChTimeline(config)
  const totalFrames = timeline.length > 0
    ? timeline[timeline.length - 1].startFrame + timeline[timeline.length - 1].durationFrames
    : 0

  return (
    <AbsoluteFill>
      {config.masterAudioSrc && (
        <Audio
          src={staticFile(config.masterAudioSrc)}
          startFrom={0}
          endAt={totalFrames}
        />
      )}

      {/* TitleBar: always visible on top (unless hidden) */}
      {!config.hideTitle && (
        <TitleBar
          title={config.videoTitle}
          seriesTitle={config.seriesTitle}
          titleColor={config.titleColor}
        />
      )}

      {/* Scene sequences */}
      {timeline.filter((e) => e.durationFrames > 0).map((entry, i) => (
        <Sequence
          key={i}
          from={entry.startFrame}
          durationInFrames={entry.durationFrames}
        >
          {entry.type === 'scene' && entry.sceneIndex !== undefined && (
            <TwoChScene
              scene={config.scenes[entry.sceneIndex] as TwoChSceneConfig}
              hideCaption={config.hideCaption}
            />
          )}
          {entry.type === 'episode_title' && entry.sceneIndex !== undefined && (
            <EpisodeTitleCard
              title={(config.scenes[entry.sceneIndex] as TwoChEpisodeTitleConfig).title}
            />
          )}
          {entry.type === 'outro' && (
            <AbsoluteFill style={{ background: '#111111' }}>
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
              }}>
                <span style={{
                  fontFamily: `'${FONT_FAMILY}', sans-serif`,
                  fontWeight: FONT_WEIGHT,
                  fontSize: 72,
                  color: '#FFFFFF',
                  WebkitTextStroke: '4px #000000',
                  paintOrder: 'stroke fill' as React.CSSProperties['paintOrder'],
                  textShadow: '3px 3px 8px rgba(0,0,0,0.8)',
                  whiteSpace: 'nowrap',
                }}>
                  {config.outro.text}
                </span>
              </div>
              {config.outro.audioSrc && <Audio src={staticFile(config.outro.audioSrc)} />}
            </AbsoluteFill>
          )}
        </Sequence>
      ))}
    </AbsoluteFill>
  )
}
