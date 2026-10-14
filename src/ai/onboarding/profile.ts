import type {
  FieldStatus,
  MenuEntry,
  OnboardingProfile,
  ProfileFieldKey,
  ProfileFields,
  ProfileUpdates,
} from '@/types/domain.ts'

/** GrabMerchant's sign-up form, in its own order (steps 2–6). 7/7 requires all of them confirmed. */
export const SUBMIT_FIELDS: ProfileFieldKey[] = ['storeName', 'building', 'location', 'address', 'category', 'businessType', 'phone', 'contactEmail', 'owner', 'payout']

/** Filled after submitting, from Home's "ตั้งค่าร้านให้เรียบร้อย". */
export const SETUP_FIELDS: ProfileFieldKey[] = ['menu', 'hours']

export const ALL_FIELDS: ProfileFieldKey[] = [...SUBMIT_FIELDS, ...SETUP_FIELDS]

/** Heard values below this confidence are shown amber in A2. */
export const CHECK_THRESHOLD = 0.8

export function createEmptyProfile(sessionId = 'onb_001'): OnboardingProfile {
  return {
    sessionId,
    fields: {
      storeName: { value: null, status: 'empty' },
      building: { value: null, status: 'empty' },
      location: { value: null, status: 'empty' },
      address: { value: null, status: 'empty' },
      category: { value: null, status: 'empty' },
      businessType: { value: null, status: 'empty' },
      phone: { value: null, status: 'empty', suggestFromAccount: true },
      contactEmail: { value: null, status: 'empty' },
      owner: { value: null, status: 'empty' },
      payout: { value: null, status: 'empty' },
      menu: { value: null, status: 'empty' },
      hours: { value: null, status: 'empty' },
    },
  }
}

function patch<K extends ProfileFieldKey>(profile: OnboardingProfile, key: K, change: Partial<ProfileFields[K]>): OnboardingProfile {
  const fields = { ...profile.fields, [key]: { ...profile.fields[key], ...change } } as ProfileFields
  return { ...profile, fields }
}

function mergeMenu(current: MenuEntry[] | null, incoming: MenuEntry[]): MenuEntry[] {
  const merged = [...(current ?? [])]
  for (const item of incoming) {
    const index = merged.findIndex((existing) => existing.name === item.name)
    if (index === -1) merged.push(item)
    else merged[index] = item
  }
  return merged
}

export function applyUpdates(profile: OnboardingProfile, updates: ProfileUpdates): OnboardingProfile {
  let next = profile
  for (const key of ALL_FIELDS) {
    const update = updates[key]
    if (!update) continue
    const value = key === 'menu' ? mergeMenu(next.fields.menu.value, update.value as MenuEntry[]) : update.value
    // A dish added to a menu still waiting for its check must not make an unchecked price look sure.
    const unchecked = key === 'menu' && next.fields.menu.status === 'heard'
    const confidence = unchecked ? Math.min(next.fields.menu.confidence ?? 1, update.confidence) : update.confidence
    const change = { value, status: 'heard', confidence, heardFrom: update.heardFrom }
    next = patch(next, key, change as Partial<ProfileFields[typeof key]>)
  }
  if (updates.location) next = patch(next, 'location', { needsPinCheck: true })
  return next
}

/** Keeps only the updates for fields that are still empty: a photo never replaces what the merchant already gave. */
export function onlyEmptyFields(profile: OnboardingProfile, updates: ProfileUpdates): ProfileUpdates {
  const kept: ProfileUpdates = {}
  for (const key of ALL_FIELDS) {
    if (updates[key] && profile.fields[key].status === 'empty') Object.assign(kept, { [key]: updates[key] })
  }
  return kept
}

export function confirmField(profile: OnboardingProfile, key: ProfileFieldKey): OnboardingProfile {
  if (profile.fields[key].status === 'empty') return profile
  const confirmed = patch(profile, key, { status: 'confirmed' })
  return key === 'location' ? patch(confirmed, 'location', { needsPinCheck: false }) : confirmed
}

export function reaskField(profile: OnboardingProfile, key: ProfileFieldKey): OnboardingProfile {
  return patch(profile, key, { value: null, status: 'empty', confidence: undefined, heardFrom: undefined })
}

export function removeMenuItem(profile: OnboardingProfile, name: string): OnboardingProfile {
  const menu = (profile.fields.menu.value ?? []).filter((item) => item.name !== name)
  return menu.length > 0 ? patch(profile, 'menu', { value: menu }) : reaskField(profile, 'menu')
}

export function needsCheck(field: { status: FieldStatus; confidence?: number }): boolean {
  return field.status === 'heard' && (field.confidence ?? 1) < CHECK_THRESHOLD
}
