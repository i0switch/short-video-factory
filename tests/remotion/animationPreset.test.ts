import { describe, it, expect } from 'vitest'
import {
  blackFlash1f,
  sceneBrightnessIn,
  headlinePopIn,
} from '../../src/remotion/components/animation/AnimationPreset'

describe('AnimationPreset', () => {
  describe('blackFlash1f', () => {
    it('TC-087: blackFlash1f(0) → 0 (disabled)', () => {
      // 暗転禁止: 常に0を返す
      expect(blackFlash1f(0)).toBe(0)
    })

    it('TC-088: blackFlash1f(1) → 0', () => {
      expect(blackFlash1f(1)).toBe(0)
    })
  })

  describe('sceneBrightnessIn', () => {
    it('TC-089: sceneBrightnessIn(0) → clamp at brightness(0.85)', () => {
      // 暗転禁止: 軽微なフェード 0.85→1.0 (6fで完了)
      expect(sceneBrightnessIn(0)).toBe('brightness(0.85)')
    })

    it('TC-090: sceneBrightnessIn(6) → brightness(1)', () => {
      expect(sceneBrightnessIn(6)).toBe('brightness(1)')
    })

    it('TC-091: sceneBrightnessIn(3) → midpoint brightness', () => {
      // frame 3 of [0,6] range → brightness = 0.85 + (3/6)*0.15 = 0.925
      const result = sceneBrightnessIn(3)
      expect(result).toMatch(/^brightness\(0\.9/)
    })

    it('TC-092: sceneBrightnessIn(10) → clamp at brightness(1)', () => {
      expect(sceneBrightnessIn(10)).toBe('brightness(1)')
    })
  })

  describe('headlinePopIn', () => {
    it('TC-093: headlinePopIn(6).opacity ≈ 0 (start of animation)', () => {
      // Animation range [6,15], frame 6 = start
      const result = headlinePopIn(6)
      expect(result.opacity).toBeCloseTo(0, 2)
    })

    it('TC-094: headlinePopIn(15).opacity ≈ 1 (end of animation)', () => {
      const result = headlinePopIn(15)
      expect(result.opacity).toBeCloseTo(1, 2)
    })

    it('TC-095: headlinePopIn(0).opacity = 0 (clamp left)', () => {
      const result = headlinePopIn(0)
      expect(result.opacity).toBe(0)
    })

    it('TC-096: headlinePopIn(20).opacity = 1 (clamp right)', () => {
      const result = headlinePopIn(20)
      expect(result.opacity).toBe(1)
    })
  })
})
