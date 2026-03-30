import React from 'react'
import { AbsoluteFill, Audio, Sequence, staticFile } from 'remotion'
import { TitleBandV2 } from '../components/shotcue/TitleBandV2'
import { CaptionTextV2 } from '../components/shotcue/CaptionTextV2'
import { CharacterLayerV2 } from '../components/shotcue/CharacterLayerV2'
import { SceneBackgroundV2 } from '../components/shotcue/SceneBackgroundV2'

// ── Timeline types (frame-based, no durationMs) ──

export interface TimelineShot {
  id: string
  startFrame: number
  endFrame: number
  background: {
    src: string            // relative path from project root
  }
  character: {
    src: string            // relative path or empty
  }
  caption: {
    text: string
  }
  effect?: string          // "none" | "vortex" | "concentration_lines" | "sparkle" | "rain"
  audioSrc?: string        // per-shot TTS audio (relative path)
}

export interface TimelineCue {
  id: string
  frame: number
  type: string             // e.g. "caption_change", "effect_start", "effect_end"
  payload?: Record<string, unknown>
}

export interface ShotCueTimeline {
  fps: number
  width: number
  height: number
  totalFrames: number
  seriesTitle: string
  episodeTitle: string
  shots: TimelineShot[]
  cues: TimelineCue[]
}

// ── Composition ──

export const ShotCueComposition: React.FC<{
  timeline: ShotCueTimeline
}> = ({ timeline }) => {
  const { shots, seriesTitle, episodeTitle } = timeline

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {/* Each shot as a Remotion Sequence */}
      {shots.map((shot) => {
        const durationInFrames = shot.endFrame - shot.startFrame
        if (durationInFrames <= 0) return null

        return (
          <Sequence
            key={shot.id}
            from={shot.startFrame}
            durationInFrames={durationInFrames}
          >
            {/* z=0: Scene background */}
            <SceneBackgroundV2
              src={shot.background.src ? staticFile(shot.background.src) : ''}
            />

            {/* z=1: Effect background (placeholder for future EffectLayer integration) */}
            {shot.effect && shot.effect !== 'none' && (
              <AbsoluteFill style={{ zIndex: 1 }}>
                {/* Effect rendering — extensible hook for vortex/concentration_lines/sparkle/rain */}
                <EffectPlaceholder type={shot.effect} />
              </AbsoluteFill>
            )}

            {/* z=2: Prop layer (reserved, no-op for now) */}

            {/* z=3: Character */}
            <CharacterLayerV2
              characterSrc={shot.character.src ? staticFile(shot.character.src) : ''}
            />

            {/* z=4: Caption text — rendered exactly ONCE per shot */}
            <CaptionTextV2 text={shot.caption.text} />

            {/* Per-shot audio */}
            {shot.audioSrc && (
              <Audio src={staticFile(shot.audioSrc)} />
            )}
          </Sequence>
        )
      })}

      {/* z=5: Title band — ALWAYS rendered, outside sequences */}
      <TitleBandV2 seriesTitle={seriesTitle} episodeTitle={episodeTitle} />
    </AbsoluteFill>
  )
}

// ── Minimal effect placeholder ──
// This can be replaced with a full EffectLayer later.

const EffectPlaceholder: React.FC<{ type: string }> = ({ type }) => {
  const styles: Record<string, React.CSSProperties> = {
    vortex: {
      width: '100%',
      height: '100%',
      background: 'radial-gradient(ellipse at center, rgba(107,63,160,0.4) 0%, transparent 70%)',
    },
    concentration_lines: {
      width: '100%',
      height: '100%',
      background: 'radial-gradient(circle at center, transparent 30%, rgba(255,255,255,0.15) 31%, transparent 32%, transparent 34%, rgba(255,255,255,0.1) 35%, transparent 36%)',
    },
    sparkle: {
      width: '100%',
      height: '100%',
      background: 'radial-gradient(circle at 20% 30%, rgba(255,255,255,0.6) 0%, transparent 3%), radial-gradient(circle at 70% 20%, rgba(255,255,255,0.5) 0%, transparent 2%), radial-gradient(circle at 50% 80%, rgba(255,255,255,0.4) 0%, transparent 3%)',
    },
    rain: {
      width: '100%',
      height: '100%',
      background: 'linear-gradient(180deg, rgba(68,136,204,0.2) 0%, rgba(68,136,204,0.4) 100%)',
    },
  }

  return <div style={styles[type] ?? {}} />
}

// ── Helper to compute total frames from timeline ──

export function getShotCueTotalFrames(timeline: ShotCueTimeline): number {
  if (timeline.totalFrames > 0) return timeline.totalFrames
  if (timeline.shots.length === 0) return 0
  return Math.max(...timeline.shots.map((s) => s.endFrame))
}
