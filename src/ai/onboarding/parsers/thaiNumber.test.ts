import { describe, expect, it } from 'vitest'
import { normalizeThaiDigits, numbersToDigits, parseThaiNumber, scanNumbers } from './thaiNumber.ts'

describe('parseThaiNumber', () => {
  it.each([
    ['แปดสิบเก้า', 89],
    ['หกสิบห้า', 65],
    ['ร้อยยี่สิบ', 120],
    ['สิบเอ็ด', 11],
    ['ยี่สิบเอ็ด', 21],
    ['สามสิบ', 30],
    ['หนึ่งร้อยห้าสิบ', 150],
    ['สองพันห้าร้อย', 2500],
    ['สิบ', 10],
    ['89', 89],
    ['๘๙ บาท', 89],
    ['฿35', 35],
  ])('%s → %i', (spoken, expected) => {
    expect(parseThaiNumber(spoken)).toBe(expected)
  })

  it.each([['สองสาม'], ['สิบร้อย'], ['เอ็ด'], ['ยี่'], ['ข้าว'], ['']])('rejects %j', (spoken) => {
    expect(parseThaiNumber(spoken)).toBeNull()
  })

  it('rejects two digit runs fused by whitespace', () => {
    expect(parseThaiNumber('89 90')).toBeNull()
  })

  it('rejects a number split by a stray บาท', () => {
    expect(parseThaiNumber('สามบาทสิบ')).toBeNull()
  })

  it('reads spaced number words as one number', () => {
    expect(parseThaiNumber('แปด สิบ เก้า')).toBe(89)
  })
})

describe('scanNumbers', () => {
  it('finds a spoken soi number inside an address', () => {
    const text = 'ลาดพร้าวซอยเจ็ดสิบเอ็ด ตรงข้ามเซเว่น'
    const matches = scanNumbers(text)
    expect(matches.map((m) => m.value)).toEqual([71])
    expect(text.slice(matches[0].start, matches[0].end)).toBe('เจ็ดสิบเอ็ด')
    expect(matches[0].kind).toBe('words')
  })

  it('finds digit prices', () => {
    expect(scanNumbers('ข้าวมันไก่ 50 ต้มเลือดหมู 40 บาท').map((m) => m.value)).toEqual([50, 40])
  })

  it('does not read 65 out of หกสิบห้าง', () => {
    expect(scanNumbers('ซอยหกสิบห้างโลตัส').map((m) => m.value)).toEqual([60])
  })
})

describe('normalizeThaiDigits', () => {
  it('turns Thai digits into Arabic digits without changing length', () => {
    expect(normalizeThaiDigits('โทร ๐๘๑')).toBe('โทร 081')
  })
})

describe('numbersToDigits', () => {
  it('replaces number words with digits', () => {
    expect(numbersToDigits('สิบโมงเช้าถึงสองทุ่ม')).toBe('10โมงเช้าถึง2ทุ่ม')
  })

  it('keeps digit runs exactly as written', () => {
    expect(numbersToDigits('10:00 – 20:00')).toBe('10:00 – 20:00')
  })

  it('reads colloquial "นึง" as one', () => {
    expect(numbersToDigits('ทุ่มนึง')).toBe('ทุ่ม1')
  })

  it('leaves number words inside ordinary compounds alone', () => {
    expect(numbersToDigits('ตรงข้ามห้างโลตัส')).toBe('ตรงข้ามห้างโลตัส')
    expect(numbersToDigits('ศูนย์อาหาร')).toBe('ศูนย์อาหาร')
    expect(numbersToDigits('ตรงสี่แยก')).toBe('ตรงสี่แยก')
  })
})
