import type { AudioJson } from '../../schema/template-engine'

const EFFECT_TO_SE: Record<string, string> = {
  shake: 'assets/se/se_hit.mp3',
  concentration_lines: 'assets/se/se_reveal.mp3',
  lightning: 'assets/se/se_reveal.mp3',
  vortex: 'assets/se/se_reveal.mp3',
  sparkle: 'assets/se/se_sparkle.mp3',
  rain: 'assets/se/se_rain.mp3',
}

export interface BeatAudioMeta {
  beat_id: string
  speaker: string
  narration: string
  startFrame: number
  endFrame: number
  effect?: string
}

/**
 * Build an AudioJson plan from beat metadata.
 * Voice segments get placeholder src paths (filled during TTS synthesis).
 * BGM and SE tracks are added automatically.
 */
export function buildAudioPlan(
  beats: BeatAudioMeta[],
  fps: number,
): AudioJson {
  const segments: AudioJson['segments'] = []

  // Voice segments (one per beat)
  for (const beat of beats) {
    segments.push({
      type: 'voice',
      src: `voice_${beat.beat_id}.wav`,
      startFrame: beat.startFrame,
      endFrame: beat.endFrame,
      volume: 1.0,
    })
  }

  // SE segments (for beats with effects)
  for (const beat of beats) {
    if (beat.effect && beat.effect !== 'none') {
      const seSrc = EFFECT_TO_SE[beat.effect]
      if (seSrc) {
        segments.push({
          type: 'se',
          src: seSrc,
          startFrame: beat.startFrame,
          endFrame: Math.min(beat.startFrame + Math.round(0.5 * fps), beat.endFrame),
          volume: 0.6,
        })
      }
    }
  }

  // BGM track (full duration)
  const totalEnd = beats.length > 0 ? beats[beats.length - 1].endFrame : 0
  segments.push({
    type: 'bgm',
    src: 'assets/bgm/ukiuki_lalala.mp3',
    startFrame: 0,
    endFrame: totalEnd,
    volume: 0.12,
  })

  return { segments }
}
