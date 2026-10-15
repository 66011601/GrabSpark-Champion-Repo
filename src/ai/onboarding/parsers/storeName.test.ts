import { describe, expect, it } from 'vitest'
import { ANSWER_CONFIDENCE, NAME_CONFIDENCE, parseStoreName, parseStoreNameAnswer } from './storeName.ts'

describe('parseStoreName', () => {
  it('reads "ร้านชื่อ…"', () => {
    expect(parseStoreName('ร้านชื่อครัวป้าแดงค่ะ ขายน้ำพริกปลาทู')).toEqual({ value: 'ครัวป้าแดง', confidence: NAME_CONFIDENCE })
  })

  it('reads "ชื่อร้านว่า…"', () => {
    expect(parseStoreName('ชื่อร้านว่าครัวป้าแดง')?.value).toBe('ครัวป้าแดง')
  })

  it('stops at the next verb when there is no pause', () => {
    expect(parseStoreName('ร้านของป้าชื่อครัวป้าแดงขายน้ำพริก')?.value).toBe('ครัวป้าแดง')
  })

  it('ignores sentences that do not name the shop', () => {
    expect(parseStoreName('ร้านอยู่ลาดพร้าว')).toBeNull()
  })
})

describe('parseStoreNameAnswer', () => {
  it('takes the whole answer as the name', () => {
    expect(parseStoreNameAnswer('ครัวป้าแดงค่ะ')).toEqual({ value: 'ครัวป้าแดง', confidence: ANSWER_CONFIDENCE })
  })

  it('keeps a leading "ร้าน" that is part of the name', () => {
    expect(parseStoreNameAnswer('ร้านป้าแดงครับ')?.value).toBe('ร้านป้าแดง')
  })

  it('returns null for silence', () => {
    expect(parseStoreNameAnswer('  ')).toBeNull()
  })

  it('does not take a question about the name for the name', () => {
    for (const said of ['ชื่อร้านต้องตั้งยังไงคะ', 'ชื่อร้านใส่อะไรดี', 'ร้านชื่ออะไรดีนะ']) expect(parseStoreName(said), said).toBeNull()
    expect(parseStoreNameAnswer('ชื่อร้านนี่ต้องตั้งอย่างไร')).toBeNull()
    expect(parseStoreNameAnswer('ครัวป้าแดง ขายส้มตำ')?.value).toBe('ครัวป้าแดง')
  })
})
