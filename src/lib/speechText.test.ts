import { describe, expect, it } from 'vitest'
import { toSpeech } from './speechText.ts'

describe('toSpeech', () => {
  it('reads a masked phone number by its last digits', () => {
    expect(toSpeech('ใช้เบอร์ 08x-xxx-4217 ที่ล็อกอินอยู่ไหมคะ?')).toBe('ใช้เบอร์ ที่ลงท้ายด้วย 4 2 1 7 ที่ล็อกอินอยู่ไหมคะ?')
  })

  it('drops quote marks around button names', () => {
    expect(toSpeech('ครบแล้วค่ะ กด "ต่อไป" ได้เลย')).toBe('ครบแล้วค่ะ กด ต่อไป ได้เลย')
  })

  it('does not spell out an example email address', () => {
    expect(toSpeech('อีเมลยังไม่ถูกค่ะ ต้องมี @ เช่น name@example.com')).toBe('อีเมลยังไม่ถูกค่ะ ต้องมี เครื่องหมายแอท')
  })
})
