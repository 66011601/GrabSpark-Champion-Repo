import type { OnboardingProfile, ProfileFieldKey } from '@/types/domain.ts'
import { namesMatch } from './documents/nameMatch.ts'
import { isValidThaiId } from './documents/thaiId.ts'
import { confirmField, needsCheck } from './profile.ts'

/** The form steps of GrabMerchant's sign-up ("ขั้นตอนที่ N จาก 7"); 1, 2 and 7 have no profile fields. */
export type FormStep = 3 | 4 | 5 | 6

export const FORM_STEPS: FormStep[] = [3, 4, 5, 6]

export const STEP_FIELDS: Record<FormStep, ProfileFieldKey[]> = {
  3: ['storeName', 'building', 'location', 'address', 'category'],
  4: ['businessType', 'phone', 'contactEmail'],
  5: ['owner'],
  6: ['payout'],
}

export type StepProblem = 'missing' | 'unchecked' | 'pinNotConfirmed' | 'idInvalid' | 'nameMismatch' | 'noBookPhoto'

export interface StepIssue {
  field: ProfileFieldKey
  problem: StepProblem
}

export interface StepStatus {
  valid: boolean
  issues: StepIssue[]
}

/** A field counts as filled only when every part the form asks for is there. */
function isFilled(profile: OnboardingProfile, key: ProfileFieldKey): boolean {
  const { fields } = profile
  if (fields[key].status === 'empty' || fields[key].value === null) return false
  if (key === 'owner') {
    const owner = fields.owner.value!
    return [owner.title, owner.name, owner.birthDate, owner.idExpiry].every((part) => part.trim() !== '') && owner.idNumber.length === 13
  }
  if (key === 'payout') {
    const payout = fields.payout.value!
    return [payout.bankName, payout.accountNumber, payout.accountName].every((part) => part.trim() !== '')
  }
  const value = fields[key].value
  return typeof value === 'string' ? value.trim() !== '' : true
}

/** Whether ต่อไป may be pressed on a step, and what still stops it. Pure. */
export function stepStatus(profile: OnboardingProfile, step: FormStep): StepStatus {
  const { fields } = profile
  const issues: StepIssue[] = []
  for (const key of STEP_FIELDS[step]) {
    if (!isFilled(profile, key)) issues.push({ field: key, problem: 'missing' })
    else if (needsCheck(fields[key])) issues.push({ field: key, problem: 'unchecked' })
  }
  if (step === 3 && isFilled(profile, 'location') && fields.location.needsPinCheck) {
    issues.push({ field: 'location', problem: 'pinNotConfirmed' })
  }
  if (step === 5 && isFilled(profile, 'owner') && !isValidThaiId(fields.owner.value!.idNumber)) {
    issues.push({ field: 'owner', problem: 'idInvalid' })
  }
  if (step === 6 && isFilled(profile, 'payout')) {
    const payout = fields.payout.value!
    const owner = fields.owner.value
    if (!payout.bookPhoto) issues.push({ field: 'payout', problem: 'noBookPhoto' })
    if (owner && !namesMatch(`${owner.title} ${owner.name}`, payout.accountName)) issues.push({ field: 'payout', problem: 'nameMismatch' })
  }
  return { valid: issues.length === 0, issues }
}

/** ต่อไป on a valid step: the merchant has seen every value on it. */
export function confirmStep(profile: OnboardingProfile, step: FormStep): OnboardingProfile {
  return STEP_FIELDS[step].reduce((next, key) => confirmField(next, key), profile)
}
