import { describe, expect, it } from 'vitest'
import { applyUpdates, createEmptyProfile } from '@/ai/onboarding/profile.ts'
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
    const next = journeyReducer(initialJourney(), { type: 'SUBMITTED', at: 9000 })
    expect(next.screen).toBe('A3_SUBMITTED')
    expect(next.submittedAt).toBe(9000)
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
