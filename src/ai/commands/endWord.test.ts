import { describe, expect, it } from 'vitest'
import { cutAtEndWord } from './endWord.ts'

describe('cutAtEndWord', () => {
  it('ends the turn at "จ้า" and drops it', () => {
    expect(cutAtEndWord('ร้านชื่อครัวป้าแดง อยู่ลาดพร้าว 71 จ้า')).toEqual({ text: 'ร้านชื่อครัวป้าแดง อยู่ลาดพร้าว 71', ended: true })
    expect(cutAtEndWord('สิบโมงเช้าถึงสองทุ่มจ้า')).toEqual({ text: 'สิบโมงเช้าถึงสองทุ่ม', ended: true })
  })

  it('drops anything said after it', () => {
    expect(cutAtEndWord('ต่อไปจ้า แล้วก็').text).toBe('ต่อไป')
  })

  it('also hears "จ้ะ"', () => {
    expect(cutAtEndWord('เปิดทุกวันจ้ะ')).toEqual({ text: 'เปิดทุกวัน', ended: true })
  })

  it('keeps listening while the word has not been said', () => {
    expect(cutAtEndWord(' ร้านชื่อครัวป้าแดง ')).toEqual({ text: 'ร้านชื่อครัวป้าแดง', ended: false })
  })

  it('is not fooled by the same letters inside another word', () => {
    expect(cutAtEndWord('ร้านข้าวมันไก่เจ้าเก่า').ended).toBe(false)
    expect(cutAtEndWord('มีลูกจ้างสองคน').ended).toBe(false)
    expect(cutAtEndWord('ร้านเจ้าของเดิมจ้า')).toEqual({ text: 'ร้านเจ้าของเดิม', ended: true })
  })

  it('reports an empty turn when it is the only word', () => {
    expect(cutAtEndWord('จ้า')).toEqual({ text: '', ended: true })
  })
})
