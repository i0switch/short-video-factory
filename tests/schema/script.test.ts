import { describe, it, expect } from 'vitest'
import { ScriptSchema } from '../../src/schema/script'

const validItem = (rank: number) => ({
  rank,
  topic: 'テスト',
  comment1: 'コメント1',
  comment2: 'コメント2',
  body: 'ボディテキスト',
  imageKeywords: ['テスト'],
  imageKeywordsEn: ['test'],
})

const validInput = {
  videoTitle: 'テスト動画タイトル',
  intro: 'イントロ',
  items: [validItem(3), validItem(2), validItem(1)],
  outro: 'おわり',
}

describe('ScriptSchema', () => {
  // TC-001: 全フィールド正常値でパース成功
  it('TC-001: 正常パース', () => {
    expect(() => ScriptSchema.parse(validInput)).not.toThrow()
    const result = ScriptSchema.parse(validInput)
    expect(result.videoTitle).toBe('テスト動画タイトル')
    expect(result.items).toHaveLength(3)
  })

  // TC-002: videoTitle min=1
  it('TC-002: videoTitle 最小長=1', () => {
    expect(() => ScriptSchema.parse({ ...validInput, videoTitle: 'A' })).not.toThrow()
  })

  // TC-003: videoTitle max=40
  it('TC-003: videoTitle 最大長=40', () => {
    expect(() => ScriptSchema.parse({ ...validInput, videoTitle: 'A'.repeat(40) })).not.toThrow()
  })

  // TC-004: videoTitle 41文字 → failure
  it('TC-004: videoTitle 超過=41 → failure', () => {
    const result = ScriptSchema.safeParse({ ...validInput, videoTitle: 'A'.repeat(41) })
    expect(result.success).toBe(false)
  })

  // TC-005: videoTitle empty → failure
  it('TC-005: videoTitle 空文字 → failure', () => {
    const result = ScriptSchema.safeParse({ ...validInput, videoTitle: '' })
    expect(result.success).toBe(false)
  })

  // TC-006: topic max=24
  it('TC-006: topic 最大長=24', () => {
    const item = { ...validItem(1), topic: 'A'.repeat(24) }
    expect(() => ScriptSchema.parse({ ...validInput, items: [validItem(3), validItem(2), item] })).not.toThrow()
  })

  // TC-007: topic 25 → failure
  it('TC-007: topic 超過=25 → failure', () => {
    const item = { ...validItem(1), topic: 'A'.repeat(25) }
    const result = ScriptSchema.safeParse({ ...validInput, items: [validItem(3), validItem(2), item] })
    expect(result.success).toBe(false)
  })

  // TC-008: comment1 max=50
  it('TC-008: comment1 最大=50', () => {
    const item = { ...validItem(1), comment1: 'A'.repeat(50) }
    expect(() => ScriptSchema.parse({ ...validInput, items: [validItem(3), validItem(2), item] })).not.toThrow()
  })

  // TC-009: comment1 51 → failure
  it('TC-009: comment1 超過=51 → failure', () => {
    const item = { ...validItem(1), comment1: 'A'.repeat(51) }
    const result = ScriptSchema.safeParse({ ...validInput, items: [validItem(3), validItem(2), item] })
    expect(result.success).toBe(false)
  })

  // TC-010: comment2 51 → failure
  it('TC-010: comment2 超過=51 → failure', () => {
    const item = { ...validItem(1), comment2: 'A'.repeat(51) }
    const result = ScriptSchema.safeParse({ ...validInput, items: [validItem(3), validItem(2), item] })
    expect(result.success).toBe(false)
  })

  // TC-011: body max=100
  it('TC-011: body 最大=100', () => {
    const item = { ...validItem(1), body: 'A'.repeat(100) }
    expect(() => ScriptSchema.parse({ ...validInput, items: [validItem(3), validItem(2), item] })).not.toThrow()
  })

  // TC-012: body 101 → failure
  it('TC-012: body 超過=101 → failure', () => {
    const item = { ...validItem(1), body: 'A'.repeat(101) }
    const result = ScriptSchema.safeParse({ ...validInput, items: [validItem(3), validItem(2), item] })
    expect(result.success).toBe(false)
  })

  // TC-013: outro max=30
  it('TC-013: outro 最大=30', () => {
    expect(() => ScriptSchema.parse({ ...validInput, outro: 'A'.repeat(30) })).not.toThrow()
  })

  // TC-014: outro 31 → failure
  it('TC-014: outro 超過=31 → failure', () => {
    const result = ScriptSchema.safeParse({ ...validInput, outro: 'A'.repeat(31) })
    expect(result.success).toBe(false)
  })

  // TC-015: items min=3
  it('TC-015: items 最小=3', () => {
    expect(() => ScriptSchema.parse({ ...validInput, items: [validItem(3), validItem(2), validItem(1)] })).not.toThrow()
  })

  // TC-016: items 2個 → failure
  it('TC-016: items 2個(最小未満) → failure', () => {
    const result = ScriptSchema.safeParse({ ...validInput, items: [validItem(2), validItem(1)] })
    expect(result.success).toBe(false)
  })

  // TC-017: items 10個
  it('TC-017: items 最大=10', () => {
    const items = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(validItem)
    expect(() => ScriptSchema.parse({ ...validInput, items })).not.toThrow()
  })

  // TC-018: items 11個 → failure
  it('TC-018: items 超過=11 → failure', () => {
    const items = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(validItem)
    const result = ScriptSchema.safeParse({ ...validInput, items })
    expect(result.success).toBe(false)
  })

  // TC-019: rank 重複 → failure with 'rank must be unique'
  it('TC-019: rank 重複 → failure', () => {
    const result = ScriptSchema.safeParse({
      ...validInput,
      items: [validItem(3), validItem(3), validItem(1)],
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.message).toContain('rank must be unique')
    }
  })

  // TC-020: rank 降順でない → failure with 'descending rank order'
  it('TC-020: rank 降順でない → failure', () => {
    const result = ScriptSchema.safeParse({
      ...validInput,
      items: [validItem(1), validItem(2), validItem(3)],
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.message).toContain('descending rank order')
    }
  })

  // TC-021: rank=0 → failure
  it('TC-021: rank=0 → failure', () => {
    const item = { ...validItem(1), rank: 0 }
    const result = ScriptSchema.safeParse({ ...validInput, items: [validItem(3), validItem(2), item] })
    expect(result.success).toBe(false)
  })

  // TC-022: rank=-1 → failure
  it('TC-022: rank 負数 → failure', () => {
    const item = { ...validItem(1), rank: -1 }
    const result = ScriptSchema.safeParse({ ...validInput, items: [validItem(3), validItem(2), item] })
    expect(result.success).toBe(false)
  })

  // TC-023: rank=1.5 → failure
  it('TC-023: rank 小数 → failure', () => {
    const item = { ...validItem(1), rank: 1.5 }
    const result = ScriptSchema.safeParse({ ...validInput, items: [validItem(3), validItem(2), item] })
    expect(result.success).toBe(false)
  })

  // TC-024: unique=OK & 降順=NG → failure 'descending'
  it('TC-024: unique=OK & 降順=NG → failure', () => {
    // 3→1→2: rank は重複なし (unique OK) だが降順でない (3→1→2 is not descending at 1→2)
    const result = ScriptSchema.safeParse({
      ...validInput,
      items: [validItem(3), validItem(1), validItem(2)],
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.message).toContain('descending')
    }
  })

  // TC-025: imageKeywords 空配列 → failure
  it('TC-025: imageKeywords 空配列 → failure', () => {
    const item = { ...validItem(1), imageKeywords: [] }
    const result = ScriptSchema.safeParse({ ...validInput, items: [validItem(3), validItem(2), item] })
    expect(result.success).toBe(false)
  })

  // TC-026: imageKeywords 5個
  it('TC-026: imageKeywords 5個(最大)', () => {
    const item = { ...validItem(1), imageKeywords: ['a', 'b', 'c', 'd', 'e'] }
    expect(() => ScriptSchema.parse({ ...validInput, items: [validItem(3), validItem(2), item] })).not.toThrow()
  })

  // TC-027: imageKeywords 6個 → failure
  it('TC-027: imageKeywords 超過=6 → failure', () => {
    const item = { ...validItem(1), imageKeywords: ['a', 'b', 'c', 'd', 'e', 'f'] }
    const result = ScriptSchema.safeParse({ ...validInput, items: [validItem(3), validItem(2), item] })
    expect(result.success).toBe(false)
  })
})
