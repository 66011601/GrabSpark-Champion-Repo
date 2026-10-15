import { describe, expect, it } from 'vitest'
import { markSeen, shouldSpotlight } from './spotlight.ts'

describe('shouldSpotlight', () => {
  it('spotlights a step the first time only, so going back does not dim the page again', () => {
    const seen = new Set<string>()
    expect(shouldSpotlight('ใส่ชื่อร้านได้เลยค่ะ', seen)).toBe(true)
    markSeen('ใส่ชื่อร้านได้เลยค่ะ', seen)
    expect(shouldSpotlight('ใส่ชื่อร้านได้เลยค่ะ', seen)).toBe(false)
    expect(shouldSpotlight('ถ่ายรูปบัตรประชาชนค่ะ', seen)).toBe(true)
  })

  it('only looks, so asking twice gives the same answer', () => {
    const seen = new Set<string>()
    expect(shouldSpotlight('ใส่ชื่อร้านได้เลยค่ะ', seen)).toBe(true)
    expect(shouldSpotlight('ใส่ชื่อร้านได้เลยค่ะ', seen)).toBe(true)
  })

  it('never spotlights an empty line', () => {
    expect(shouldSpotlight('', new Set())).toBe(false)
    expect(shouldSpotlight('   ', new Set())).toBe(false)
  })
})
