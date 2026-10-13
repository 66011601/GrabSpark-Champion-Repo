import { describe, expect, it } from 'vitest'
import { checkEmail, checkPassword } from './account.ts'

describe('checkEmail', () => {
  it('accepts a normal address, ignoring spaces around it', () => {
    expect(checkEmail(' padaeng@example.com ')).toBeNull()
  })

  it('reports an empty or malformed address', () => {
    expect(checkEmail('  ')).toBe('empty')
    expect(checkEmail('padaeng')).toBe('invalid')
    expect(checkEmail('padaeng@example')).toBe('invalid')
    expect(checkEmail('pa daeng@example.com')).toBe('invalid')
  })
})

describe('checkPassword', () => {
  it('wants 8 characters for a new password', () => {
    expect(checkPassword('1234567', true)).toBe('short')
    expect(checkPassword('12345678', true)).toBeNull()
  })

  it('only wants an existing password to be filled in', () => {
    expect(checkPassword('', false)).toBe('empty')
    expect(checkPassword('1234', false)).toBeNull()
  })
})
