import type { StoryUnit, Beat, BeatRole, ShotTemplateId, CueTemplateId, Emotion } from '../../schema/template-engine'
import { EFFECT_TO_CUE } from './templates/cue-templates'

const EMOTION_INTENSITY: Record<Emotion, number> = {
  neutral: 0,
  happy: 1,
  sad: 1,
  confusion: 2,
  anger: 3,
  shock: 4,
}

function assignRole(
  index: number,
  total: number,
  emotion: Emotion,
  prevEmotion: Emotion | null,
): BeatRole {
  const pos = total <= 1 ? 0 : index / (total - 1)
  const intensity = EMOTION_INTENSITY[emotion]
  const shift = prevEmotion !== null
    ? Math.abs(EMOTION_INTENSITY[emotion] - EMOTION_INTENSITY[prevEmotion])
    : 0

  if (index === 0) return 'intro'
  if (pos > 0.85) {
    // Last unit is outro, others in this zone are aftermath
    if (index === total - 1) return 'outro'
    return 'aftermath'
  }
  if (pos < 0.15) return 'situation'
  if (shift >= 3) return 'climax'
  if (intensity >= 3) return 'reaction'
  if (shift >= 2) return 'incident'
  return 'development'
}

function assignShotTemplate(role: BeatRole, emotion: Emotion): ShotTemplateId {
  switch (role) {
    case 'intro': return 'intro_title'
    case 'situation': return 'narration_plain'
    case 'incident':
    case 'reaction': return 'reaction_closeup'
    case 'climax':
    case 'punchline': return 'punchline_freeze'
    case 'aftermath': return 'aftermath_caption'
    case 'outro': return 'narration_plain'
    case 'development':
      return emotion === 'neutral' ? 'narration_plain' : 'explanation_cut'
  }
}

function assignCueTemplates(
  role: BeatRole,
  effectName: string | undefined,
): CueTemplateId[] {
  const cues: CueTemplateId[] = ['caption_in_fast']

  // Add effect cue from map
  if (effectName && effectName !== 'none') {
    const effectCue = EFFECT_TO_CUE[effectName]
    if (effectCue) {
      cues.push(effectCue)
    }
  }

  // Climax/punchline get extra cues
  if (role === 'climax' || role === 'punchline') {
    cues.push('shake_impact', 'manga_symbol_pop')
  } else if (role === 'incident' || role === 'reaction') {
    cues.push('manga_symbol_pop')
  }

  return cues
}

function deriveAssetNeeds(emotion: Emotion, _role: BeatRole): string[] {
  const needs: string[] = []
  if (EMOTION_INTENSITY[emotion] >= 2) {
    const emotionLabels: Partial<Record<Emotion, string>> = {
      anger: '怒り',
      shock: '驚き',
      confusion: '困惑',
    }
    const label = emotionLabels[emotion]
    if (label) needs.push(`${label}背景`)
  } else {
    needs.push('室内背景')
  }
  return needs
}

/**
 * Assign beat roles, shot/cue templates, and asset needs to story units.
 * Each unit maps 1:1 to a beat.
 */
export function planBeats(
  units: StoryUnit[],
  effectMap?: Map<string, string>,
): Beat[] {
  const total = units.length
  let prevEmotion: Emotion | null = null

  return units.map((unit, index) => {
    const role = assignRole(index, total, unit.emotion, prevEmotion)
    const shotTemplate = assignShotTemplate(role, unit.emotion)
    const effectName = effectMap?.get(unit.id)
    const cueTemplates = assignCueTemplates(role, effectName)
    const assetNeeds = deriveAssetNeeds(unit.emotion, role)

    prevEmotion = unit.emotion

    return {
      beat_id: `b${index + 1}`,
      role,
      text: unit.text,
      speaker: unit.speaker,
      emotion: unit.emotion,
      shot_template: shotTemplate,
      cue_templates: cueTemplates,
      asset_needs: assetNeeds,
      estimated_duration_frames: unit.endFrame - unit.startFrame,
      story_unit_ids: [unit.id],
    }
  })
}
