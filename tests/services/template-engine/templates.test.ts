import { describe, it, expect, beforeEach } from 'vitest'
import { getShotTemplate, SHOT_TEMPLATES } from '../../../src/services/template-engine/templates/shot-templates'
import { getCueTemplate, CUE_DEFAULTS, EFFECT_TO_CUE, resetCueCounter } from '../../../src/services/template-engine/templates/cue-templates'
import { NewShotTemplateSchema, NewCueTemplateSchema } from '../../../src/schema/template-engine'

describe('shot-templates', () => {
  it('SHOT_TEMPLATES has all 10 entries', () => {
    expect(Object.keys(SHOT_TEMPLATES)).toHaveLength(10)
  })

  it('getShotTemplate returns correct template', () => {
    const t = getShotTemplate('punchline_freeze')
    expect(t.id).toBe('punchline_freeze')
    expect(t.camera).toBeDefined()
    expect(t.camera!.zoomFrom).toBe(1.0)
  })

  it('all templates pass schema validation', () => {
    for (const [id, template] of Object.entries(SHOT_TEMPLATES)) {
      const result = NewShotTemplateSchema.safeParse(template)
      expect(result.success, `Template ${id} failed validation: ${JSON.stringify(result.error?.issues)}`).toBe(true)
    }
  })

  it('object_reveal has no character', () => {
    const t = getShotTemplate('object_reveal')
    expect(t.character.position).toBe('none')
    expect(t.character.framing).toBe('none')
  })

  it('episode_title_card uses emotion background', () => {
    const t = getShotTemplate('episode_title_card')
    expect(t.background.type).toBe('emotion')
    expect(t.caption.fontSize).toBe(96)
  })
})

describe('cue-templates', () => {
  beforeEach(() => {
    resetCueCounter()
  })

  it('CUE_DEFAULTS has all 14 entries', () => {
    expect(Object.keys(CUE_DEFAULTS)).toHaveLength(14)
  })

  it('getCueTemplate returns valid cue', () => {
    const cue = getCueTemplate('flash_short', 10)
    expect(cue.id).toBe('flash_short')
    expect(cue.startFrame).toBe(10)
    expect(cue.endFrame).toBe(10 + CUE_DEFAULTS.flash_short.durationFrames)
  })

  it('getCueTemplate respects explicit endFrame', () => {
    const cue = getCueTemplate('shake_impact', 0, 100)
    expect(cue.endFrame).toBe(100)
  })

  it('getCueTemplate passes params', () => {
    const cue = getCueTemplate('se_hit', 5, undefined, { volume: 0.8 })
    expect(cue.params).toEqual({ volume: 0.8 })
  })

  it('getCueTemplate result passes schema validation', () => {
    const cue = getCueTemplate('concentration_lines_on', 0)
    const result = NewCueTemplateSchema.safeParse(cue)
    expect(result.success).toBe(true)
  })

  it('EFFECT_TO_CUE maps known effects', () => {
    expect(EFFECT_TO_CUE['concentration_lines']).toBe('concentration_lines_on')
    expect(EFFECT_TO_CUE['shake']).toBe('shake_impact')
    expect(EFFECT_TO_CUE['lightning']).toBe('lightning_flash')
  })

  it('EFFECT_TO_CUE does not map "none"', () => {
    expect(EFFECT_TO_CUE['none']).toBeUndefined()
  })
})
