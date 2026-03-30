// v4-layout-resolver.ts — Layout resolution algorithm (spec v4 Section 10)

import {
  type BeatRole,
  type ShotTemplate,
  type LayoutVariant,
  type CameraPreset,
  type CaptionPreset,
  LAYOUT_VARIANTS,
  CAMERA_PRESETS,
  CAPTION_PRESETS,
  assignBeatRole,
  selectShotTemplate,
  resolveCaptionPreset,
} from './v4-layers'

export interface ResolvedLayout {
  beatRole: BeatRole
  shotTemplateId: string
  layoutVariantId: string
  cameraPresetId: string
  captionPresetId: string
  layout: LayoutVariant
  camera: CameraPreset
  caption: CaptionPreset
}

export interface LayoutResolutionLogEntry {
  sceneIndex: number
  speaker: string
  emotion: string
  effect: string
  beatRole: BeatRole
  shotTemplateId: string
  candidates: string[]
  selectedLayoutId: string
  cameraPresetId: string
  captionPresetId: string
  reason: string
}

interface SceneInput {
  speaker: string
  emotion: string
  effect: string
  text: string
}

export function resolveAllLayouts(
  scenes: SceneInput[],
): { layouts: ResolvedLayout[]; log: LayoutResolutionLogEntry[] } {
  const layouts: ResolvedLayout[] = []
  const log: LayoutResolutionLogEntry[] = []
  let lastLayoutId = ''

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i]
    const total = scenes.length

    // Layer 1: Beat role
    const beatRole = assignBeatRole(i, total, scene.emotion, scene.effect)

    // Layer 2: Shot template
    const charCount = scene.speaker === 'narrator' ? 0 : 1
    const shot = selectShotTemplate(beatRole, scene.speaker, charCount)

    // Layer 3: Layout variant resolution
    let candidates = LAYOUT_VARIANTS.filter((lv) =>
      lv.applicableTo.includes(shot.id as any),
    )

    if (candidates.length === 0) {
      // Fallback: any layout
      candidates = [LAYOUT_VARIANTS[0]]
    }

    // Avoid repeating same layout
    const varied = candidates.filter((lv) => lv.id !== lastLayoutId)
    const finalCandidates = varied.length > 0 ? varied : candidates

    // Pick best: prefer layouts with characters matching scene needs
    let selected: LayoutVariant
    if (charCount === 0) {
      // No character: prefer layouts with 0 or minimal characters
      selected = finalCandidates.find((lv) => lv.characters.length === 0) ?? finalCandidates[0]
    } else {
      selected = finalCandidates[0]
    }

    lastLayoutId = selected.id

    // Layer 5: Render presets
    const captionPresetId = resolveCaptionPreset(scene.speaker, beatRole)
    const cameraPresetId = selected.cameraPreset
    const camera = CAMERA_PRESETS[cameraPresetId] ?? CAMERA_PRESETS.wide_hold
    const caption = CAPTION_PRESETS[captionPresetId] ?? CAPTION_PRESETS.narration

    const resolved: ResolvedLayout = {
      beatRole,
      shotTemplateId: shot.id,
      layoutVariantId: selected.id,
      cameraPresetId,
      captionPresetId,
      layout: selected,
      camera,
      caption,
    }

    layouts.push(resolved)

    log.push({
      sceneIndex: i,
      speaker: scene.speaker,
      emotion: scene.emotion,
      effect: scene.effect,
      beatRole,
      shotTemplateId: shot.id,
      candidates: candidates.map((c) => c.id),
      selectedLayoutId: selected.id,
      cameraPresetId,
      captionPresetId,
      reason: varied.length > 0
        ? `Avoided repeat of '${lastLayoutId === selected.id ? 'none' : candidates.find((c) => c.id === lastLayoutId)?.id ?? 'N/A'}'`
        : candidates.length === 1
          ? 'Only candidate available'
          : 'Best match for beat role and character count',
    })
  }

  return { layouts, log }
}

// Validation: check FAIL conditions
export function validateLayouts(
  log: LayoutResolutionLogEntry[],
): { passed: boolean; failures: string[] } {
  const failures: string[] = []

  // FAIL-19: 全シーンの layout_variant が同一
  const uniqueLayouts = new Set(log.map((e) => e.selectedLayoutId))
  if (uniqueLayouts.size === 1 && log.length > 1) {
    failures.push('FAIL-19: All scenes use the same layout_variant')
  }

  // FAIL-20: 使用 layout の種類が 3未満
  if (uniqueLayouts.size < 3 && log.length >= 5) {
    failures.push(`FAIL-20: Only ${uniqueLayouts.size} layout types used (minimum 3 required)`)
  }

  // FAIL-23: 全シーンの cameraPreset が同一
  const uniqueCameras = new Set(log.map((e) => e.cameraPresetId))
  if (uniqueCameras.size === 1 && log.length > 1) {
    failures.push('FAIL-23: All scenes use the same cameraPreset')
  }

  // FAIL-24: 全シーンの captionPreset が同一
  const uniqueCaptions = new Set(log.map((e) => e.captionPresetId))
  if (uniqueCaptions.size === 1 && log.length > 1) {
    failures.push('FAIL-24: All scenes use the same captionPreset')
  }

  return { passed: failures.length === 0, failures }
}
