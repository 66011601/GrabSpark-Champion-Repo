import { describe, expect, it } from 'vitest'
import { locationPhrase } from './locationPhrase.ts'

describe('locationPhrase', () => {
  it('takes what follows อยู่, with spoken numbers as digits', () => {
    expect(locationPhrase('ร้านชื่อครัวป้าแดงค่ะ ขายน้ำพริกปลาทู อาหารไทยบ้านๆ อยู่ลาดพร้าวซอยเจ็ดสิบเอ็ด ตรงข้ามเซเว่น', false)).toBe(
      'ลาดพร้าวซอย71 ตรงข้ามเซเว่น',
    )
  })

  it('stops where the merchant moves on to something else', () => {
    expect(locationPhrase('ร้านอยู่แถวอารีย์ เปิดสิบโมงถึงสองทุ่ม', false)).toBe('อารีย์')
  })

  it('drops the polite ending', () => {
    expect(locationPhrase('อยู่ที่ตลาดวโรรส เชียงใหม่ค่ะ', false)).toBe('ตลาดวโรรส เชียงใหม่')
  })

  it('treats the whole answer as the place when the companion asked for it', () => {
    expect(locationPhrase('ถนนนิมมานเหมินท์ ซอยเจ็ด เชียงใหม่ค่ะ', true)).toBe('ถนนนิมมานเหมินท์ ซอย7 เชียงใหม่')
  })

  it('finds no place in a sentence about something else', () => {
    expect(locationPhrase('สิบโมงเช้าถึงสองทุ่ม เปิดทุกวัน', false)).toBeNull()
    expect(locationPhrase('ค่ะ', true)).toBeNull()
  })
})
