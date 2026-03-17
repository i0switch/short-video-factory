import React, { useEffect, useState } from 'react'
import { Composition, continueRender, delayRender, registerRoot, staticFile } from 'remotion'
import { RankingVideo } from './RankingVideo'
import { RankingVideoComposition } from './compositions/RankingVideoComposition'
import planData from '../../fixtures/sample-render-plan.json'
import videoData from '../../sample-video.json'
import { RenderPlanSchema } from '../schema/render-plan'
import { getTotalFrames } from './components/timeline/TimelineController'
import type { RenderPlan } from '../schema/render-plan'
import type { VideoV3Config } from './types/video-v3'

const defaultPlan = RenderPlanSchema.parse(planData)
const videoConfig = videoData as unknown as VideoV3Config

const FontLoader: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [handle] = useState(() => delayRender('Loading Noto Sans JP 900'))

  useEffect(() => {
    const fontUrl = staticFile('/assets/fonts/NotoSansJP-VF.ttf')
    const face = new FontFace('Noto Sans JP', `url(${fontUrl})`, {
      weight: '100 900',
      style: 'normal',
    })
    face.load()
      .then((loaded) => {
        document.fonts.add(loaded)
        return document.fonts.load('900 48px "Noto Sans JP"')
      })
      .then(() => continueRender(handle))
      .catch(() => continueRender(handle))
  }, [handle])

  return <>{children}</>
}

export const RemotionRoot: React.FC = () => (
  <FontLoader>
    {/* 旧 Composition (後方互換) */}
    <Composition
      id="RankingVideo"
      component={RankingVideo as unknown as React.ComponentType<Record<string, unknown>>}
      durationInFrames={defaultPlan.totalDurationInFrames}
      fps={defaultPlan.fps}
      width={defaultPlan.width}
      height={defaultPlan.height}
      defaultProps={{ plan: defaultPlan }}
      calculateMetadata={({ props }) => {
        const plan = (props as { plan: RenderPlan }).plan
        return {
          durationInFrames: plan.totalDurationInFrames,
          fps: plan.fps,
          width: plan.width,
          height: plan.height,
        }
      }}
    />

    {/* DEFINITIVE_v3 Composition */}
    <Composition
      id="RankingVideoV2"
      component={RankingVideoComposition as unknown as React.ComponentType<Record<string, unknown>>}
      durationInFrames={getTotalFrames(videoConfig)}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{ config: videoConfig }}
    />
  </FontLoader>
)

registerRoot(RemotionRoot)
