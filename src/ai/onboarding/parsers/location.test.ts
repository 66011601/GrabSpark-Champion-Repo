import { describe, expect, it } from 'vitest'
import landmarks from '@/data/landmarks.json'
import { LOCATION_CONFIDENCE, normalizePlace, parseLocation } from './location.ts'

describe('normalizePlace', () => {
  it('turns spoken numbers into digits and drops spaces and "ซอย"', () => {
    expect(normalizePlace('ลาดพร้าวซอยเจ็ดสิบเอ็ด')).toBe('ลาดพร้าว71')
    expect(normalizePlace('ซอยลาดพร้าว 71')).toBe('ลาดพร้าว71')
  })
})

describe('parseLocation', () => {
  it('finds the demo shop and keeps the landmark phrase', () => {
    const result = parseLocation('ร้านชื่อครัวป้าแดงค่ะ ขายน้ำพริกปลาทู อาหารไทยบ้านๆ อยู่ลาดพร้าวซอยเจ็ดสิบเอ็ด ตรงข้ามเซเว่น', landmarks)
    expect(result).toEqual({
      value: { text: 'ลาดพร้าว 71 ตรงข้ามเซเว่น', lat: 13.8016, lng: 100.6033 },
      confidence: LOCATION_CONFIDENCE,
    })
  })

  it('works with digits and no landmark phrase', () => {
    expect(parseLocation('อยู่ซอยลาดพร้าว 71 ค่ะ', landmarks)?.value.text).toBe('ลาดพร้าว 71')
  })

  it('matches other known areas', () => {
    expect(parseLocation('ร้านอยู่แถวอารีย์', landmarks)?.value.text).toBe('อารีย์')
  })

  it('is always below the pin-check threshold', () => {
    expect(LOCATION_CONFIDENCE).toBeLessThan(0.8)
  })

  it('returns null for unknown places', () => {
    expect(parseLocation('อยู่เชียงใหม่', landmarks)).toBeNull()
  })
})
