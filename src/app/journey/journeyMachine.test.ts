import { describe, expect, it } from 'vitest'
import { applyUpdates, confirmField, createEmptyProfile } from '@/ai/onboarding/profile.ts'
import { demoProfile } from '@/app/demo/demoProfile.ts'
import { initialJourney, journeyReducer, SIGNUP_ORDER, STEP_NUMBER, type JourneyState, type Screen } from './journeyMachine.ts'

const at = (state: JourneyState, screen: Screen): JourneyState => ({ ...state, screen })
const run = (state: JourneyState, ...events: Parameters<typeof journeyReducer>[1][]) => events.reduce(journeyReducer, state)

describe('journey: start', () => {
  it('opens on the GrabMerchant welcome with nothing filled', () => {
    const state = initialJourney()
    expect(state).toMatchObject({ screen: 'G0_WELCOME', service: null, email: null, phoneVerified: false, submittedAt: null, runId: 0 })
    expect(state.consents).toEqual({ terms: false, accurate: false })
    expect(state.setupDone).toEqual({ menu: false, hours: false })
  })

  it('numbers the steps like GrabMerchant', () => {
    expect(SIGNUP_ORDER).toEqual(['S1_SERVICE', 'S2_ACCOUNT', 'S2_PHONE', 'S3_BUSINESS', 'S4_SHOP', 'S5_OWNER', 'S6_BANK', 'S7_CONFIRM'])
    expect(SIGNUP_ORDER.map((screen) => STEP_NUMBER[screen])).toEqual([1, 2, 2, 3, 4, 5, 6, 7])
  })
})

describe('journey: steps 1–2', () => {
  it('needs a service before 1/7 moves on', () => {
    const s1 = at(initialJourney(), 'S1_SERVICE')
    expect(journeyReducer(s1, { type: 'NEXT' })).toBe(s1)
    expect(run(s1, { type: 'CHOOSE_SERVICE', service: 'food' }, { type: 'NEXT' })).toMatchObject({ service: 'food', screen: 'S2_ACCOUNT' })
  })

  it('keeps the email, offers it as the owner’s contact email and starts the clock', () => {
    const next = journeyReducer(at(initialJourney(), 'S2_ACCOUNT'), { type: 'ACCOUNT_SET', email: 'padaeng@example.com', at: 1000 })
    expect(next).toMatchObject({ screen: 'S2_PHONE', email: 'padaeng@example.com', startedAt: 1000 })
    expect(next.profile.fields.contactEmail).toMatchObject({ value: 'padaeng@example.com', status: 'heard' })
  })

  it('verifies the phone and confirms it', () => {
    const next = journeyReducer(at(initialJourney(), 'S2_PHONE'), { type: 'PHONE_VERIFIED', phone: '0812344217', heardFrom: 'x' })
    expect(next).toMatchObject({ screen: 'S3_BUSINESS', phoneVerified: true })
    expect(next.profile.fields.phone).toMatchObject({ value: '0812344217', status: 'confirmed' })
  })

  it('ignores step events from the wrong screen', () => {
    const elsewhere = at(initialJourney(), 'S5_OWNER')
    expect(journeyReducer(elsewhere, { type: 'ACCOUNT_SET', email: 'a@b.co', at: 1 })).toBe(elsewhere)
    expect(journeyReducer(elsewhere, { type: 'PHONE_VERIFIED', phone: '0812344217', heardFrom: 'x' })).toBe(elsewhere)
    expect(journeyReducer(elsewhere, { type: 'CHOOSE_SERVICE', service: 'mart' })).toBe(elsewhere)
  })

  it('lets a verified phone page move on when the merchant comes back to it', () => {
    const verified = { ...at(initialJourney(), 'S2_PHONE'), phoneVerified: true }
    expect(journeyReducer(verified, { type: 'NEXT' }).screen).toBe('S3_BUSINESS')
    expect(journeyReducer(at(initialJourney(), 'S2_PHONE'), { type: 'NEXT' }).screen).toBe('S2_PHONE')
  })
})

