import { REVIEW_FIELDS } from '@/ai/onboarding/profile.ts'
import { th } from '@/copy/th.ts'
import { formatHours, formatPhone, lastFour } from '@/lib/format.ts'
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
    case 'owner':
      return fields.owner.value?.name ?? ''
    case 'payout':
      return fields.payout.value ? th.review.payoutSummary(fields.payout.value.bankName, lastFour(fields.payout.value.accountNumber)) : ''
  }
}

/** One paragraph for read-aloud. Fields not filled yet are left out; numbers are only ever their last four digits. */
export function profileSummary(profile: OnboardingProfile): string {
  return REVIEW_FIELDS.map((key) => [key, summarizeField(profile, key)] as const)
    .filter(([, summary]) => summary !== '')
    .map(([key, summary]) => `${th.fields[key]} ${summary}`)
    .join(' ')
}
