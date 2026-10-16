import { describe, expect, it } from 'vitest'
import { normalizeThaiDigits } from '@/ai/onboarding/parsers/thaiNumber.ts'
import { BANK } from '@/ai/understanding/bank/index.ts'
import { fixHeard } from './heard.ts'
import { MISHEARD } from './heardBank.ts'
import { understandThai } from './understand.ts'

const squashed = (text: string) => understandThai(text).text.replace(/\s+/g, '')

describe('fixHeard: what the recogniser wrote, back to what the merchant said', () => {
  it('has mistakes from every region', () => {
    expect(MISHEARD.length).toBeGreaterThanOrEqual(60)
    for (const region of ['central', 'isan', 'north', 'south'] as const) expect(MISHEARD.filter((entry) => entry.region === region).length).toBeGreaterThanOrEqual(8)
  })

  it.each(MISHEARD)('$heard → $meant', ({ heard, meant }) => {
    expect(squashed(fixHeard(heard))).toBe(squashed(meant))
  })

  it('leaves the same words alone where they mean something else', () => {
    for (const said of [
      'ผัดเห็ดให้หน่อย', // a mushroom dish
      'ต้มยำเห็ดได้ไหม',
      'เห็ดหอม 50 บาท',
      'มีเห็ดไหม',
      'เมื่อวานขายได้เท่าไหร่', // เมื่อ, not Isan มื้อ
      'บ่อมีปลาเยอะ', // a pond
      'แหล่งท่องเที่ยวใกล้ร้าน',
      'ร้าน OK Coffee',
      'ร้านจ้าวสัวค่ะ',
      'ขายดีจังได้เงินเยอะ',
      'แผลบาดลึก',
      'เจ้าของร้านชื่อแดง',
      'นานา',
      'ไปห้า ห้างนั้น',
    ])
      expect(fixHeard(said), said).toBe(said)
  })

  it('never folds the digits of a phone number', () => {
    expect(fixHeard('081 081 1234')).toBe('081 081 1234')
    expect(fixHeard('ศูนย์ แปด แปด สอง สอง')).toBe('ศูนย์แปดแปดสองสอง')
  })

  // Recogniser fragments ("ไป ไป ที่") may lose a repeat; they mean nothing either way.
  it('changes no sentence of the bank that means something, so what is understood today still is', () => {
    const changed = BANK.filter((entry) => entry.label !== 'none' && fixHeard(entry.say) !== normalizeThaiDigits(entry.say.trim())).map((entry) => entry.say)
    expect(changed).toEqual([])
  })
})
