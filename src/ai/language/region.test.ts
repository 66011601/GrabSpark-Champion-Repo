import { afterEach, describe, expect, it } from 'vitest'
import { th } from '@/copy/th.ts'
import { greetingFor, holdGreeting, takeGreeting, withGreeting } from './greeting.ts'
import { noteRegion, regionNow, resetRegion } from './region.ts'

const none = { isan: 0, north: 0, south: 0 }

afterEach(() => {
  resetRegion()
  takeGreeting()
})

describe('noteRegion', () => {
  it('is sure after two region words in one sentence, and says so once', () => {
    expect(noteRegion({ ...none, isan: 2 })).toBe('isan')
    expect(noteRegion({ ...none, isan: 3 })).toBeNull()
    expect(regionNow()).toBe('isan')
  })

  it('is sure after the same region in two sentences', () => {
    expect(noteRegion({ ...none, north: 1 })).toBeNull()
    expect(noteRegion({ ...none, north: 1 })).toBe('north')
  })

  it('waits on mixed or empty signals', () => {
    expect(noteRegion(none)).toBeNull()
    expect(noteRegion({ isan: 1, north: 1, south: 0 })).toBeNull()
    expect(regionNow()).toBeNull()
  })
})

describe('greeting', () => {
  it('greets in the region’s style, once, before the notice', () => {
    expect(greetingFor('south')).toBe(th.language.greet.south)
    expect(greetingFor(null)).toBeNull()
    expect(withGreeting('ยังไม่ได้กรอกชื่อร้านค่ะ', 'สวัสดีเจ้า')).toBe('สวัสดีเจ้า ยังไม่ได้กรอกชื่อร้านค่ะ')
    expect(withGreeting(null, 'สวัสดีเจ้า')).toBe('สวัสดีเจ้า')
    expect(withGreeting('x', null)).toBe('x')
  })

  it('keeps the greeting until a notice is shown, then gives it out once', () => {
    expect(takeGreeting()).toBeNull()
    holdGreeting(greetingFor(noteRegion({ ...none, north: 2 })))
    // a turn that leaves the screen shows nothing and takes nothing; a later turn on any screen takes it
    expect(takeGreeting()).toBe(th.language.greet.north)
    expect(takeGreeting()).toBeNull()
  })

  it('is not cleared by a sentence that brings no greeting', () => {
    holdGreeting(th.language.greet.isan)
    holdGreeting(null)
    expect(takeGreeting()).toBe(th.language.greet.isan)
  })
})
