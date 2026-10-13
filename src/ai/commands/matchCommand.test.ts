import { describe, expect, it } from 'vitest'
import { matchCommand } from './matchCommand.ts'
import { SAY } from './phrases.ts'

const WELCOME = [
  { id: 'register', phrases: SAY.register },
  { id: 'login', phrases: SAY.login },
]
const STORE = [
  { id: 'next', phrases: SAY.next },
  { id: 'back', phrases: SAY.back },
]

describe('matchCommand', () => {
  it('hears a button name, with polite words around it', () => {
    expect(matchCommand('ลงทะเบียนค่ะ', WELCOME)).toBe('register')
    expect(matchCommand('เข้าสู่ระบบ ครับ', WELCOME)).toBe('login')
    expect(matchCommand('กดไปต่อเลยค่ะ', STORE)).toBe('next')
  })

  it('answers the "เคยสมัครรึยังคะ?" question either way', () => {
    expect(matchCommand('ยังไม่เคยค่ะ', WELCOME)).toBe('register')
    expect(matchCommand('ยังค่ะ', WELCOME)).toBe('register')
    expect(matchCommand('เคยแล้วค่ะ', WELCOME)).toBe('login')
    expect(matchCommand('เคยสมัครแล้วค่ะ', WELCOME)).toBe('login')
  })

  it('leaves a sentence about the shop alone, even with a command word in it', () => {
    expect(matchCommand('ร้านชื่อครัวป้าแดงค่ะ อยู่ลาดพร้าวซอยเจ็ดสิบเอ็ด ถัดไปจากเซเว่น', STORE)).toBeNull()
  })

  it('does not find a short command inside another word', () => {
    expect(matchCommand('ครัวกลับบ้าน', STORE)).toBeNull()
    expect(matchCommand('กลับค่ะ', STORE)).toBe('back')
  })

  it('hears nothing in unrelated words', () => {
    expect(matchCommand('ครัวป้าแดง', STORE)).toBeNull()
    expect(matchCommand('', STORE)).toBeNull()
  })
})
