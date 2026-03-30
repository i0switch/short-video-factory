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
import { TwoChVideoComposition } from './compositions/TwoChVideoComposition'
import { ReferenceMirrorComposition } from './compositions/ReferenceMirrorComposition'
import { getTwoChTotalFrames } from './components/timeline/TwoChTimelineController'
import type { TwoChVideoConfig } from './types/video-2ch'
import type { ReferenceMirrorConfig } from './compositions/ReferenceMirrorComposition'
import { ReferenceVideoComposition } from './compositions/ReferenceVideoComposition'
import type { ReferenceVideoConfig } from './compositions/ReferenceVideoComposition'
import { ShotCueComposition, getShotCueTotalFrames } from './compositions/ShotCueComposition'
import type { ShotCueTimeline } from './compositions/ShotCueComposition'
import { ReconstructionComposition } from './compositions/ReconstructionComposition'
import type { ReconstructionAssetsManifest, ReconstructionAudio, ReconstructionStory, ReconstructionTimeline } from '../schema/reconstruction'
import { ReproComposition, getReproTotalFrames } from './compositions/ReproComposition'
import type { ReproTimeline, ReproAudioEntry } from './compositions/ReproComposition'

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
      calculateMetadata={({ props }) => {
        const cfg = (props as { config: VideoV3Config }).config
        return {
          durationInFrames: getTotalFrames(cfg),
          fps: cfg.meta.fps,
          width: cfg.meta.width,
          height: cfg.meta.height,
        }
      }}
    />

    {/* 2ch風ショート動画 Composition */}
    <Composition
      id="TwoChVideo"
      component={TwoChVideoComposition as unknown as React.ComponentType<Record<string, unknown>>}
      durationInFrames={60 * 60}
      fps={60}
      width={1080}
      height={1920}
      defaultProps={{ config: {} as TwoChVideoConfig }}
      calculateMetadata={({ props }) => {
        const cfg = (props as { config: TwoChVideoConfig }).config
        if (!cfg.meta) return { durationInFrames: 60 * 60, fps: 60, width: 1080, height: 1920 }
        return {
          durationInFrames: getTwoChTotalFrames(cfg),
          fps: cfg.meta.fps,
          width: cfg.meta.width,
          height: cfg.meta.height,
        }
      }}
    />

    <Composition
      id="ReferenceVideo"
      component={ReferenceVideoComposition as unknown as React.ComponentType<Record<string, unknown>>}
      durationInFrames={1800}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{ config: { sourceVideo: '' } as ReferenceVideoConfig }}
      calculateMetadata={({ props }) => {
        const cfg = (props as { config: ReferenceVideoConfig & { fps?: number; width?: number; height?: number; durationInFrames?: number } }).config
        return {
          durationInFrames: cfg.durationInFrames ?? 1800,
          fps: cfg.fps ?? 30,
          width: cfg.width ?? 1080,
          height: cfg.height ?? 1920,
        }
      }}
    />

    <Composition
      id="ReferenceMirror"
      component={ReferenceMirrorComposition as unknown as React.ComponentType<Record<string, unknown>>}
      durationInFrames={30 * 60}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{
        config: {
          sourceVideoSrc: '',
          durationInFrames: 30 * 60,
          playbackRate: 1,
        } satisfies ReferenceMirrorConfig,
      }}
      calculateMetadata={({ props }) => {
        const cfg = (props as { config: ReferenceMirrorConfig }).config
        return {
          durationInFrames: cfg.durationInFrames,
          fps: 30000 / 1001,
          width: 1080,
          height: 1920,
        }
      }}
    />
    {/* Shot/Cue architecture Composition */}
    <Composition
      id="ShotCueVideo"
      component={ShotCueComposition as unknown as React.ComponentType<Record<string, unknown>>}
      durationInFrames={30 * 60}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{ timeline: { fps: 30, width: 1080, height: 1920, totalFrames: 1800, seriesTitle: '', episodeTitle: '', shots: [], cues: [] } as ShotCueTimeline }}
      calculateMetadata={({ props }) => {
        const tl = (props as { timeline: ShotCueTimeline }).timeline
        if (!tl.fps) return { durationInFrames: 30 * 60, fps: 30, width: 1080, height: 1920 }
        return {
          durationInFrames: getShotCueTotalFrames(tl),
          fps: tl.fps,
          width: tl.width,
          height: tl.height,
        }
      }}
    />
    <Composition
      id="ReconstructionVideo"
      component={ReconstructionComposition as unknown as React.ComponentType<Record<string, unknown>>}
      durationInFrames={1800}
      fps={60}
      width={1080}
      height={1920}
      defaultProps={{
        story: { videoId: '', seriesTitle: '', episodeTitle: '', fps: 60, width: 1080, height: 1920, units: [] } as ReconstructionStory,
        timeline: { videoId: '', fps: 60, width: 1080, height: 1920, totalFrames: 1800, seriesTitle: '', episodeTitle: '', shots: [], cues: [] } as ReconstructionTimeline,
        audio: { ttsSpeed: 1, sampleRate: 44100, entries: [], bgm: { src: '', volume: 0.1, startFrame: 0, endFrame: 0 }, se: [] } as ReconstructionAudio,
        assetsManifest: { videoId: '', sourceVideoAssets: [], generatedAssets: [], independentAssets: [], contaminationFree: true } as ReconstructionAssetsManifest,
      }}
      calculateMetadata={({ props }) => {
        const tl = (props as { timeline: ReconstructionTimeline }).timeline
        return {
          durationInFrames: tl.totalFrames,
          fps: tl.fps,
          width: tl.width,
          height: tl.height,
        }
      }}
    />
    {/* Repro (元動画再現) Composition */}
    <Composition
      id="ReproVideo"
      component={ReproComposition as unknown as React.ComponentType<Record<string, unknown>>}
      durationInFrames={1800}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{
        timeline: {
          videoId: '', title: '', fps: 30, width: 1080, height: 1920,
          durationSec: 60, totalFrames: 1800, seriesTitle: '', episodeTitle: '',
          titleBand: { line1: '', line2: '', backgroundColor: '#000', textColor: '#FFE000', strokeColor: '#000', strokeWidth: 4, height: 280 },
          shots: [],
        } as ReproTimeline,
        audioEntries: [] as ReproAudioEntry[],
        bgmSrc: '',
        bgmVolume: 0.1,
        assetBasePath: 'assets/repro/EzFYQHX5ICY',
      }}
      calculateMetadata={({ props }) => {
        const tl = (props as { timeline: ReproTimeline }).timeline
        return {
          durationInFrames: getReproTotalFrames(tl),
          fps: tl.fps,
          width: tl.width,
          height: tl.height,
        }
      }}
    />
  </FontLoader>
)

registerRoot(RemotionRoot)
