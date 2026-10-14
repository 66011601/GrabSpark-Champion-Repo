import { describe, expect, it } from 'vitest'
import { isValidThaiId } from './thaiId.ts'

describe('isValidThaiId', () => {
  it('accepts 13 digits whose last digit is the checksum', () => {
    expect(isValidThaiId('1234567890121')).toBe(true)
    expect(isValidThaiId('1103700412344')).toBe(true)
  })

  it('rejects a wrong checksum', () => {
    expect(isValidThaiId('1234567890122')).toBe(false)
  })

  it('rejects anything that is not exactly 13 digits', () => {
    expect(isValidThaiId('123456789012')).toBe(false)
    expect(isValidThaiId('1-2345-67890-12-1')).toBe(false)
    expect(isValidThaiId('')).toBe(false)
  })
})
