import { describe, expect, it } from 'vitest'
import { applyUpdates, createEmptyProfile } from '@/ai/onboarding/profile.ts'
import { scanToUpdates } from '@/ai/onboarding/documents/scanToUpdates.ts'
import { sampleScan } from '@/services/ocr/mockOcr.ts'
import { initialJourney, journeyReducer } from './journeyMachine.ts'

const NAME = { storeName: { value: 'ครัวป้าแดง', confidence: 0.93, heardFrom: 'x' } }

describe('journeyReducer', () => {
  it('starts on the welcome screen with an empty profile', () => {
    const state = initialJourney()
    expect(state.screen).toBe('R1_WELCOME')
    expect(state.profile.fields.storeName.status).toBe('empty')
    expect(state.startedAt).toBeNull()
  })

  it('sends a new merchant from the account page to the store basics', () => {
    const chosen = journeyReducer(initialJourney(), { type: 'CHOOSE_AUTH', mode: 'register' })
    expect(chosen.screen).toBe('R2_ACCOUNT')
    const signedUp = journeyReducer(chosen, { type: 'AUTHENTICATED', email: 'padaeng@example.com' })
    expect(signedUp.screen).toBe('R3_STORE')
    expect(signedUp.email).toBe('padaeng@example.com')
  })

  it('sends a returning merchant from the account page straight to A1', () => {
    const chosen = journeyReducer(initialJourney(), { type: 'CHOOSE_AUTH', mode: 'login' })
    expect(journeyReducer(chosen, { type: 'AUTHENTICATED', email: 'padaeng@example.com' }).screen).toBe('A1_TALK')
  })

  it('carries the store basics into A1', () => {
    const next = journeyReducer(initialJourney(), { type: 'STORE_BASICS', updates: NAME, building: 'ตึกชินวัตร', at: 2000 })
    expect(next.screen).toBe('A1_TALK')
    expect(next.profile.fields.storeName.value).toBe('ครัวป้าแดง')
    expect(next.building).toBe('ตึกชินวัตร')
    expect(next.startedAt).toBe(2000)
  })

  it('moves between screens', () => {
    expect(journeyReducer(initialJourney(), { type: 'GO', screen: 'A2_REVIEW' }).screen).toBe('A2_REVIEW')
  })

  it('applies what was heard and remembers when talking started', () => {
    const first = journeyReducer(initialJourney(), { type: 'HEARD', updates: NAME, at: 1000 })
    const second = journeyReducer(first, { type: 'HEARD', updates: {}, at: 5000 })
    expect(second.profile.fields.storeName.value).toBe('ครัวป้าแดง')
    expect(second.startedAt).toBe(1000)
  })

  it('confirms a field', () => {
    const heard = journeyReducer(initialJourney(), { type: 'HEARD', updates: NAME, at: 1 })
    expect(journeyReducer(heard, { type: 'CONFIRM_FIELD', field: 'storeName' }).profile.fields.storeName.status).toBe('confirmed')
  })

  it('re-asking a field clears it and returns to A1', () => {
    const onReview = { ...journeyReducer(initialJourney(), { type: 'HEARD', updates: NAME, at: 1 }), screen: 'A2_REVIEW' as const }
    const next = journeyReducer(onReview, { type: 'REASK_FIELD', field: 'storeName' })
    expect(next.screen).toBe('A1_TALK')
    expect(next.profile.fields.storeName.status).toBe('empty')
  })

  it('removes a menu item', () => {
    const withMenu = journeyReducer(initialJourney(), {
      type: 'HEARD',
      updates: { menu: { value: [{ name: 'ก', priceTHB: 10 }, { name: 'ข', priceTHB: 20 }], confidence: 0.9, heardFrom: 'x' } },
      at: 1,
    })
    expect(journeyReducer(withMenu, { type: 'REMOVE_MENU_ITEM', name: 'ก' }).profile.fields.menu.value).toEqual([{ name: 'ข', priceTHB: 20 }])
  })

  it('records the submit time and shows A3', () => {
    const reviewing = journeyReducer(journeyReducer(initialJourney(), { type: 'HEARD', updates: NAME, at: 1000 }), { type: 'GO', screen: 'A2_REVIEW' })
    const next = journeyReducer(reviewing, { type: 'SUBMITTED', at: 9000, profile: reviewing.profile })
    expect(next.screen).toBe('A3_SUBMITTED')
    expect(next.submittedAt).toBe(9000)
  })

  it('ignores a stale submit after the profile changed', () => {
    const reviewing = journeyReducer(journeyReducer(initialJourney(), { type: 'HEARD', updates: NAME, at: 1000 }), { type: 'GO', screen: 'A2_REVIEW' })
    const submitted = reviewing.profile
    const edited = journeyReducer(reviewing, { type: 'CONFIRM_FIELD', field: 'storeName' })
    expect(journeyReducer(edited, { type: 'SUBMITTED', at: 9000, profile: submitted })).toBe(edited)
  })

  it('ignores a submit when no longer on A2', () => {
    const talking = journeyReducer(initialJourney(), { type: 'GO', screen: 'A1_TALK' })
    expect(journeyReducer(talking, { type: 'SUBMITTED', at: 9000, profile: talking.profile })).toBe(talking)
  })

  it('loads a prepared profile (presenter shortcut)', () => {
    const profile = applyUpdates(createEmptyProfile(), NAME)
    expect(journeyReducer(initialJourney(), { type: 'LOAD_PROFILE', profile }).profile).toBe(profile)
  })

  it('resets everything', () => {
    const busy = journeyReducer(journeyReducer(initialJourney(), { type: 'HEARD', updates: NAME, at: 1 }), { type: 'GO', screen: 'TRANSITION' })
    expect(journeyReducer(busy, { type: 'RESET' })).toEqual({ ...initialJourney(), runId: busy.runId + 1 })
  })

  it('starts a new run on reset', () => {
    expect(journeyReducer(initialJourney(), { type: 'RESET' }).runId).toBe(1)
  })
})

