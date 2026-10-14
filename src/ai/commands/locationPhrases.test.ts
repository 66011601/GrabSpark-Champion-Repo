import { describe, expect, it } from 'vitest'
import script from '@/data/onboarding-script.json'
import { matchCommand } from './matchCommand.ts'
import { SAY } from './phrases.ts'

// The same commands, in the same order, as 3/7 (S3Business).
const STEP3 = [
  { id: 'next' as const, phrases: SAY.next },
  { id: 'back' as const, phrases: SAY.back },
  { id: 'typeInstead' as const, phrases: SAY.typeInstead },
  { id: 'here' as const, phrases: SAY.here },
  { id: 'pin' as const, phrases: SAY.pin },
]

describe('location commands on 3/7', () => {
  it('hears "use where I am"', () => {
    expect(matchCommand('ใช้ตำแหน่งนี้เลยค่ะ', STEP3)).toBe('here')
    expect(matchCommand('ร้านอยู่ตรงนี้', STEP3)).toBe('here')
    expect(matchCommand('อยู่ที่ร้านตอนนี้ค่ะ', STEP3)).toBe('here')
  })

  it('hears "let me pin it"', () => {
    expect(matchCommand('ปักหมุดเองค่ะ', STEP3)).toBe('pin')
    expect(matchCommand('ขอเลือกบนแผนที่', STEP3)).toBe('pin')
  })

  it('leaves shop talk and other commands alone', () => {
    expect(matchCommand(script.lines[0].say, STEP3)).toBeNull()
    expect(matchCommand('ต่อไป', STEP3)).toBe('next')
  })
})
