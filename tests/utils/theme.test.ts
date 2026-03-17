import { describe, it, expect, vi, afterEach } from 'vitest'
import fs from 'fs'
import { loadTheme, listThemes } from '../../src/utils/theme'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('loadTheme', () => {
  // TC-083: loadTheme('default') succeeds if themes/default.json exists
  it('TC-083: loadTheme("default") → Theme オブジェクト返却', () => {
    // themes/default.json exists in the real project
    expect(() => loadTheme('default')).not.toThrow()
    const theme = loadTheme('default')
    // The default theme has a "name" field
    expect(theme).toBeDefined()
    expect(typeof theme).toBe('object')
  })

  // TC-084: loadTheme('nonexistent') → throw Error containing 'Theme not found: nonexistent'
  it('TC-084: loadTheme("nonexistent") → Error "Theme not found: nonexistent"', () => {
    expect(() => loadTheme('nonexistent')).toThrow('Theme not found: nonexistent')
  })
})

describe('listThemes', () => {
  // TC-085: listThemes() returns array containing 'default'
  it('TC-085: listThemes() → "default" を含む配列を返す', () => {
    const themes = listThemes()
    expect(Array.isArray(themes)).toBe(true)
    expect(themes).toContain('default')
  })

  // TC-086: listThemes() when themes dir doesn't exist → ['default']
  it('TC-086: themes/ ディレクトリ非存在 → ["default"]', () => {
    // Mock fs.existsSync to return false for the themes directory
    vi.spyOn(fs, 'existsSync').mockReturnValue(false)

    const themes = listThemes()
    expect(themes).toEqual(['default'])
  })
})
