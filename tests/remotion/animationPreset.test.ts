import { describe, it, expect } from 'vitest'
import {
  blackFlash1f,
  sceneBrightnessIn,
  headlinePopIn,
} from '../../src/remotion/components/animation/AnimationPreset'

describe('AnimationPreset', () => {
  describe('blackFlash1f', () => {
    it('TC-087: blackFlash1f(0) → 1', () => {
      expect(blackFlash1f(0)).toBe(1)
    })

    it('TC-088: blackFlash1f(1) → 0', () => {
      expect(blackFlash1f(1)).toBe(0)
    })
  })

  describe('sceneBrightnessIn', () => {
    it('TC-089: sceneBrightnessIn(1) → brightness(0.15)', () => {
      expect(sceneBrightnessIn(1)).toBe('brightness(0.15)')
    })

    it('TC-090: sceneBrightnessIn(10) → brightness(1)', () => {
      expect(sceneBrightnessIn(10)).toBe('brightness(1)')
    })

    it('TC-091: sceneBrightnessIn(0) → clamp at 0.15', () => {
      expect(sceneBrightnessIn(0)).toBe('brightness(0.15)')
    })

    it('TC-092: sceneBrightnessIn(11) → clamp at 1.0', () => {
      expect(sceneBrightnessIn(11)).toBe('brightness(1)')
    })
  })

  describe('headlinePopIn', () => {
    it('TC-093: headlinePopIn(24).opacity ≈ 0', () => {
      const result = headlinePopIn(24)
      expect(result.opacity).toBeCloseTo(0, 2)
    })

    it('TC-094: headlinePopIn(33).opacity ≈ 1', () => {
      const result = headlinePopIn(33)
      expect(result.opacity).toBeCloseTo(1, 2)
    })

    it('TC-095: headlinePopIn(23).opacity = 0 (clamp left)', () => {
      const result = headlinePopIn(23)
      expect(result.opacity).toBe(0)
    })

    it('TC-096: headlinePopIn(34).opacity = 1 (clamp right)', () => {
      const result = headlinePopIn(34)
      expect(result.opacity).toBe(1)
    })
  })
})
