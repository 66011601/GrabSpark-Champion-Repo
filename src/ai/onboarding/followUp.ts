import { th } from '@/copy/th.ts'
import type { Account, FollowUpChip, FollowUpQuestion, OnboardingProfile, ProfileFieldKey } from '@/types/domain.ts'
import { CATEGORY_LABELS } from './parsers/category.ts'
import { PROFILE_FIELDS } from './profile.ts'

const QUESTIONS: Record<ProfileFieldKey, (account: Account) => FollowUpQuestion> = {
  storeName: () => ({ field: 'storeName', text: th.followUp.storeName, chips: [] }),
  category: () => ({
    field: 'category',
    text: th.followUp.category,
    chips: CATEGORY_LABELS.slice(0, 4).map((label): FollowUpChip => ({ label, kind: 'say' })),
  }),
  location: () => ({
    field: 'location',
    text: th.followUp.location,
    chips: [{ label: th.chips.useDeviceLocation, kind: 'useDeviceLocation' }],
  }),
  hours: () => ({
    field: 'hours',
    text: th.followUp.hours,
    chips: [
      { label: th.chips.hoursFullDay, kind: 'say' },
      { label: th.chips.hoursMorning, kind: 'say' },
    ],
  }),
  menu: () => ({
    field: 'menu',
    text: th.followUp.menu,
    chips: [{ label: th.chips.scanMenu, kind: 'scanMenu' }],
  }),
  phone: (account) => ({
    field: 'phone',
    text: th.followUp.phone(account.maskedPhone),
    chips: [
      { label: th.chips.yes, kind: 'useAccountPhone' },
      { label: th.chips.otherPhone, kind: 'startMic' },
    ],
  }),
}

/**
 * What the companion should ask next, or null when every field has been heard.
 * Only empty fields are asked about; low-confidence values are flagged in A2 instead of re-asked.
 */
export function pickFollowUp(profile: OnboardingProfile, account: Account): FollowUpQuestion | null {
  const { fields } = profile
  if (PROFILE_FIELDS.every((key) => fields[key].status === 'empty')) {
    return { field: null, text: th.followUp.open, chips: [] }
  }
  const next = PROFILE_FIELDS.find((key) => fields[key].status === 'empty')
  return next ? QUESTIONS[next](account) : null
}
