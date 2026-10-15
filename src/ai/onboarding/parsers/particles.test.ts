import { describe, expect, it } from 'vitest'
import { stripParticles } from './particles.ts'

describe('stripParticles', () => {
  it('drops the polite word at the end', () => {
    expect(stripParticles('ครัวป้าแดงค่ะ')).toBe('ครัวป้าแดง')
    expect(stripParticles('ตลาดพลูจ้า')).toBe('ตลาดพลู')
  })

  it('keeps เจ้า at the end of a word such as ศาลเจ้า', () => {
    expect(stripParticles('ตลาดศาลเจ้า')).toBe('ตลาดศาลเจ้า')
    expect(stripParticles('ร้านเจ้าดัง')).toBe('ร้านเจ้าดัง')
  })
})
