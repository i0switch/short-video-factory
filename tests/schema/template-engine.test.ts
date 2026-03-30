import { describe, it, expect } from 'vitest'
import {
  SpeakerEnum,
  EmotionEnum,
  EffectEnum,
  BeatRoleEnum,
  ShotTemplateIdEnum,
  CueTemplateIdEnum,
  StoryUnitSchema,
  BeatSchema,
  NewShotTemplateSchema,
  NewCueTemplateSchema,
  TimelineEntrySchema,
  StoryJsonSchema,
  BeatsJsonSchema,
  TimelineJsonSchema,
  AudioJsonSchema,
  AssetManifestEntrySchema,
  AssetManifestSchema,
  NewTemplateManifestSchema,
  TemplateScriptSchema,
} from '../../src/schema/template-engine'

describe('template-engine enums', () => {
  it('SpeakerEnum accepts valid values', () => {
    expect(SpeakerEnum.parse('narrator')).toBe('narrator')
    expect(SpeakerEnum.parse('character1')).toBe('character1')
    expect(SpeakerEnum.parse('character2')).toBe('character2')
  })

  it('SpeakerEnum rejects invalid values', () => {
    expect(() => SpeakerEnum.parse('unknown')).toThrow()
  })

  it('EmotionEnum accepts all values', () => {
    for (const v of ['neutral', 'anger', 'confusion', 'shock', 'happy', 'sad']) {
      expect(EmotionEnum.parse(v)).toBe(v)
    }
  })

  it('EffectEnum accepts all values', () => {
    for (const v of ['none', 'concentration_lines', 'vortex', 'lightning', 'sparkle', 'rain', 'shake']) {
      expect(EffectEnum.parse(v)).toBe(v)
    }
  })

  it('BeatRoleEnum accepts all values', () => {
    for (const v of ['intro', 'situation', 'incident', 'reaction', 'development', 'climax', 'punchline', 'aftermath', 'outro']) {
      expect(BeatRoleEnum.parse(v)).toBe(v)
    }
  })

  it('ShotTemplateIdEnum has 10 entries', () => {
    expect(ShotTemplateIdEnum.options).toHaveLength(10)
  })

  it('CueTemplateIdEnum has 14 entries', () => {
    expect(CueTemplateIdEnum.options).toHaveLength(14)
  })
})

describe('StoryUnitSchema', () => {
  const validUnit = {
    id: 's1',
    speaker: 'narrator',
    text: 'Hello',
    emotion: 'neutral',
    startFrame: 0,
    endFrame: 60,
  }

  it('parses valid story unit', () => {
    const result = StoryUnitSchema.parse(validUnit)
    expect(result.id).toBe('s1')
    expect(result.narration).toBeUndefined()
  })

  it('accepts optional narration', () => {
    const result = StoryUnitSchema.parse({ ...validUnit, narration: 'read aloud text' })
    expect(result.narration).toBe('read aloud text')
  })

  it('rejects missing text', () => {
    expect(() => StoryUnitSchema.parse({ ...validUnit, text: '' })).toThrow()
  })
})

describe('BeatSchema', () => {
  const validBeat = {
    beat_id: 'b1',
    role: 'intro',
    text: 'Opening',
    speaker: 'narrator',
    emotion: 'neutral',
    shot_template: 'intro_title',
    cue_templates: ['caption_in_fast'],
    asset_needs: ['bg_image'],
    estimated_duration_frames: 60,
  }

  it('parses valid beat', () => {
    const result = BeatSchema.parse(validBeat)
    expect(result.beat_id).toBe('b1')
    expect(result.story_unit_ids).toBeUndefined()
  })

  it('accepts story_unit_ids', () => {
    const result = BeatSchema.parse({ ...validBeat, story_unit_ids: ['s1', 's2'] })
    expect(result.story_unit_ids).toEqual(['s1', 's2'])
  })

  it('rejects invalid role', () => {
    expect(() => BeatSchema.parse({ ...validBeat, role: 'badrole' })).toThrow()
  })
})

describe('NewShotTemplateSchema', () => {
  it('parses shot template with camera', () => {
    const result = NewShotTemplateSchema.parse({
      id: 'punchline_freeze',
      background: { type: 'effect' },
      character: { position: 'center', scale: 1.1, framing: 'closeup' },
      caption: { position: 'center', maxCharsPerLine: 10, fontSize: 80 },
      camera: { zoomFrom: 1.0, zoomTo: 1.05 },
    })
    expect(result.camera?.zoomTo).toBe(1.05)
  })

  it('parses shot template without camera', () => {
    const result = NewShotTemplateSchema.parse({
      id: 'narration_plain',
      background: { type: 'scene' },
      character: { position: 'center', scale: 1.0, framing: 'bust' },
      caption: { position: 'top-left', maxCharsPerLine: 12, fontSize: 72 },
    })
    expect(result.camera).toBeUndefined()
  })
})

describe('aggregate schemas', () => {
  it('StoryJsonSchema requires at least 1 unit', () => {
    expect(() => StoryJsonSchema.parse({ units: [] })).toThrow()
  })

  it('BeatsJsonSchema requires at least 1 beat', () => {
    expect(() => BeatsJsonSchema.parse({ beats: [] })).toThrow()
  })

  it('TimelineJsonSchema parses valid data', () => {
    const entry = {
      beat_id: 'b1',
      startFrame: 0,
      endFrame: 60,
      shot: {
        id: 'narration_plain',
        background: { type: 'scene' },
        character: { position: 'center', scale: 1.0, framing: 'bust' },
        caption: { position: 'top-left', maxCharsPerLine: 12, fontSize: 72 },
      },
      cues: [],
    }
    const result = TimelineJsonSchema.parse({ entries: [entry], totalFrames: 60 })
    expect(result.totalFrames).toBe(60)
  })

  it('AudioJsonSchema parses segments', () => {
    const result = AudioJsonSchema.parse({
      segments: [
        { type: 'voice', src: 'v1.wav', startFrame: 0, endFrame: 60 },
      ],
    })
    expect(result.segments).toHaveLength(1)
  })

  it('AssetManifestSchema parses empty assets', () => {
    const result = AssetManifestSchema.parse({ assets: [] })
    expect(result.assets).toEqual([])
  })

  it('TemplateScriptSchema accepts templateId input', () => {
    const result = TemplateScriptSchema.parse({
      templateId: 'suwarenai',
      seriesTitle: '2ch文法テンプレ',
      episodeTitle: 'テスト',
      beats: [{ id: 'b01', text: 'テキスト', narration: 'ナレーション' }],
    })
    expect(result.templateId).toBe('suwarenai')
    expect(result.variant).toBe('default')
  })

  it('TemplateScriptSchema accepts legacy videoId input', () => {
    const result = TemplateScriptSchema.parse({
      videoId: 'e__pjy5Cnhc',
      seriesTitle: '2ch文法テンプレ',
      episodeTitle: 'テスト',
      beats: [{ id: 'b01', text: 'テキスト', narration: 'ナレーション' }],
    })
    expect(result.videoId).toBe('e__pjy5Cnhc')
  })

  it('TemplateScriptSchema requires templateId or videoId', () => {
    expect(() => TemplateScriptSchema.parse({
      seriesTitle: '2ch文法テンプレ',
      episodeTitle: 'テスト',
      beats: [{ id: 'b01', text: 'テキスト', narration: 'ナレーション' }],
    })).toThrow()
  })
})
