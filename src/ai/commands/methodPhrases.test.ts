import { describe, expect, it } from 'vitest'
import { matchCommand } from './matchCommand.ts'
import { SAY } from './phrases.ts'

const METHODS = [
  { id: 'voice', phrases: SAY.methodVoice },
  { id: 'photo', phrases: SAY.methodPhoto },
  { id: 'type', phrases: SAY.methodType },
]

describe('choosing a method by voice', () => {
  it('hears each method, with polite words around it', () => {
    expect(matchCommand('พูดค่ะ', METHODS)).toBe('voice')
    expect(matchCommand('ใช้เสียง', METHODS)).toBe('voice')
    expect(matchCommand('อยากถ่ายรูปค่ะ', METHODS)).toBe('photo')
    expect(matchCommand('ขอพิมพ์เองค่ะ', METHODS)).toBe('type')
  })

  it('does not take a sentence about the shop as a choice', () => {
    expect(matchCommand('ร้านขายข้าวมันไก่ ถ่ายรูปเมนูสวยมากเลยค่ะ อยู่ลาดพร้าว', METHODS)).toBeNull()
  })
})
