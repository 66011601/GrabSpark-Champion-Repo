import { th } from '@/copy/th.ts'
import type { Account, FollowUpChip, FollowUpQuestion, OnboardingProfile, ProfileFieldKey } from '@/types/domain.ts'
import { CATEGORY_LABELS } from './parsers/category.ts'

/** Document fields (owner, payout) are photographed, never asked about. */
const QUESTIONS: Partial<Record<ProfileFieldKey, (account: Account) => FollowUpQuestion>> = {
  storeName: () => ({ field: 'storeName', text: th.followUp.storeName, chips: [] }),
  building: () => ({ field: 'building', text: th.followUp.building, chips: [] }),
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
 * What the companion should ask next about `fields`, or null when they are all filled.
 * When none of them is filled yet, it opens with the free-talk prompt.
 */
export function pickFollowUp(profile: OnboardingProfile, fields: ProfileFieldKey[], account: Account): FollowUpQuestion | null {
  const { fields: values } = profile
  if (fields.every((key) => values[key].status === 'empty')) {
    return { field: null, text: th.followUp.open, chips: [] }
  }
  const next = fields.find((key) => values[key].status === 'empty')
  return next ? (QUESTIONS[next]?.(account) ?? null) : null
}
