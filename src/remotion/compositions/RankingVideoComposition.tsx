// RankingVideoComposition — DEFINITIVE_v3 メインComposition
import React from 'react'
import { Sequence } from 'remotion'
import { OpeningScene } from '../components/scene/OpeningScene'
import { RankingScene } from '../components/scene/RankingScene'
import { CtaScene } from '../components/scene/CtaScene'
import { buildTimeline } from '../components/timeline/TimelineController'
import type { VideoV3Config } from '../types/video-v3'

interface Props {
  config: VideoV3Config
}

export const RankingVideoComposition: React.FC<Props> = ({ config }) => {
  const timeline = buildTimeline(config)

  return (
    <>
      {timeline.map((entry, i) => (
        <Sequence
          key={i}
          from={entry.startFrame}
          durationInFrames={entry.durationFrames}
        >
          {entry.type === 'opening' && (
            <OpeningScene lines={config.intro.lines} background={config.theme.background} audioSrc={config.intro.audioSrc} introImageSrc={config.intro.imageSrc} />
          )}
          {entry.type === 'ranking' && entry.rankIndex !== undefined && (
            <RankingScene
              scene={config.scenes[entry.rankIndex]}
              theme={config.theme}
            />
          )}
          {entry.type === 'ending' && (
            <CtaScene lines={config.outro.lines} background={config.theme.background} audioSrc={config.outro.audioSrc} />
          )}
        </Sequence>
      ))}
    </>
  )
}
