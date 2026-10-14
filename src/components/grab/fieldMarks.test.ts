import { describe, expect, it } from 'vitest'
import { th } from '@/copy/th.ts'
import { fieldMark, needsAmber, TYPED } from './fieldMarks.ts'

describe('fieldMark', () => {
  it('marks nothing on an empty or typed field', () => {
    expect(fieldMark({ status: 'empty' })).toBeNull()
    expect(fieldMark({ status: 'heard', heardFrom: TYPED })).toBeNull()
  })

  it('marks a photographed or suggested value with its source', () => {
    expect(fieldMark({ status: 'heard', heardFrom: th.scan.source.idCard })).toEqual({ source: 'รูปบัตรประชาชน', spoken: false })
    expect(fieldMark({ status: 'confirmed', heardFrom: th.sources.account })).toEqual({ source: 'จากบัญชีที่สมัคร', spoken: false })
  })

  it('marks spoken words as heard', () => {
    expect(fieldMark({ status: 'heard', heardFrom: 'ร้านชื่อครัวป้าแดงค่ะ' })).toEqual({ source: 'ร้านชื่อครัวป้าแดงค่ะ', spoken: true })
  })
})

describe('needsAmber', () => {
  it('is true only for an unsure draft', () => {
    expect(needsAmber({ status: 'heard', confidence: 0.6 })).toBe(true)
    expect(needsAmber({ status: 'confirmed', confidence: 0.6 })).toBe(false)
    expect(needsAmber({ status: 'heard', confidence: 0.9 })).toBe(false)
  })
})
