import { describe, expect, it } from 'vitest'
import { namesMatch, normalizeName } from './nameMatch.ts'

describe('normalizeName', () => {
  it('drops the title and every space', () => {
    expect(normalizeName('นาง แดง ใจดี')).toBe('แดงใจดี')
    expect(normalizeName('นางสาวแดง  ใจดี')).toBe('แดงใจดี')
    expect(normalizeName('น.ส. แดง ใจดี')).toBe('แดงใจดี')
    expect(normalizeName(' นาย สมชาย ขายดี ')).toBe('สมชายขายดี')
  })
})

describe('namesMatch', () => {
  it('matches the ID card name with the bank book name', () => {
    expect(namesMatch('แดง ใจดี', 'นาง แดง ใจดี')).toBe(true)
  })

  it('does not match a different person', () => {
    expect(namesMatch('แดง ใจดี', 'นาง แดง ใจร้าย')).toBe(false)
  })

  it('never matches two empty names', () => {
    expect(namesMatch('', '')).toBe(false)
    expect(namesMatch('นาง', 'นาง')).toBe(false)
  })
})