describe('journey: form steps', () => {
  const filled = { ...at(initialJourney(), 'S3_BUSINESS'), profile: demoProfile() }

  it('fills, clears and confirms fields', () => {
    const typed = journeyReducer(filled, { type: 'FILL', updates: { storeName: { value: 'ร้านของฉัน', confidence: 1, heardFrom: 'พิมพ์เอง' } }, at: 5 })
    expect(typed.profile.fields.storeName).toMatchObject({ value: 'ร้านของฉัน', status: 'heard' })
    expect(typed.startedAt).toBe(5)
    expect(journeyReducer(typed, { type: 'CLEAR_FIELD', field: 'storeName' }).profile.fields.storeName.status).toBe('empty')
    expect(journeyReducer(typed, { type: 'CONFIRM_FIELD', field: 'storeName' }).profile.fields.storeName.status).toBe('confirmed')
  })

  it('stays on a step that is not complete', () => {
    expect(journeyReducer(filled, { type: 'NEXT' })).toBe(filled) // the pin is not confirmed yet
  })

  it('confirms the step and moves on when it is complete', () => {
    const ready = { ...filled, profile: (['location', 'building', 'address', 'category'] as const).reduce((p, key) => confirmField(p, key), filled.profile) }
    const next = journeyReducer(ready, { type: 'NEXT' })
    expect(next.screen).toBe('S4_SHOP')
    expect(next.profile.fields.storeName.status).toBe('confirmed')
  })

  it('goes back one step, then to the welcome from 1/7, and Home from H2/H3', () => {
    expect(journeyReducer(filled, { type: 'BACK' }).screen).toBe('S2_PHONE')
    expect(journeyReducer(at(initialJourney(), 'S1_SERVICE'), { type: 'BACK' }).screen).toBe('G0_WELCOME')
    expect(journeyReducer(at(initialJourney(), 'L1_LOGIN'), { type: 'BACK' }).screen).toBe('G0_WELCOME')
    expect(journeyReducer(at(initialJourney(), 'H3_HOURS'), { type: 'BACK' }).screen).toBe('H1_HOME')
  })

  it('removes a menu item', () => {
    const withMenu = journeyReducer(initialJourney(), {
      type: 'FILL',
      updates: { menu: { value: [{ name: 'ก', priceTHB: 10 }, { name: 'ข', priceTHB: 20 }], confidence: 1, heardFrom: 'x' } },
      at: 1,
    })
    expect(journeyReducer(withMenu, { type: 'REMOVE_MENU_ITEM', name: 'ก' }).profile.fields.menu.value).toEqual([{ name: 'ข', priceTHB: 20 }])
  })
})

describe('journey: submit and set-up', () => {
  const confirming = { ...at(initialJourney(), 'S7_CONFIRM'), startedAt: 1000 }

  it('ticks consents only by event', () => {
    const ticked = journeyReducer(confirming, { type: 'SET_CONSENT', consent: 'terms', value: true })
    expect(ticked.consents).toEqual({ terms: true, accurate: false })
  })

  it('goes Home after a submit of the profile on screen', () => {
    const next = journeyReducer(confirming, { type: 'SUBMITTED', at: 9000, profile: confirming.profile })
    expect(next).toMatchObject({ screen: 'H1_HOME', submittedAt: 9000 })
  })

  it('ignores a stale submit', () => {
    const edited = journeyReducer(confirming, { type: 'FILL', updates: { storeName: { value: 'x', confidence: 1, heardFrom: 'x' } }, at: 2 })
    expect(journeyReducer(edited, { type: 'SUBMITTED', at: 9, profile: confirming.profile })).toBe(edited)
    const left = at(confirming, 'S6_BANK')
    expect(journeyReducer(left, { type: 'SUBMITTED', at: 9, profile: left.profile })).toBe(left)
  })

  it('marks a set-up part done only from its own screen', () => {
    const menu = at(initialJourney(), 'H2_MENU')
    expect(journeyReducer(menu, { type: 'SETUP_SAVED', part: 'menu', profile: menu.profile })).toMatchObject({ screen: 'H1_HOME', setupDone: { menu: true, hours: false } })
    expect(journeyReducer(menu, { type: 'SETUP_SAVED', part: 'hours', profile: menu.profile })).toBe(menu)
  })

  it('logs a returning merchant straight in to Home', () => {
    const profile = applyUpdates(createEmptyProfile(), { storeName: { value: 'ครัวป้าแดง', confidence: 1, heardFrom: 'x' } })
    const next = journeyReducer(at(initialJourney(), 'L1_LOGIN'), { type: 'LOGGED_IN', email: 'padaeng@example.com', profile, at: 7 })
    expect(next).toMatchObject({ screen: 'H1_HOME', email: 'padaeng@example.com', phoneVerified: true, submittedAt: 7 })
    expect(next.profile).toBe(profile)
  })

  it('loads a presenter profile, optionally with a verified phone', () => {
    const profile = demoProfile()
    const plain = journeyReducer(initialJourney(), { type: 'LOAD_PROFILE', profile })
    expect(plain.profile).toBe(profile)
    expect(plain.phoneVerified).toBe(false)
    expect(journeyReducer(initialJourney(), { type: 'LOAD_PROFILE', profile, phoneVerified: true }).phoneVerified).toBe(true)
  })

  it('resets everything and starts a new run', () => {
    const busy = run(at(initialJourney(), 'S1_SERVICE'), { type: 'CHOOSE_SERVICE', service: 'food' }, { type: 'NEXT' })
    expect(journeyReducer(busy, { type: 'RESET' })).toEqual({ ...initialJourney(), runId: 1 })
  })
})
