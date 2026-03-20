import type { TimelineJson } from '../../schema/template-engine'
import type { TwoChVideoConfig, TwoChSceneConfig } from '../../remotion/types/video-2ch'

export interface BeatMeta {
  beat_id: string
  text: string
  speaker: string
  emotion: string
  narration?: string
  effect?: string
}

const SPEAKER_COLORS: Record<string, string> = {
  narrator: '#4A90D9',
  character1: '#D94A4A',
  character2: '#4AD97A',
}

/**
 * Bridge a TimelineJson + metadata into a TwoChVideoConfig for Remotion rendering.
 */
export function bridgeToTwoChConfig(
  timeline: TimelineJson,
  videoTitle: string,
  seriesTitle: string,
  beatMetas: BeatMeta[],
  fps: number,
): TwoChVideoConfig {
  const metaMap = new Map(beatMetas.map((m) => [m.beat_id, m]))

  const scenes: TwoChSceneConfig[] = timeline.entries.map((entry) => {
    const meta = metaMap.get(entry.beat_id)
    const speaker = meta?.speaker ?? 'narrator'
    const emotion = meta?.emotion ?? 'neutral'
    const effect = meta?.effect ?? 'none'
    const text = meta?.text ?? ''

    return {
      durationFrames: entry.endFrame - entry.startFrame,
      speaker,
      speakerColor: SPEAKER_COLORS[speaker] ?? SPEAKER_COLORS.narrator,
      text,
      emotion,
      effect,
      audioSrc: '',
      imageSrc: '',
      fallbackUsed: false,
    }
  })

  return {
    meta: {
      fps,
      width: 1080,
      height: 1920,
      audioSampleRate: 44100,
    },
    videoTitle,
    seriesTitle,
    titleColor: '#FFD700',
    scenes,
    outro: {
      text: 'チャンネル登録よろしく！',
      durationFrames: 90,
    },
  }
}
