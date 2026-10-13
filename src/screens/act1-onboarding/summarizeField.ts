import { PROFILE_FIELDS } from '@/ai/onboarding/profile.ts'
import { th } from '@/copy/th.ts'
import { formatHours, formatPhone } from '@/lib/format.ts'
import type { OnboardingProfile, ProfileFieldKey } from '@/types/domain.ts'

/** One short line per field, for the A1 checklist and the read-aloud summary. */
export function summarizeField(profile: OnboardingProfile, key: ProfileFieldKey): string {
  const { fields } = profile
  switch (key) {
    case 'storeName':
      return fields.storeName.value ?? ''
    case 'category':
      return fields.category.value ?? ''
    case 'location':
      return fields.location.value?.text ?? ''
    case 'hours':
      return fields.hours.value ? formatHours(fields.hours.value) : ''
    case 'menu':
      return th.review.menuCount(fields.menu.value?.length ?? 0)
    case 'phone':
      return fields.phone.value ? formatPhone(fields.phone.value) : ''
  }
}

export function profileSummary(profile: OnboardingProfile): string {
  return PROFILE_FIELDS.map((key) => `${th.fields[key]} ${summarizeField(profile, key)}`).join(' ')
}
