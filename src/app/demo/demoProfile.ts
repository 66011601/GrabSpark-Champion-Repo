import { addressFromLocation } from '@/ai/onboarding/addressFields.ts'
import { scanToUpdates } from '@/ai/onboarding/documents/scanToUpdates.ts'
import { extractProfile } from '@/ai/onboarding/extractProfile.ts'
import { applyUpdates, confirmField, createEmptyProfile, onlyEmptyFields, SUBMIT_FIELDS } from '@/ai/onboarding/profile.ts'
import { th } from '@/copy/th.ts'
import script from '@/data/onboarding-script.json'
import { getAccount, getLandmarks } from '@/services/merchantApi.ts'
import { sampleScan } from '@/services/ocr/mockOcr.ts'
import type { OnboardingProfile, ProfileFieldKey } from '@/types/domain.ts'

export const scriptLines = script.lines

/** The presenter's sample merchant: the demo script, the account and both sample documents. Every field heard, none confirmed. */
export function demoProfile(): OnboardingProfile {
  const landmarks = getLandmarks()
  const account = getAccount()
  let profile = createEmptyProfile()
  for (const line of script.lines) {
    const expecting = (line.expecting ?? undefined) as ProfileFieldKey | undefined
    profile = applyUpdates(profile, extractProfile(line.say, { expecting, landmarks }))
  }
  const location = profile.fields.location.value
  if (location) profile = applyUpdates(profile, onlyEmptyFields(profile, addressFromLocation(location, th.sources.map)))
  profile = applyUpdates(profile, {
    businessType: { value: 'personal', confidence: 1, heardFrom: th.sources.suggested },
    phone: { value: account.phone, confidence: 1, heardFrom: th.sources.account },
    contactEmail: { value: account.email, confidence: 1, heardFrom: th.sources.account },
  })
  return applyUpdates(profile, { ...scanToUpdates(sampleScan('idCard')), ...scanToUpdates(sampleScan('bankBook')) })
}

/** The sample merchant as 7/7 leaves them: everything the application is sent with is confirmed, the menu and hours are still drafts. */
export function submittedDemoProfile(): OnboardingProfile {
  return SUBMIT_FIELDS.reduce((profile, key) => confirmField(profile, key), demoProfile())
}
