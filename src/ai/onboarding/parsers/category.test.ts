import { describe, expect, it } from 'vitest'
import { GUESSED_CONFIDENCE, INFERRED_CONFIDENCE, STATED_CONFIDENCE, parseCategory, parseCategoryAnswer } from './category.ts'

describe('parseCategory', () => {
  it('is confident when the category is said outright', () => {
    expect(parseCategory('ขายน้ำพริกปลาทู อาหารไทยบ้านๆ')).toEqual({ value: 'อาหารไทย', confidence: STATED_CONFIDENCE })
  })

  it('is less confident when guessed from a dish', () => {
    expect(parseCategory('ขายน้ำพริกปลาทู')).toEqual({ value: 'อาหารไทย', confidence: INFERRED_CONFIDENCE })
  })

  it('recognises drink shops', () => {
    expect(parseCategory('เป็นร้านกาแฟเล็กๆ')?.value).toBe('เครื่องดื่ม')
  })

  it('returns null when nothing matches', () => {
    expect(parseCategory('ขายรองเท้า')).toBeNull()
  })
})

describe('parseCategoryAnswer', () => {
  it('falls back to the answer itself, flagged for checking', () => {
    expect(parseCategoryAnswer('ขายส้มตำค่ะ')).toEqual({ value: 'ส้มตำ', confidence: GUESSED_CONFIDENCE })
  })

  it('prefers a known category', () => {
    expect(parseCategoryAnswer('อาหารไทย')?.confidence).toBe(STATED_CONFIDENCE)
  })
})
