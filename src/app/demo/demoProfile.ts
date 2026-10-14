import { extractProfile } from '@/ai/onboarding/extractProfile.ts'
import { scanToUpdates } from '@/ai/onboarding/documents/scanToUpdates.ts'
import { applyUpdates, createEmptyProfile } from '@/ai/onboarding/profile.ts'
import { th } from '@/copy/th.ts'
import script from '@/data/onboarding-script.json'
import { getAccount, getLandmarks } from '@/services/merchantApi.ts'
import { sampleScan } from '@/services/ocr/mockOcr.ts'
import type { OnboardingProfile, ProfileFieldKey } from '@/types/domain.ts'

export const scriptLines = script.lines

/** The profile A2 starts with after the demo script and both sample documents: every field heard, nothing confirmed. */
export function demoProfile(): OnboardingProfile {
  const landmarks = getLandmarks()
  let profile = createEmptyProfile()
  for (const line of script.lines) {
    const expecting = (line.expecting ?? undefined) as ProfileFieldKey | undefined
    profile = applyUpdates(profile, extractProfile(line.say, { expecting, landmarks }))
  }
  profile = applyUpdates(profile, { phone: { value: getAccount().phone, confidence: 1, heardFrom: th.review.fromAccount } })
  return applyUpdates(profile, { ...scanToUpdates(sampleScan('idCard')), ...scanToUpdates(sampleScan('bankBook')) })
}
