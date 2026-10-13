export const MIN_PASSWORD_LENGTH = 8

export type EmailProblem = 'empty' | 'invalid'
export type PasswordProblem = 'empty' | 'short'

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function checkEmail(email: string): EmailProblem | null {
  const value = email.trim()
  if (!value) return 'empty'
  return EMAIL_SHAPE.test(value) ? null : 'invalid'
}

/** A new password must be long enough; an existing one only has to be there. */
export function checkPassword(password: string, isNew: boolean): PasswordProblem | null {
  if (!password) return 'empty'
  return isNew && password.length < MIN_PASSWORD_LENGTH ? 'short' : null
}
