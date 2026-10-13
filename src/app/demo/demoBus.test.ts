import { describe, expect, it, vi } from 'vitest'
import { demoBus } from './demoBus.ts'

describe('demoBus', () => {
  it('delivers lines to listeners until they unsubscribe', () => {
    const listener = vi.fn()
    const unsubscribe = demoBus.onSay(listener)
    demoBus.say('สวัสดี')
    unsubscribe()
    demoBus.say('ลาก่อน')
    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenCalledWith('สวัสดี')
  })
})