const ID = scanToUpdates(sampleScan('idCard'))
const BANK = scanToUpdates(sampleScan('bankBook'))

const signUp = (method?: 'voice' | 'photo' | 'type') =>
  journeyReducer(journeyReducer(initialJourney(), { type: 'CHOOSE_AUTH', mode: 'register' }), {
    type: 'AUTHENTICATED',
    email: 'padaeng@example.com',
    method,
  })

describe('fill-in method', () => {
  it('starts as voice', () => {
    expect(initialJourney().method).toBe('voice')
    expect(initialJourney().scan).toBeNull()
  })

  it('sends voice and typing to the store basics', () => {
    expect(signUp('voice').screen).toBe('R3_STORE')
    expect(signUp('type')).toMatchObject({ screen: 'R3_STORE', method: 'type' })
    expect(signUp().method).toBe('voice')
  })

  it('sends photo to the scanner: ID card, bank book, then menu, then A1', () => {
    expect(signUp('photo')).toMatchObject({
      screen: 'S1_SCAN',
      method: 'photo',
      scan: { docs: ['idCard', 'bankBook', 'menu'], queue: ['idCard', 'bankBook', 'menu'], returnTo: 'A1_TALK' },
    })
  })

  it('ignores the method for a returning merchant', () => {
    const chosen = journeyReducer(initialJourney(), { type: 'CHOOSE_AUTH', mode: 'login' })
    expect(journeyReducer(chosen, { type: 'AUTHENTICATED', email: 'a@b.co', method: 'photo' })).toMatchObject({ screen: 'A1_TALK', scan: null })
  })
})

describe('scanning', () => {
  it('applies a scan, drops it from the queue and starts the clock', () => {
    const next = journeyReducer(signUp('photo'), { type: 'SCANNED', doc: 'idCard', updates: ID, at: 3000 })
    expect(next.scan?.queue).toEqual(['bankBook', 'menu'])
    expect(next.profile.fields.owner.status).toBe('heard')
    expect(next.startedAt).toBe(3000)
    expect(next.screen).toBe('S1_SCAN')
  })

  it('goes on to where it was heading once the queue is empty', () => {
    const plan = journeyReducer(initialJourney(), { type: 'START_SCAN', docs: ['menu'], returnTo: 'A1_TALK' })
    const done = journeyReducer(plan, { type: 'SCANNED', doc: 'menu', updates: {}, at: 1 })
    expect(done).toMatchObject({ screen: 'A1_TALK', scan: null })
  })

  it('skips a document without filling anything', () => {
    const skipped = journeyReducer(signUp('photo'), { type: 'SKIP_DOC', doc: 'idCard' })
    expect(skipped.scan?.queue).toEqual(['bankBook', 'menu'])
    expect(skipped.profile.fields.owner.status).toBe('empty')
  })

  it('ignores a late result for a document that is no longer next', () => {
    const photo = signUp('photo')
    expect(journeyReducer(photo, { type: 'SCANNED', doc: 'bankBook', updates: BANK, at: 1 })).toBe(photo)
    expect(journeyReducer(photo, { type: 'SKIP_DOC', doc: 'menu' })).toBe(photo)
    const elsewhere = journeyReducer(photo, { type: 'GO', screen: 'A2_REVIEW' })
    expect(journeyReducer(elsewhere, { type: 'SCANNED', doc: 'idCard', updates: ID, at: 1 })).toBe(elsewhere)
  })

  it('goes straight on when there is nothing to scan', () => {
    expect(journeyReducer(initialJourney(), { type: 'START_SCAN', docs: [], returnTo: 'A2_REVIEW' })).toMatchObject({ screen: 'A2_REVIEW', scan: null })
  })
})

describe('after talking', () => {
  const onA1 = () => journeyReducer(initialJourney(), { type: 'GO', screen: 'A1_TALK' })

  it('ignores TALK_DONE when not on A1', () => {
    const reviewing = journeyReducer(initialJourney(), { type: 'GO', screen: 'A2_REVIEW' })
    expect(journeyReducer(reviewing, { type: 'TALK_DONE' })).toBe(reviewing)
  })

  it('asks for the documents that are still missing', () => {
    const talked = journeyReducer(onA1(), { type: 'TALK_DONE' })
    expect(talked).toMatchObject({ screen: 'S1_SCAN', scan: { queue: ['idCard', 'bankBook'], returnTo: 'A2_REVIEW' } })
  })

  it('goes to review when the documents are already in', () => {
    const scanned = journeyReducer(onA1(), { type: 'HEARD', updates: { ...ID, ...BANK }, at: 1 })
    expect(journeyReducer(scanned, { type: 'TALK_DONE' }).screen).toBe('A2_REVIEW')
  })

  it('photographs a document again when it is edited in A2, then comes back', () => {
    const reviewing = { ...journeyReducer(initialJourney(), { type: 'HEARD', updates: ID, at: 1 }), screen: 'A2_REVIEW' as const }
    const rescan = journeyReducer(reviewing, { type: 'REASK_FIELD', field: 'owner' })
    expect(rescan).toMatchObject({ screen: 'S1_SCAN', scan: { queue: ['idCard'], returnTo: 'A2_REVIEW' } })
    expect(rescan.profile.fields.owner.status).toBe('empty')
  })
})
