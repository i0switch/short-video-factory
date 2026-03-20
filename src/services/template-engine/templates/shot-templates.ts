import type { ShotTemplateDef, ShotTemplateId } from '../../../schema/template-engine'

const SHOT_TEMPLATES: Record<ShotTemplateId, ShotTemplateDef> = {
  intro_title: {
    id: 'intro_title',
    background: { type: 'scene' },
    character: { position: 'center', scale: 1.0, framing: 'bust' },
    caption: { position: 'top-left', maxCharsPerLine: 12, fontSize: 72 },
  },
  narration_plain: {
    id: 'narration_plain',
    background: { type: 'scene' },
    character: { position: 'center', scale: 1.0, framing: 'bust' },
    caption: { position: 'top-left', maxCharsPerLine: 12, fontSize: 72 },
  },
  reaction_closeup: {
    id: 'reaction_closeup',
    background: { type: 'emotion' },
    character: { position: 'center', scale: 1.2, framing: 'closeup' },
    caption: { position: 'top-left', maxCharsPerLine: 12, fontSize: 72 },
  },
  object_reveal: {
    id: 'object_reveal',
    background: { type: 'scene' },
    character: { position: 'none', scale: 0, framing: 'none' },
    caption: { position: 'center', maxCharsPerLine: 10, fontSize: 80 },
  },
  explanation_cut: {
    id: 'explanation_cut',
    background: { type: 'scene' },
    character: { position: 'center', scale: 0.9, framing: 'bust' },
    caption: { position: 'top-left', maxCharsPerLine: 14, fontSize: 64 },
  },
  two_person_dialog: {
    id: 'two_person_dialog',
    background: { type: 'scene' },
    character: { position: 'left', scale: 1.0, framing: 'bust' },
    caption: { position: 'top-left', maxCharsPerLine: 12, fontSize: 72 },
  },
  punchline_freeze: {
    id: 'punchline_freeze',
    background: { type: 'effect' },
    character: { position: 'center', scale: 1.1, framing: 'closeup' },
    caption: { position: 'center', maxCharsPerLine: 10, fontSize: 80 },
    camera: { zoomFrom: 1.0, zoomTo: 1.05 },
  },
  aftermath_caption: {
    id: 'aftermath_caption',
    background: { type: 'scene' },
    character: { position: 'center', scale: 1.0, framing: 'bust' },
    caption: { position: 'top-left', maxCharsPerLine: 12, fontSize: 72 },
  },
  group_scene: {
    id: 'group_scene',
    background: { type: 'scene' },
    character: { position: 'center', scale: 0.8, framing: 'full' },
    caption: { position: 'top-left', maxCharsPerLine: 14, fontSize: 64 },
  },
  episode_title_card: {
    id: 'episode_title_card',
    background: { type: 'emotion' },
    character: { position: 'none', scale: 0, framing: 'none' },
    caption: { position: 'center', maxCharsPerLine: 10, fontSize: 96 },
  },
}

export function getShotTemplate(id: ShotTemplateId): ShotTemplateDef {
  return SHOT_TEMPLATES[id]
}

export { SHOT_TEMPLATES }
