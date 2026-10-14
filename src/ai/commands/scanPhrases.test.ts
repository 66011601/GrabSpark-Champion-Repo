import { describe, expect, it } from 'vitest'
import { matchCommand } from './matchCommand.ts'
import { SAY } from './phrases.ts'

// The same commands S1 listens for.
const COMMANDS = [
  { id: 'retake' as const, phrases: SAY.retake },
  { id: 'shoot' as const, phrases: SAY.shoot },
  { id: 'use' as const, phrases: SAY.useScan },
  { id: 'skip' as const, phrases: SAY.skip },
]

describe('speaking to the scanner', () => {
  it('hears each action', () => {
    expect(matchCommand('ถ่ายรูปใหม่ค่ะ', COMMANDS)).toBe('retake')
    expect(matchCommand('ถ่ายเลย', COMMANDS)).toBe('shoot')
    expect(matchCommand('ใช้รูปนี้', COMMANDS)).toBe('use')
    expect(matchCommand('ข้ามไปก่อน', COMMANDS)).toBe('skip')
  })
})
