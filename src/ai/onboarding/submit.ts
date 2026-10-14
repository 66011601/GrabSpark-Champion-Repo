import { th } from '@/copy/th.ts'
import { checkEmail } from '@/lib/account.ts'
import { saveStoreSetup, submitApplication, type ApplicationReceipt, type SetupReceipt } from '@/services/merchantApi.write.ts'
import type { Consents, GuardrailCheck, OnboardingProfile, SetupPart } from '@/types/domain.ts'
import { namesMatch } from './documents/nameMatch.ts'
import { isValidThaiId } from './documents/thaiId.ts'
import { needsCheck, SUBMIT_FIELDS } from './profile.ts'

/** What 7/7 knows besides the profile. `today` is ISO yyyy-mm-dd. */
export interface SubmitContext {
  phoneVerified: boolean
  consents: Consents
  today: string
}

const result = (id: string, pass: boolean, ok: string, fail: string): GuardrailCheck => ({ id, pass, message: pass ? ok : fail })

/** Deterministic checks run before the application leaves the phone (grab-style spec §7). */
export function runSubmissionChecks(profile: OnboardingProfile, ctx: SubmitContext): GuardrailCheck[] {
  const { fields } = profile
  const c = th.checks
  const unconfirmed = SUBMIT_FIELDS.filter((key) => fields[key].status !== 'confirmed').length
  const owner = fields.owner.value
  const payout = fields.payout.value
  return [
    result('ALL_CONFIRMED', unconfirmed === 0, c.allConfirmed, c.unconfirmed(unconfirmed)),
    result('PIN_CONFIRMED', fields.location.status === 'confirmed' && !fields.location.needsPinCheck, c.pinOk, c.pinMissing),
    result('PHONE_VALID', /^0\d{9}$/.test(fields.phone.value ?? ''), c.phoneOk, c.phoneInvalid),
    result('PHONE_VERIFIED', ctx.phoneVerified, c.phoneVerifiedOk, c.phoneNotVerified),
    result('EMAIL_VALID', checkEmail(fields.contactEmail.value ?? '') === null, c.emailOk, c.emailInvalid),
    result('ID_VALID', owner !== null && isValidThaiId(owner.idNumber), c.idOk, c.idInvalid),
    result('ID_NOT_EXPIRED', owner !== null && owner.idExpiry > ctx.today, c.idNotExpired, c.idExpired),
    result('PAYOUT_NAME_MATCH', owner !== null && payout !== null && namesMatch(`${owner.title} ${owner.name}`, payout.accountName), c.payoutNameOk, c.payoutNameMismatch),
    result('BOOK_PHOTO_ATTACHED', Boolean(payout?.bookPhoto), c.bookPhotoOk, c.bookPhotoMissing),
    result('CONSENTS_GIVEN', ctx.consents.terms && ctx.consents.accurate, c.consentsOk, c.consentsMissing),
  ]
}

/** Checks for Home's set-up tasks: the menu (H2) or the opening hours (H3). */
export function runSetupChecks(part: SetupPart, profile: OnboardingProfile): GuardrailCheck[] {
  const c = th.checks
  if (part === 'hours') {
    const hours = profile.fields.hours.value
    return [result('HOURS_VALID', hours !== null && hours.open !== hours.close, c.hoursOk, c.hoursInvalid)]
  }
  const field = profile.fields.menu
  const menu = field.value ?? []
  if (menu.length === 0 || menu.some((item) => item.priceTHB <= 0)) return [result('MENU_VALID', false, c.menuOk, c.menuMissing)]
  return [result('MENU_VALID', !needsCheck(field), c.menuOk, c.menuUnchecked)]
}

export class SubmissionBlockedError extends Error {
  readonly failed: GuardrailCheck[]

  constructor(failed: GuardrailCheck[]) {
    super(`Submission blocked: ${failed.map((check) => check.id).join(', ')}`)
    this.name = 'SubmissionBlockedError'
    this.failed = failed
  }
}

function blockIfFailed(checks: GuardrailCheck[]): void {
  const failed = checks.filter((check) => !check.pass)
  if (failed.length > 0) throw new SubmissionBlockedError(failed)
}

/** 7/7's ส่งใบสมัคร: the only path from the sign-up to the (mock) Grab API. Every check runs first. */
export async function submitProfile(profile: OnboardingProfile, ctx: SubmitContext): Promise<ApplicationReceipt> {
  blockIfFailed(runSubmissionChecks(profile, ctx))
  return submitApplication(profile)
}

/** H2/H3's บันทึก: the only path for the shop's menu and hours. */
export async function saveSetup(part: SetupPart, profile: OnboardingProfile): Promise<SetupReceipt> {
  blockIfFailed(runSetupChecks(part, profile))
  return saveStoreSetup(part, profile)
}
