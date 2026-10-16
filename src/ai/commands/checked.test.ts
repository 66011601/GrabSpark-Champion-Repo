import { describe, expect, it } from 'vitest'
import { understandThai } from '@/ai/language/understand.ts'
import { checkedField } from './checked.ts'

const unchecked = { valid: false, issues: [{ field: 'building' as const, problem: 'unchecked' as const }] }

describe('checkedField', () => {
  it('confirms the field the helper asks about when the merchant says it is right', () => {
    for (const said of ['ถูกแล้ว', 'ถูกแล้วค่ะ', 'ใช่', 'โอเค', 'เช็คแล้ว', 'แม่นแล้ว']) expect(checkedField(understandThai(said).text, unchecked), said).toBe('building')
  })

  it('confirms nothing for other words, or when nothing is waiting to be checked', () => {
    expect(checkedField('ต่อไป', unchecked)).toBeNull()
    expect(checkedField('ร้านชื่อครัวป้าแดง', unchecked)).toBeNull()
    expect(checkedField('ถูกแล้ว', { valid: false, issues: [{ field: 'storeName', problem: 'missing' }] })).toBeNull()
    expect(checkedField('ถูกแล้ว', { valid: true, issues: [] })).toBeNull()
  })
})
