import { describe, expect, it } from 'vitest'
import { CATEGORY_LABELS, GUESSED_CONFIDENCE, INFERRED_CONFIDENCE, STATED_CONFIDENCE, parseCategory, parseCategoryAnswer } from './category.ts'

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

  it('knows regional food types and checks them before อาหารไทย', () => {
    expect(parseCategory('ขายข้าวซอยไก่')?.value).toBe('อาหารเหนือ')
    expect(parseCategory('น้ำพริกหนุ่มแคบหมู')?.value).toBe('อาหารเหนือ')
    expect(parseCategory('ร้านส้มตำไก่ย่าง')?.value).toBe('อาหารอีสาน')
    expect(parseCategory('แกงไตปลาขนมจีน')?.value).toBe('อาหารใต้')
    expect(parseCategory('น้ำพริกปลาทู')?.value).toBe('อาหารไทย')
  })

  it('keeps the first four chips as before', () => {
    expect(CATEGORY_LABELS.slice(0, 5)).toEqual(['อาหารไทย', 'อาหารตามสั่ง', 'ก๋วยเตี๋ยว', 'เครื่องดื่ม', 'ของหวาน'])
    expect(CATEGORY_LABELS).toContain('อาหารอีสาน')
  })

  it('returns null when nothing matches', () => {
    expect(parseCategory('ขายรองเท้า')).toBeNull()
  })
})

describe('parseCategoryAnswer', () => {
  it('falls back to the answer itself, flagged for checking', () => {
    expect(parseCategoryAnswer('ขายหมูปิ้งค่ะ')).toEqual({ value: 'หมูปิ้ง', confidence: GUESSED_CONFIDENCE })
  })

  it('prefers a known category', () => {
    expect(parseCategoryAnswer('อาหารไทย')?.confidence).toBe(STATED_CONFIDENCE)
  })
})
