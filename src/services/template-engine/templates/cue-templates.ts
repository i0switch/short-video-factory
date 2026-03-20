import type { CueTemplateDef, CueTemplateId } from '../../../schema/template-engine'

/** Default duration in frames for each cue type */
export const CUE_DEFAULTS: Record<CueTemplateId, { durationFrames: number }> = {
  caption_in_fast:        { durationFrames: 6 },
  caption_replace_snap:   { durationFrames: 3 },
  flash_short:            { durationFrames: 4 },
  shake_small:            { durationFrames: 8 },
  shake_impact:           { durationFrames: 12 },
  concentration_lines_on: { durationFrames: 30 },
  vortex_on:              { durationFrames: 30 },
  sparkle_on:             { durationFrames: 30 },
  lightning_flash:        { durationFrames: 6 },
  rain_on:                { durationFrames: 60 },
  se_hit:                 { durationFrames: 8 },
  se_reveal:              { durationFrames: 12 },
  bgm_duck_short:         { durationFrames: 30 },
  manga_symbol_pop:       { durationFrames: 10 },
}

/** Maps 2ch effect names to cue template IDs */
export const EFFECT_TO_CUE: Record<string, CueTemplateId> = {
  concentration_lines: 'concentration_lines_on',
  vortex: 'vortex_on',
  lightning: 'lightning_flash',
  sparkle: 'sparkle_on',
  rain: 'rain_on',
  shake: 'shake_impact',
}

let cueCounter = 0

export function resetCueCounter(): void {
  cueCounter = 0
}

/**
 * Create a CueTemplate instance.
 * If startFrame/endFrame are not provided, endFrame defaults to startFrame + default duration.
 */
export function getCueTemplate(
  type: CueTemplateId,
  startFrame: number,
  endFrame?: number,
  params?: Record<string, unknown>,
): CueTemplateDef {
  cueCounter++
  const defaults = CUE_DEFAULTS[type]
  const resolvedEnd = endFrame ?? startFrame + defaults.durationFrames
  return {
    id: type,
    type,
    startFrame,
    endFrame: resolvedEnd,
    ...(params ? { params } : {}),
  }
}
