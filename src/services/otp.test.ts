import { describe, expect, it } from 'vitest'
import { isValidPhone, MOCK_OTP, OTP_LENGTH, verifyOtp } from './otp.ts'

describe('mock OTP', () => {
  it('accepts a Thai mobile number only', () => {
    expect(isValidPhone('0812344217')).toBe(true)
    expect(isValidPhone('812344217')).toBe(false)
    expect(isValidPhone('08123442171')).toBe(false)
  })

  it('verifies only the mock code', () => {
    expect(MOCK_OTP).toHaveLength(OTP_LENGTH)
    expect(verifyOtp('123456')).toBe(true)
    expect(verifyOtp('654321')).toBe(false)
    expect(verifyOtp('12345')).toBe(false)
  })
})
