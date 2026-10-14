import { th } from '@/copy/th.ts'
import { submitApplication, type ApplicationReceipt } from '@/services/merchantApi.write.ts'
import type { GuardrailCheck, OnboardingProfile } from '@/types/domain.ts'
import { TALK_FIELDS } from './profile.ts'

/** Deterministic checks run before anything leaves the phone (spec §6.5). */
export function runSubmissionChecks(profile: OnboardingProfile): GuardrailCheck[] {
  const { fields } = profile
  const unconfirmed = TALK_FIELDS.filter((key) => fields[key].status !== 'confirmed').length
  const menu = fields.menu.value ?? []
  const hours = fields.hours.value
  const pinOk = fields.location.status === 'confirmed' && !fields.location.needsPinCheck
  const menuOk = menu.length > 0 && menu.every((item) => item.priceTHB > 0)
  const hoursOk = hours !== null && hours.open !== hours.close
  const phoneOk = /^0\d{9}$/.test(fields.phone.value ?? '')
  return [
    { id: 'ALL_CONFIRMED', pass: unconfirmed === 0, message: unconfirmed === 0 ? th.checks.allConfirmed : th.checks.unconfirmed(unconfirmed) },
    { id: 'PIN_CONFIRMED', pass: pinOk, message: pinOk ? th.checks.pinOk : th.checks.pinMissing },
    { id: 'MENU_VALID', pass: menuOk, message: menuOk ? th.checks.menuOk : th.checks.menuMissing },
    { id: 'HOURS_VALID', pass: hoursOk, message: hoursOk ? th.checks.hoursOk : th.checks.hoursInvalid },
    { id: 'PHONE_VALID', pass: phoneOk, message: phoneOk ? th.checks.phoneOk : th.checks.phoneInvalid },
  ]
}

export class SubmissionBlockedError extends Error {
  readonly failed: GuardrailCheck[]

  constructor(failed: GuardrailCheck[]) {
    super(`Submission blocked: ${failed.map((check) => check.id).join(', ')}`)
    this.name = 'SubmissionBlockedError'
    this.failed = failed
  }
}

/** The only path from an onboarding profile to the (mock) Grab API. Every check runs first. */
export async function submitProfile(profile: OnboardingProfile): Promise<ApplicationReceipt> {
  const failed = runSubmissionChecks(profile).filter((check) => !check.pass)
  if (failed.length > 0) throw new SubmissionBlockedError(failed)
  return submitApplication(profile)
}
