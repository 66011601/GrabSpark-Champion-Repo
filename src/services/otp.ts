// Prototype: no SMS is sent. Every phone "receives" this code, and the companion reads it from the "SMS".
export const MOCK_OTP = '123456'
export const OTP_LENGTH = 6
export const SMS_ARRIVES_MS = 1500
export const RESEND_SECONDS = 30

export const isValidPhone = (phone: string) => /^0\d{9}$/.test(phone)

export const verifyOtp = (code: string) => code === MOCK_OTP
