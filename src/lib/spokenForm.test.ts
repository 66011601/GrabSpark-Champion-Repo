import { describe, expect, it } from 'vitest'
import { th } from '@/copy/th.ts'
import { sayInstead, spokenForm } from './spokenForm.ts'

describe('spokenForm', () => {
  it('shows the dishes, and gives the recorded voice the fixed line', () => {
    const shown = th.act2.addMenu.ready('ชาเย็น 25 บาท')
    expect(shown).toContain('ชาเย็น 25 บาท')
    expect(spokenForm(shown)).toBe(th.act2.addMenu.readySaid)
    expect(spokenForm(`ขอโทษค่ะ ${th.h2.addedAsk('น้ำส้ม 20 บาท')}`)).toBe(`ขอโทษค่ะ ${th.h2.addedSaid}`)
  })

  it('leaves every other line as it is', () => {
    sayInstead('ก', 'ข')
    expect(spokenForm('เล่าเรื่องร้านให้หนูฟังได้เลยค่ะ')).toBe('เล่าเรื่องร้านให้หนูฟังได้เลยค่ะ')
  })
})
