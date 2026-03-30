# 2ch Template Engine: Story→Beat→Shot→Cue Architecture

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 4-layer template engine (Story→Beat→Shot→Cue) that extracts editing grammar from reference videos and generates new 2ch-style videos from any script, without using any source video material.

**Architecture:** Extend the existing 2ch pipeline with a new layer: scripts are first decomposed into Story units, grouped into Beats, then each Beat is assigned a Shot template (layout/composition) and Cue templates (effects/transitions). The engine outputs a timeline.json that bridges to the existing TwoChVideoConfig → Remotion render pipeline.

**Tech Stack:** TypeScript strict, Zod schemas, Remotion, VOICEVOX, ffmpeg, Pexels API, いらすとや

---

## Reference Video Grammar Summary (extracted from 5 videos)

All 5 reference videos share this grammar:

| Element | Pattern |
|---|---|
| Layout | Fixed 3-layer: TitleBand (top) → Caption (middle) → Character (bottom) |
| Title Band | Black bar, yellow bold text (#FFD700), 2 lines (series + episode), always visible |
| Caption | White text (#FFF) + black stroke (5-6px), left-aligned, 7-10 chars/line, instant appear |
| Cuts | Hard cuts only (no transitions) |
| Scene Duration | 1.5-3 seconds average |
| Effects | vortex, concentration_lines, sparkle, lightning, rain, shake (6 types) |
| Emotion→BG | neutral=beige, anger=red, confusion=blue-purple, shock=black, happy=gold, sad=dark-blue |
| Audio | 3-track: TTS narration + continuous BGM + SE punctuation |
| Characters | いらすとや-style, bottom-half, bust-up framing, expression variants |
| Beat Arc | Intro→Development→Climax→Resolution per episode |

---

## File Structure

### New Files to Create

```
src/
├── schema/
│   └── template-engine.ts           # Story/Beat/Shot/Cue Zod schemas
│
├── services/
│   └── template-engine/
│       ├── index.ts                  # Main entry: script → all outputs
│       ├── story-decomposer.ts       # Script → Story units
│       ├── beat-planner.ts           # Story → Beats (role assignment)
│       ├── shot-mapper.ts            # Beat → Shot template assignment
│       ├── cue-mapper.ts             # Beat → Cue template assignment
│       ├── timeline-builder.ts       # Beats+Shots+Cues → timeline.json
│       ├── asset-resolver.ts         # Beat needs → asset search + manifest
│       ├── audio-planner.ts          # TTS + SE + BGM → audio.json
│       └── config-bridge.ts          # timeline → TwoChVideoConfig (bridge)
│
├── services/template-engine/
│   └── templates/
│       ├── shot-templates.ts         # Shot template definitions
│       └── cue-templates.ts          # Cue template definitions
│
└── render-template.ts               # CLI entry: pnpm render:template

tests/
└── services/template-engine/
    ├── story-decomposer.test.ts
    ├── beat-planner.test.ts
    ├── shot-mapper.test.ts
    ├── cue-mapper.test.ts
    ├── timeline-builder.test.ts
    └── config-bridge.test.ts
```

### Output Files (per video, in repro_runs/{video_id}/)

```
repro_runs/{video_id}/
├── story.json
├── beats.json
├── timeline.json
├── audio.json
├── asset_manifest.json
├── template_manifest.json
├── coverage_report.md
├── asset_requests.json
├── self_audit_source_contamination.md
├── self_audit_template_completeness.md
├── self_audit_asset_compliance.md
└── output.mp4
```

---

## Task 1: Define Story/Beat/Shot/Cue Schemas

**Files:**
- Create: `src/schema/template-engine.ts`
- Test: `tests/schema/template-engine.test.ts`

- [ ] **Step 1: Write failing test for StoryUnit schema**

```typescript
// tests/schema/template-engine.test.ts
import { describe, it, expect } from 'vitest';
import {
  StoryUnitSchema,
  BeatSchema,
  ShotTemplateSchema,
  CueTemplateSchema,
  TimelineEntrySchema,
} from '../../src/schema/template-engine';

describe('StoryUnitSchema', () => {
  it('validates a well-formed story unit', () => {
    const unit = {
      id: 's1',
      speaker: 'narrator',
      text: '家に帰ったら',
      narration: '家に帰ったらケーキがあった',
      emotion: 'neutral',
      startFrame: 0,
      endFrame: 90,
    };
    expect(() => StoryUnitSchema.parse(unit)).not.toThrow();
  });

  it('rejects missing id', () => {
    expect(() => StoryUnitSchema.parse({ speaker: 'narrator', text: 'x' })).toThrow();
  });
});

describe('BeatSchema', () => {
  it('validates a beat with required fields', () => {
    const beat = {
      beat_id: 'b1',
      role: 'intro',
      text: '家に帰ったら',
      speaker: 'narrator',
      emotion: 'neutral',
      shot_template: 'narration_plain',
      cue_templates: ['caption_in_fast'],
      asset_needs: ['室内背景'],
      estimated_duration_frames: 90,
    };
    expect(() => BeatSchema.parse(beat)).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/schema/template-engine.test.ts`
Expected: FAIL - module not found

- [ ] **Step 3: Write schema definitions**

```typescript
// src/schema/template-engine.ts
import { z } from 'zod';

// --- Speaker & Emotion enums (shared) ---
const SpeakerEnum = z.enum(['narrator', 'character1', 'character2']);
const EmotionEnum = z.enum(['neutral', 'anger', 'confusion', 'shock', 'happy', 'sad']);
const EffectEnum = z.enum([
  'none', 'concentration_lines', 'vortex', 'lightning', 'sparkle', 'rain', 'shake',
]);

// --- Beat roles ---
const BeatRoleEnum = z.enum([
  'intro', 'situation', 'incident', 'reaction', 'development',
  'climax', 'punchline', 'aftermath', 'outro',
]);

// --- Story layer ---
export const StoryUnitSchema = z.object({
  id: z.string(),
  speaker: SpeakerEnum,
  text: z.string().min(1).max(40),
  narration: z.string().optional(),
  emotion: EmotionEnum,
  startFrame: z.number().int().nonnegative(),
  endFrame: z.number().int().positive(),
});
export type StoryUnit = z.infer<typeof StoryUnitSchema>;

// --- Shot template definitions ---
export const ShotTemplateIdEnum = z.enum([
  'intro_title',
  'narration_plain',
  'reaction_closeup',
  'object_reveal',
  'explanation_cut',
  'two_person_dialog',
  'punchline_freeze',
  'aftermath_caption',
  'group_scene',
  'episode_title_card',
]);
export type ShotTemplateId = z.infer<typeof ShotTemplateIdEnum>;

export const ShotTemplateSchema = z.object({
  id: ShotTemplateIdEnum,
  background: z.object({
    type: z.enum(['scene', 'emotion', 'effect']),
    src: z.string().optional(),
  }),
  character: z.object({
    position: z.enum(['center', 'left', 'right', 'none']),
    scale: z.number().min(0.5).max(1.5).default(1.0),
    framing: z.enum(['bust', 'full', 'closeup']).default('bust'),
  }),
  caption: z.object({
    position: z.enum(['top-left', 'center', 'bottom']).default('top-left'),
    maxCharsPerLine: z.number().int().default(10),
    fontSize: z.number().default(72),
  }),
  camera: z.object({
    zoomFrom: z.number().default(1.0),
    zoomTo: z.number().default(1.0),
  }).optional(),
});
export type ShotTemplate = z.infer<typeof ShotTemplateSchema>;

// --- Cue template definitions ---
export const CueTemplateIdEnum = z.enum([
  'caption_in_fast',
  'caption_replace_snap',
  'flash_short',
  'shake_small',
  'shake_impact',
  'concentration_lines_on',
  'vortex_on',
  'sparkle_on',
  'lightning_flash',
  'rain_on',
  'se_hit',
  'se_reveal',
  'bgm_duck_short',
  'manga_symbol_pop',
]);
export type CueTemplateId = z.infer<typeof CueTemplateIdEnum>;

export const CueTemplateSchema = z.object({
  id: z.string(),
  type: CueTemplateIdEnum,
  startFrame: z.number().int().nonnegative(),
  endFrame: z.number().int().positive(),
  params: z.record(z.unknown()).optional(),
});
export type CueTemplate = z.infer<typeof CueTemplateSchema>;

// --- Beat layer ---
export const BeatSchema = z.object({
  beat_id: z.string(),
  role: BeatRoleEnum,
  text: z.string(),
  speaker: SpeakerEnum,
  emotion: EmotionEnum,
  shot_template: ShotTemplateIdEnum,
  cue_templates: z.array(CueTemplateIdEnum),
  asset_needs: z.array(z.string()),
  estimated_duration_frames: z.number().int().positive(),
  story_unit_ids: z.array(z.string()).optional(),
});
export type Beat = z.infer<typeof BeatSchema>;

// --- Timeline entry ---
export const TimelineEntrySchema = z.object({
  beat_id: z.string(),
  startFrame: z.number().int().nonnegative(),
  endFrame: z.number().int().positive(),
  shot: ShotTemplateSchema,
  cues: z.array(CueTemplateSchema),
  audio: z.object({
    ttsSrc: z.string().optional(),
    seSrc: z.string().optional(),
  }).optional(),
  assets: z.object({
    backgroundSrc: z.string().optional(),
    characterSrc: z.string().optional(),
  }).optional(),
});
export type TimelineEntry = z.infer<typeof TimelineEntrySchema>;

// --- Full output schemas ---
export const StoryJsonSchema = z.object({
  units: z.array(StoryUnitSchema),
});
export type StoryJson = z.infer<typeof StoryJsonSchema>;

export const BeatsJsonSchema = z.object({
  fps: z.number().int().positive(),
  beats: z.array(BeatSchema),
});
export type BeatsJson = z.infer<typeof BeatsJsonSchema>;

export const TimelineJsonSchema = z.object({
  fps: z.number().int().positive(),
  totalFrames: z.number().int().positive(),
  entries: z.array(TimelineEntrySchema),
});
export type TimelineJson = z.infer<typeof TimelineJsonSchema>;

export const AudioJsonSchema = z.object({
  fps: z.number().int().positive(),
  tracks: z.object({
    narration: z.array(z.object({
      beat_id: z.string(),
      src: z.string(),
      startFrame: z.number().int(),
      endFrame: z.number().int(),
    })),
    bgm: z.object({
      src: z.string(),
      volume: z.number(),
      loop: z.boolean(),
    }),
    se: z.array(z.object({
      beat_id: z.string(),
      src: z.string().optional(),
      type: z.string(),
      startFrame: z.number().int(),
    })),
  }),
});
export type AudioJson = z.infer<typeof AudioJsonSchema>;

export const AssetManifestEntrySchema = z.object({
  asset_id: z.string(),
  source_name: z.string(),
  source_url: z.string(),
  local_path: z.string(),
  license_notes: z.string(),
  attribution_text: z.string(),
  usage_count_in_video: z.number().int(),
  allowed_for_template_distribution: z.boolean(),
  beat_ids: z.array(z.string()),
  preprocessing_steps: z.array(z.string()),
});
export type AssetManifestEntry = z.infer<typeof AssetManifestEntrySchema>;

export const AssetManifestSchema = z.object({
  assets: z.array(AssetManifestEntrySchema),
});

export const TemplateManifestSchema = z.object({
  shot_templates: z.array(z.object({
    id: ShotTemplateIdEnum,
    description: z.string(),
    usage_count: z.number().int(),
  })),
  cue_templates: z.array(z.object({
    id: CueTemplateIdEnum,
    description: z.string(),
    usage_count: z.number().int(),
  })),
  style_presets: z.array(z.object({
    id: z.string(),
    description: z.string(),
  })),
  asset_buckets: z.array(z.object({
    id: z.string(),
    description: z.string(),
    items: z.array(z.string()),
  })),
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/schema/template-engine.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/schema/template-engine.ts tests/schema/template-engine.test.ts
git commit -m "feat: add Story/Beat/Shot/Cue template engine schemas"
```

---

## Task 2: Shot & Cue Template Definitions

**Files:**
- Create: `src/services/template-engine/templates/shot-templates.ts`
- Create: `src/services/template-engine/templates/cue-templates.ts`
- Test: `tests/services/template-engine/templates.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// tests/services/template-engine/templates.test.ts
import { describe, it, expect } from 'vitest';
import { SHOT_TEMPLATES, getShotTemplate } from '../../../src/services/template-engine/templates/shot-templates';
import { CUE_TEMPLATES, getCueTemplate } from '../../../src/services/template-engine/templates/cue-templates';

describe('SHOT_TEMPLATES', () => {
  it('has all required template IDs', () => {
    const ids = Object.keys(SHOT_TEMPLATES);
    expect(ids).toContain('intro_title');
    expect(ids).toContain('narration_plain');
    expect(ids).toContain('reaction_closeup');
    expect(ids).toContain('punchline_freeze');
  });

  it('getShotTemplate returns valid template', () => {
    const t = getShotTemplate('narration_plain');
    expect(t.id).toBe('narration_plain');
    expect(t.character.position).toBeDefined();
  });
});

describe('CUE_TEMPLATES', () => {
  it('has caption_in_fast', () => {
    const c = getCueTemplate('caption_in_fast', 0, 6);
    expect(c.type).toBe('caption_in_fast');
    expect(c.startFrame).toBe(0);
    expect(c.endFrame).toBe(6);
  });
});
```

- [ ] **Step 2: Run to verify failure**

- [ ] **Step 3: Implement shot templates**

```typescript
// src/services/template-engine/templates/shot-templates.ts
import type { ShotTemplate, ShotTemplateId } from '../../../schema/template-engine';

export const SHOT_TEMPLATES: Record<ShotTemplateId, ShotTemplate> = {
  intro_title: {
    id: 'intro_title',
    background: { type: 'scene' },
    character: { position: 'center', scale: 1.0, framing: 'full' },
    caption: { position: 'top-left', maxCharsPerLine: 10, fontSize: 72 },
  },
  narration_plain: {
    id: 'narration_plain',
    background: { type: 'scene' },
    character: { position: 'center', scale: 1.0, framing: 'bust' },
    caption: { position: 'top-left', maxCharsPerLine: 10, fontSize: 72 },
  },
  reaction_closeup: {
    id: 'reaction_closeup',
    background: { type: 'emotion' },
    character: { position: 'center', scale: 1.2, framing: 'closeup' },
    caption: { position: 'top-left', maxCharsPerLine: 10, fontSize: 72 },
  },
  object_reveal: {
    id: 'object_reveal',
    background: { type: 'scene' },
    character: { position: 'none', scale: 1.0, framing: 'full' },
    caption: { position: 'center', maxCharsPerLine: 10, fontSize: 80 },
  },
  explanation_cut: {
    id: 'explanation_cut',
    background: { type: 'scene' },
    character: { position: 'center', scale: 0.9, framing: 'bust' },
    caption: { position: 'top-left', maxCharsPerLine: 10, fontSize: 68 },
  },
  two_person_dialog: {
    id: 'two_person_dialog',
    background: { type: 'scene' },
    character: { position: 'left', scale: 0.8, framing: 'bust' },
    caption: { position: 'top-left', maxCharsPerLine: 10, fontSize: 72 },
  },
  punchline_freeze: {
    id: 'punchline_freeze',
    background: { type: 'effect' },
    character: { position: 'center', scale: 1.1, framing: 'closeup' },
    caption: { position: 'top-left', maxCharsPerLine: 10, fontSize: 80 },
    camera: { zoomFrom: 1.0, zoomTo: 1.05 },
  },
  aftermath_caption: {
    id: 'aftermath_caption',
    background: { type: 'scene' },
    character: { position: 'center', scale: 1.0, framing: 'bust' },
    caption: { position: 'top-left', maxCharsPerLine: 10, fontSize: 72 },
  },
  group_scene: {
    id: 'group_scene',
    background: { type: 'scene' },
    character: { position: 'center', scale: 0.8, framing: 'full' },
    caption: { position: 'top-left', maxCharsPerLine: 10, fontSize: 68 },
  },
  episode_title_card: {
    id: 'episode_title_card',
    background: { type: 'emotion' },
    character: { position: 'none', scale: 1.0, framing: 'full' },
    caption: { position: 'center', maxCharsPerLine: 15, fontSize: 96 },
  },
};

export function getShotTemplate(id: ShotTemplateId): ShotTemplate {
  return SHOT_TEMPLATES[id];
}
```

- [ ] **Step 4: Implement cue templates**

```typescript
// src/services/template-engine/templates/cue-templates.ts
import type { CueTemplate, CueTemplateId } from '../../../schema/template-engine';

let cueCounter = 0;

export function getCueTemplate(
  type: CueTemplateId,
  startFrame: number,
  endFrame: number,
  params?: Record<string, unknown>,
): CueTemplate {
  cueCounter++;
  return {
    id: `cue_${cueCounter}`,
    type,
    startFrame,
    endFrame,
    params,
  };
}

export function resetCueCounter(): void {
  cueCounter = 0;
}

// Default cue durations (in frames at 30fps)
export const CUE_DEFAULTS: Record<CueTemplateId, { durationFrames: number }> = {
  caption_in_fast: { durationFrames: 6 },
  caption_replace_snap: { durationFrames: 1 },
  flash_short: { durationFrames: 5 },
  shake_small: { durationFrames: 10 },
  shake_impact: { durationFrames: 15 },
  concentration_lines_on: { durationFrames: 0 }, // lasts entire beat
  vortex_on: { durationFrames: 0 },
  sparkle_on: { durationFrames: 0 },
  lightning_flash: { durationFrames: 5 },
  rain_on: { durationFrames: 0 },
  se_hit: { durationFrames: 10 },
  se_reveal: { durationFrames: 15 },
  bgm_duck_short: { durationFrames: 30 },
  manga_symbol_pop: { durationFrames: 0 },
};

// Maps effect name → cue template
export const EFFECT_TO_CUE: Record<string, CueTemplateId> = {
  concentration_lines: 'concentration_lines_on',
  vortex: 'vortex_on',
  lightning: 'lightning_flash',
  sparkle: 'sparkle_on',
  rain: 'rain_on',
  shake: 'shake_impact',
};
```

- [ ] **Step 5: Run tests, commit**

---

## Task 3: Story Decomposer

**Files:**
- Create: `src/services/template-engine/story-decomposer.ts`
- Test: `tests/services/template-engine/story-decomposer.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { decomposeStory } from '../../../src/services/template-engine/story-decomposer';
import type { TwoChScript } from '../../../src/schema/twoch-script';

describe('decomposeStory', () => {
  const script: TwoChScript = {
    format: '2ch',
    videoTitle: 'テスト動画',
    episodes: [{
      scenes: [
        { speaker: 'narrator', text: '家に帰ったら', emotion: 'neutral', effect: 'none', imageKeywords: ['家'], imageKeywordsEn: ['house'] },
        { speaker: 'character1', text: 'ただいま', emotion: 'happy', effect: 'none', imageKeywords: ['笑顔'], imageKeywordsEn: ['smile'] },
      ],
    }],
  };

  it('returns StoryUnit array with IDs', () => {
    const units = decomposeStory(script, 30);
    expect(units.length).toBe(2);
    expect(units[0].id).toBe('s1');
    expect(units[0].speaker).toBe('narrator');
    expect(units[0].text).toBe('家に帰ったら');
  });

  it('assigns sequential frame ranges', () => {
    const units = decomposeStory(script, 30);
    expect(units[0].startFrame).toBe(0);
    expect(units[0].endFrame).toBeGreaterThan(0);
    expect(units[1].startFrame).toBe(units[0].endFrame);
  });
});
```

- [ ] **Step 2: Implement**

```typescript
// src/services/template-engine/story-decomposer.ts
import type { TwoChScript } from '../../schema/twoch-script';
import type { StoryUnit } from '../../schema/template-engine';

const DEFAULT_SCENE_DURATION_SEC = 2.0;

export function decomposeStory(script: TwoChScript, fps: number): StoryUnit[] {
  const units: StoryUnit[] = [];
  let frameOffset = 0;
  let unitIndex = 1;

  for (const episode of script.episodes) {
    for (const scene of episode.scenes) {
      const durationFrames = scene.durationFrames
        ?? Math.round(DEFAULT_SCENE_DURATION_SEC * fps);
      const unit: StoryUnit = {
        id: `s${unitIndex}`,
        speaker: scene.speaker as StoryUnit['speaker'],
        text: scene.text,
        narration: scene.narration ?? scene.text,
        emotion: scene.emotion as StoryUnit['emotion'],
        startFrame: frameOffset,
        endFrame: frameOffset + durationFrames,
      };
      units.push(unit);
      frameOffset += durationFrames;
      unitIndex++;
    }
  }
  return units;
}
```

- [ ] **Step 3: Run tests, commit**

---

## Task 4: Beat Planner

**Files:**
- Create: `src/services/template-engine/beat-planner.ts`
- Test: `tests/services/template-engine/beat-planner.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { planBeats } from '../../../src/services/template-engine/beat-planner';
import type { StoryUnit } from '../../../src/schema/template-engine';

describe('planBeats', () => {
  const units: StoryUnit[] = [
    { id: 's1', speaker: 'narrator', text: '昔々', emotion: 'neutral', startFrame: 0, endFrame: 60 },
    { id: 's2', speaker: 'narrator', text: '場所に到着', emotion: 'neutral', startFrame: 60, endFrame: 120 },
    { id: 's3', speaker: 'character1', text: 'えっ！？', emotion: 'shock', startFrame: 120, endFrame: 180 },
    { id: 's4', speaker: 'character1', text: '何これ', emotion: 'confusion', startFrame: 180, endFrame: 240 },
    { id: 's5', speaker: 'character2', text: 'ごめんね', emotion: 'sad', startFrame: 240, endFrame: 300 },
    { id: 's6', speaker: 'narrator', text: 'それ以来', emotion: 'neutral', startFrame: 300, endFrame: 360 },
  ];

  it('assigns beat roles', () => {
    const beats = planBeats(units);
    expect(beats.length).toBeGreaterThan(0);
    expect(beats[0].role).toBe('intro');
    expect(beats[beats.length - 1].role).toBe('aftermath');
  });

  it('all beats have required fields', () => {
    const beats = planBeats(units);
    for (const b of beats) {
      expect(b.beat_id).toBeTruthy();
      expect(b.shot_template).toBeTruthy();
      expect(b.cue_templates).toBeInstanceOf(Array);
      expect(b.asset_needs).toBeInstanceOf(Array);
      expect(b.estimated_duration_frames).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: Implement**

The beat planner assigns roles based on position in the story + emotion:
- First 15% of units → intro/situation
- 15-40% → development
- Units with shock/anger → incident/reaction/climax (based on emotion intensity)
- Last 15% → aftermath/outro
- Punchline detection: biggest emotion shift

```typescript
// src/services/template-engine/beat-planner.ts
import type { StoryUnit, Beat, ShotTemplateId, CueTemplateId } from '../../schema/template-engine';
import { EFFECT_TO_CUE } from './templates/cue-templates';

const EMOTION_INTENSITY: Record<string, number> = {
  neutral: 0, happy: 1, sad: 1, confusion: 2, anger: 3, shock: 4,
};

const ROLE_ORDER = [
  'intro', 'situation', 'development', 'incident',
  'reaction', 'climax', 'punchline', 'aftermath', 'outro',
] as const;

function assignRole(
  index: number,
  total: number,
  emotion: string,
  prevEmotion: string | null,
): Beat['role'] {
  const pos = index / total;
  const intensity = EMOTION_INTENSITY[emotion] ?? 0;
  const prevIntensity = prevEmotion ? (EMOTION_INTENSITY[prevEmotion] ?? 0) : 0;
  const shift = intensity - prevIntensity;

  if (index === 0) return 'intro';
  if (pos < 0.15) return 'situation';
  if (pos > 0.85) return index === total - 1 ? 'outro' : 'aftermath';
  if (shift >= 3) return 'climax';
  if (intensity >= 3) return 'reaction';
  if (shift >= 2) return 'incident';
  return 'development';
}

function assignShotTemplate(role: Beat['role'], emotion: string): ShotTemplateId {
  switch (role) {
    case 'intro': return 'intro_title';
    case 'situation': return 'narration_plain';
    case 'incident': return 'reaction_closeup';
    case 'reaction': return 'reaction_closeup';
    case 'climax': return 'punchline_freeze';
    case 'punchline': return 'punchline_freeze';
    case 'aftermath': return 'aftermath_caption';
    case 'outro': return 'narration_plain';
    case 'development':
    default:
      return emotion === 'neutral' ? 'narration_plain' : 'explanation_cut';
  }
}

function assignCueTemplates(emotion: string, effect: string, role: Beat['role']): CueTemplateId[] {
  const cues: CueTemplateId[] = ['caption_in_fast'];

  if (effect && effect !== 'none' && EFFECT_TO_CUE[effect]) {
    cues.push(EFFECT_TO_CUE[effect]);
  }

  if (role === 'climax' || role === 'punchline') {
    if (!cues.includes('shake_impact')) cues.push('shake_impact');
    cues.push('manga_symbol_pop');
  }

  if (role === 'incident' || role === 'reaction') {
    if (!cues.includes('manga_symbol_pop')) cues.push('manga_symbol_pop');
  }

  return cues;
}

function deriveAssetNeeds(emotion: string, role: Beat['role']): string[] {
  const needs: string[] = [];
  if (role === 'intro' || role === 'situation') needs.push('室内背景');
  if (role === 'development') needs.push('室内背景');
  if (emotion === 'anger') needs.push('怒り');
  if (emotion === 'shock') needs.push('驚き');
  if (emotion === 'confusion') needs.push('困惑');
  if (emotion === 'happy') needs.push('補助アイコン');
  if (emotion === 'sad') needs.push('室内背景');
  return needs.length > 0 ? needs : ['室内背景'];
}

export function planBeats(units: StoryUnit[], effectMap?: Map<string, string>): Beat[] {
  const beats: Beat[] = [];

  for (let i = 0; i < units.length; i++) {
    const u = units[i];
    const prevEmotion = i > 0 ? units[i - 1].emotion : null;
    const effect = effectMap?.get(u.id) ?? 'none';
    const role = assignRole(i, units.length, u.emotion, prevEmotion);
    const shot_template = assignShotTemplate(role, u.emotion);
    const cue_templates = assignCueTemplates(u.emotion, effect, role);
    const asset_needs = deriveAssetNeeds(u.emotion, role);

    beats.push({
      beat_id: `b${i + 1}`,
      role,
      text: u.text,
      speaker: u.speaker,
      emotion: u.emotion,
      shot_template,
      cue_templates,
      asset_needs,
      estimated_duration_frames: u.endFrame - u.startFrame,
      story_unit_ids: [u.id],
    });
  }
  return beats;
}
```

- [ ] **Step 3: Run tests, commit**

---

## Task 5: Timeline Builder + Config Bridge

**Files:**
- Create: `src/services/template-engine/timeline-builder.ts`
- Create: `src/services/template-engine/config-bridge.ts`
- Test: `tests/services/template-engine/timeline-builder.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
import { describe, it, expect } from 'vitest';
import { buildTimeline } from '../../../src/services/template-engine/timeline-builder';
import { bridgeToTwoChConfig } from '../../../src/services/template-engine/config-bridge';
import type { Beat } from '../../../src/schema/template-engine';

describe('buildTimeline', () => {
  const beats: Beat[] = [
    {
      beat_id: 'b1', role: 'intro', text: 'テスト', speaker: 'narrator',
      emotion: 'neutral', shot_template: 'intro_title',
      cue_templates: ['caption_in_fast'], asset_needs: ['室内背景'],
      estimated_duration_frames: 60,
    },
    {
      beat_id: 'b2', role: 'climax', text: 'えっ！', speaker: 'character1',
      emotion: 'shock', shot_template: 'reaction_closeup',
      cue_templates: ['caption_in_fast', 'shake_impact'], asset_needs: ['驚き'],
      estimated_duration_frames: 45,
    },
  ];

  it('produces timeline entries with correct frames', () => {
    const tl = buildTimeline(beats, 30);
    expect(tl.fps).toBe(30);
    expect(tl.entries.length).toBe(2);
    expect(tl.entries[0].startFrame).toBe(0);
    expect(tl.entries[0].endFrame).toBe(60);
    expect(tl.entries[1].startFrame).toBe(60);
    expect(tl.entries[1].endFrame).toBe(105);
    expect(tl.totalFrames).toBe(105);
  });
});

describe('bridgeToTwoChConfig', () => {
  it('converts timeline to TwoChVideoConfig scenes', () => {
    const tl = {
      fps: 30, totalFrames: 105,
      entries: [
        {
          beat_id: 'b1', startFrame: 0, endFrame: 60,
          shot: { id: 'intro_title', background: { type: 'scene' as const },
            character: { position: 'center' as const, scale: 1.0, framing: 'bust' as const },
            caption: { position: 'top-left' as const, maxCharsPerLine: 10, fontSize: 72 } },
          cues: [],
          assets: { characterSrc: 'img.png', backgroundSrc: 'bg.png' },
        },
      ],
    };
    const config = bridgeToTwoChConfig(tl, 'テスト動画', 'テストシリーズ', [
      { beat_id: 'b1', text: 'テスト', speaker: 'narrator', emotion: 'neutral',
        narration: 'テスト' },
    ]);
    expect(config.videoTitle).toBe('テスト動画');
    expect(config.scenes.length).toBe(1);
  });
});
```

- [ ] **Step 2: Implement timeline-builder.ts**

```typescript
// src/services/template-engine/timeline-builder.ts
import type { Beat, TimelineJson, TimelineEntry } from '../../schema/template-engine';
import { getShotTemplate } from './templates/shot-templates';
import { getCueTemplate, resetCueCounter } from './templates/cue-templates';

export function buildTimeline(beats: Beat[], fps: number): TimelineJson {
  resetCueCounter();
  let frameOffset = 0;
  const entries: TimelineEntry[] = [];

  for (const beat of beats) {
    const dur = beat.estimated_duration_frames;
    const startFrame = frameOffset;
    const endFrame = frameOffset + dur;

    const shot = getShotTemplate(beat.shot_template);
    const cues = beat.cue_templates.map((ct) =>
      getCueTemplate(ct, startFrame, endFrame)
    );

    entries.push({
      beat_id: beat.beat_id,
      startFrame,
      endFrame,
      shot,
      cues,
    });

    frameOffset = endFrame;
  }

  return { fps, totalFrames: frameOffset, entries };
}
```

- [ ] **Step 3: Implement config-bridge.ts**

```typescript
// src/services/template-engine/config-bridge.ts
import type { TimelineJson } from '../../schema/template-engine';
import type { TwoChVideoConfig, TwoChSceneConfig } from '../../remotion/types/video-2ch';

interface BeatMeta {
  beat_id: string;
  text: string;
  speaker: string;
  emotion: string;
  narration?: string;
  effect?: string;
}

const SPEAKER_COLORS: Record<string, string> = {
  narrator: '#4A90D9',
  character1: '#D94A4A',
  character2: '#4AD97A',
};

export function bridgeToTwoChConfig(
  timeline: TimelineJson,
  videoTitle: string,
  seriesTitle: string,
  beatMetas: BeatMeta[],
): TwoChVideoConfig {
  const metaMap = new Map(beatMetas.map((m) => [m.beat_id, m]));

  const scenes: TwoChSceneConfig[] = timeline.entries.map((entry) => {
    const meta = metaMap.get(entry.beat_id);
    if (!meta) throw new Error(`Missing meta for beat ${entry.beat_id}`);

    return {
      durationFrames: entry.endFrame - entry.startFrame,
      speaker: meta.speaker,
      speakerColor: SPEAKER_COLORS[meta.speaker] ?? '#FFFFFF',
      text: meta.text,
      emotion: meta.emotion,
      effect: meta.effect ?? 'none',
      audioSrc: entry.audio?.ttsSrc ?? '',
      imageSrc: entry.assets?.characterSrc ?? '',
      backgroundImageSrc: entry.assets?.backgroundSrc,
      fallbackUsed: false,
    };
  });

  return {
    meta: { fps: timeline.fps, width: 1080, height: 1920, audioSampleRate: 44100 },
    videoTitle,
    seriesTitle,
    titleColor: '#FFD700',
    scenes,
    outro: { text: 'チャンネル登録よろしく！', durationFrames: 90 },
  };
}
```

- [ ] **Step 4: Run tests, commit**

---

## Task 6: Asset Resolver + Audio Planner

**Files:**
- Create: `src/services/template-engine/asset-resolver.ts`
- Create: `src/services/template-engine/audio-planner.ts`
- Test: `tests/services/template-engine/asset-resolver.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
import { describe, it, expect } from 'vitest';
import { resolveAssets, buildAssetManifest } from '../../../src/services/template-engine/asset-resolver';
import { buildAudioPlan } from '../../../src/services/template-engine/audio-planner';

describe('resolveAssets', () => {
  it('generates asset_requests for missing assets', () => {
    const result = resolveAssets([
      { beat_id: 'b1', asset_needs: ['室内背景', '驚き'], imageKeywords: ['部屋'], imageKeywordsEn: ['room'] },
    ], '/tmp/job', null);
    expect(result.requests.length).toBeGreaterThan(0);
  });
});

describe('buildAudioPlan', () => {
  it('creates audio.json structure', () => {
    const audio = buildAudioPlan([
      { beat_id: 'b1', speaker: 'narrator', narration: 'テスト', startFrame: 0, endFrame: 60 },
    ], 30);
    expect(audio.fps).toBe(30);
    expect(audio.tracks.narration.length).toBe(1);
    expect(audio.tracks.bgm.loop).toBe(true);
  });
});
```

- [ ] **Step 2: Implement asset-resolver.ts**

Wraps existing fetchImage to resolve assets per beat, building asset_manifest.json and asset_requests.json.

- [ ] **Step 3: Implement audio-planner.ts**

Generates audio.json from beat list, mapping speakers to VOICEVOX IDs and planning BGM/SE tracks.

- [ ] **Step 4: Run tests, commit**

---

## Task 7: Main Template Engine Entry Point

**Files:**
- Create: `src/services/template-engine/index.ts`
- Create: `src/render-template.ts`
- Modify: `package.json` (add `render:template` script)

- [ ] **Step 1: Implement template engine orchestrator**

```typescript
// src/services/template-engine/index.ts
import type { TwoChScript } from '../../schema/twoch-script';
import type { TwoChVideoConfig } from '../../remotion/types/video-2ch';
import { decomposeStory } from './story-decomposer';
import { planBeats } from './beat-planner';
import { buildTimeline } from './timeline-builder';
import { bridgeToTwoChConfig } from './config-bridge';

export interface TemplateEngineOutput {
  story: { units: StoryUnit[] };
  beats: { fps: number; beats: Beat[] };
  timeline: TimelineJson;
  config: TwoChVideoConfig;
}

export function runTemplateEngine(
  script: TwoChScript,
  fps: number = 30,
): TemplateEngineOutput {
  // 1. Story decomposition
  const units = decomposeStory(script, fps);

  // 2. Build effect map from script
  const effectMap = new Map<string, string>();
  let idx = 0;
  for (const ep of script.episodes) {
    for (const scene of ep.scenes) {
      idx++;
      effectMap.set(`s${idx}`, scene.effect);
    }
  }

  // 3. Beat planning
  const beats = planBeats(units, effectMap);

  // 4. Timeline generation
  const timeline = buildTimeline(beats, fps);

  // 5. Bridge to TwoChVideoConfig
  const beatMetas = beats.map((b, i) => ({
    beat_id: b.beat_id,
    text: b.text,
    speaker: b.speaker,
    emotion: b.emotion,
    narration: units[i]?.narration,
    effect: effectMap.get(units[i]?.id ?? '') ?? 'none',
  }));
  const config = bridgeToTwoChConfig(
    timeline,
    script.videoTitle,
    script.seriesTitle ?? script.videoTitle,
    beatMetas,
  );

  return {
    story: { units },
    beats: { fps, beats },
    timeline,
    config,
  };
}
```

- [ ] **Step 2: Create render-template.ts CLI entry**

- [ ] **Step 3: Add to package.json scripts**

```json
"render:template": "tsx src/render-template.ts"
```

- [ ] **Step 4: Run tests, commit**

---

## Task 8: Process 5 Reference Videos → Output Files

**Files:**
- Create: 5x output directories under `repro_runs/` (in 動画分析仕様書)
- Output: All 11 required files per video

For each of the 5 reference videos:

- [ ] **Step 1: Create sample script based on video analysis**

Create a TwoChScript JSON that captures the video's story structure using the extracted analysis.

- [ ] **Step 2: Run template engine to generate story.json, beats.json, timeline.json**

- [ ] **Step 3: Run asset resolution (Pexels/いらすとや) to get images**

- [ ] **Step 4: Generate audio plan**

- [ ] **Step 5: Build asset_manifest.json and template_manifest.json**

- [ ] **Step 6: Write coverage_report.md**

- [ ] **Step 7: Write 3 self-audit documents**

- [ ] **Step 8: Render output.mp4 via pnpm render:v3**

**Video IDs:**
1. `birthday` — 誕生日ケーキ [DbfqzSPaUwc]
2. `kaikei` — 会計よろしく [ETV-VtnQJwQ]
3. `meigen` — 笑える迷言集 [EzFYQHX5ICY]
4. `toshokan` — 図書館 [oaOq39FXJx8]
5. `kaimono` — 買い物中 [JMNJxpptaIc]

---

## Task 9: Self-Audit & Verification

**Files:**
- Create: `self_audit_source_contamination.md` (per video)
- Create: `self_audit_template_completeness.md` (per video)
- Create: `self_audit_asset_compliance.md` (per video)

- [ ] **Step 1: Source contamination check**

Verify: no OffthreadVideo, Html5Video, `<video>`, source-audio, remux, stream copy. No imports of reference video files.

- [ ] **Step 2: Template completeness check**

Verify: all beats implemented, no hardcoded single-video logic, asset_requests.json generated where needed.

- [ ] **Step 3: Asset compliance check**

Verify: Pexels API only, いらすとや official only, count < 20, no unknown sources.

- [ ] **Step 4: Final verification**

Run `pnpm typecheck && pnpm test` to confirm no regressions.

---

## Execution Order

Tasks 1-6 are sequential (each depends on the previous).
Task 7 depends on 1-6.
Task 8 depends on 7 (can be parallelized across 5 videos).
Task 9 depends on 8.
