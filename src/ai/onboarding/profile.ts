import type {
  DocKind,
  FieldStatus,
  MenuEntry,
  OnboardingProfile,
  ProfileFieldKey,
  ProfileFields,
  ProfileUpdates,
} from '@/types/domain.ts'

/** What A1 asks about, in the order it asks; also the A1 checklist. */
export const TALK_FIELDS: ProfileFieldKey[] = ['storeName', 'category', 'location', 'hours', 'menu', 'phone']

/** What only a photo fills (S1); never asked by voice. */
export const DOC_FIELDS: ProfileFieldKey[] = ['owner', 'payout']

/** Everything A2 shows and the guardrail requires confirmed. */
export const REVIEW_FIELDS: ProfileFieldKey[] = [...TALK_FIELDS, ...DOC_FIELDS]

/** Which document fills a document field: editing that field in A2 means photographing it again. */
export const DOC_FOR_FIELD: Partial<Record<ProfileFieldKey, DocKind>> = { owner: 'idCard', payout: 'bankBook' }

/** Heard values below this confidence are shown amber in A2. */
export const CHECK_THRESHOLD = 0.8

export function createEmptyProfile(sessionId = 'onb_001'): OnboardingProfile {
  return {
    sessionId,
    fields: {
      storeName: { value: null, status: 'empty' },
      category: { value: null, status: 'empty' },
      location: { value: null, status: 'empty' },
      hours: { value: null, status: 'empty' },
      menu: { value: null, status: 'empty' },
      phone: { value: null, status: 'empty', suggestFromAccount: true },
      owner: { value: null, status: 'empty' },
      payout: { value: null, status: 'empty' },
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
  for (const key of REVIEW_FIELDS) {
    const update = updates[key]
    if (!update) continue
    const value = key === 'menu' ? mergeMenu(next.fields.menu.value, update.value as MenuEntry[]) : update.value
    const change = { value, status: 'heard', confidence: update.confidence, heardFrom: update.heardFrom }
    next = patch(next, key, change as Partial<ProfileFields[typeof key]>)
  }
  if (updates.location) next = patch(next, 'location', { needsPinCheck: true })
  return next
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

export function countHeard(profile: OnboardingProfile): number {
  return TALK_FIELDS.filter((key) => profile.fields[key].status !== 'empty').length
}

export function isReadyForReview(profile: OnboardingProfile): boolean {
  return countHeard(profile) === TALK_FIELDS.length
}

/** The documents still to photograph before review: the ID card while there is no owner, the bank book while there is no payout account. */
export function missingDocs(profile: OnboardingProfile): DocKind[] {
  const docs: DocKind[] = []
  if (profile.fields.owner.status === 'empty') docs.push('idCard')
  if (profile.fields.payout.status === 'empty') docs.push('bankBook')
  return docs
}
