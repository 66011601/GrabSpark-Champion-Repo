import { applyUpdates, confirmField, createEmptyProfile, reaskField, removeMenuItem } from '@/ai/onboarding/profile.ts'
import { confirmStep, stepStatus, type FormStep } from '@/ai/onboarding/steps.ts'
import { th } from '@/copy/th.ts'
import type { Consents, OnboardingProfile, ProfileFieldKey, ProfileUpdates, SetupPart } from '@/types/domain.ts'

// Plan 2 adds G2_INTENT, G3_PREVIEW, G4_SUCCESS, G5_RECAP.
export type Screen =
  | 'G0_WELCOME'
  | 'L1_LOGIN'
  | 'S1_SERVICE'
  | 'S2_ACCOUNT'
  | 'S2_PHONE'
  | 'S3_BUSINESS'
  | 'S4_SHOP'
  | 'S5_OWNER'
  | 'S6_BANK'
  | 'S7_CONFIRM'
  | 'H1_HOME'
  | 'H2_MENU'
  | 'H3_HOURS'
  | 'TRANSITION'
  | 'G1_DASHBOARD'

export type Service = 'food' | 'mart'

/** GrabMerchant's sign-up, in order. */
export const SIGNUP_ORDER: Screen[] = ['S1_SERVICE', 'S2_ACCOUNT', 'S2_PHONE', 'S3_BUSINESS', 'S4_SHOP', 'S5_OWNER', 'S6_BANK', 'S7_CONFIRM']

/** "ขั้นตอนที่ N จาก 7". Phone + OTP is part of step 2. */
export const STEP_NUMBER: Partial<Record<Screen, number>> = {
  S1_SERVICE: 1,
  S2_ACCOUNT: 2,
  S2_PHONE: 2,
  S3_BUSINESS: 3,
  S4_SHOP: 4,
  S5_OWNER: 5,
  S6_BANK: 6,
  S7_CONFIRM: 7,
}

export const SCREEN_FOR_STEP: Record<FormStep, Screen> = { 3: 'S3_BUSINESS', 4: 'S4_SHOP', 5: 'S5_OWNER', 6: 'S6_BANK' }
const FORM_STEP: Partial<Record<Screen, FormStep>> = { S3_BUSINESS: 3, S4_SHOP: 4, S5_OWNER: 5, S6_BANK: 6 }
const BACK_TO: Partial<Record<Screen, Screen>> = { L1_LOGIN: 'G0_WELCOME', S1_SERVICE: 'G0_WELCOME', H2_MENU: 'H1_HOME', H3_HOURS: 'H1_HOME' }
const SETUP_SCREEN: Record<SetupPart, Screen> = { menu: 'H2_MENU', hours: 'H3_HOURS' }

export interface JourneyState {
  screen: Screen
  service: Service | null
  email: string | null // the password is never kept
  phoneVerified: boolean
  profile: OnboardingProfile
  consents: Consents
  startedAt: number | null // first thing given, for "สมัครเสร็จใน …" on Home
  submittedAt: number | null
  setupDone: Record<SetupPart, boolean>
  runId: number // bumps on RESET so screens start fresh
}

export type JourneyEvent =
  | { type: 'GO'; screen: Screen }
  | { type: 'CHOOSE_SERVICE'; service: Service }
  | { type: 'ACCOUNT_SET'; email: string; at: number }
  | { type: 'PHONE_VERIFIED'; phone: string; heardFrom: string }
  | { type: 'FILL'; updates: ProfileUpdates; at: number } // typed, said or photographed: always a draft
  | { type: 'CLEAR_FIELD'; field: ProfileFieldKey }
  | { type: 'CONFIRM_FIELD'; field: ProfileFieldKey } // the merchant's ✓ on an amber value or the map pin
  | { type: 'REMOVE_MENU_ITEM'; name: string }
  | { type: 'NEXT' } // ต่อไป: confirms the step's values
  | { type: 'BACK' }
  | { type: 'SET_CONSENT'; consent: keyof Consents; value: boolean }
  | { type: 'SUBMITTED'; at: number; profile: OnboardingProfile } // the profile that was sent
  | { type: 'SETUP_SAVED'; part: SetupPart; profile: OnboardingProfile }
  | { type: 'LOGGED_IN'; email: string; profile: OnboardingProfile; at: number }
  | { type: 'LOAD_PROFILE'; profile: OnboardingProfile }
  | { type: 'RESET' }

export function initialJourney(): JourneyState {
  return {
    screen: 'G0_WELCOME',
    service: null,
    email: null,
    phoneVerified: false,
    profile: createEmptyProfile(),
    consents: { terms: false, accurate: false },
    startedAt: null,
    submittedAt: null,
    setupDone: { menu: false, hours: false },
    runId: 0,
  }
}

const nextInSignup = (screen: Screen): Screen => SIGNUP_ORDER[SIGNUP_ORDER.indexOf(screen) + 1] ?? screen

export function journeyReducer(state: JourneyState, event: JourneyEvent): JourneyState {
  switch (event.type) {
    case 'GO':
      return { ...state, screen: event.screen }
    case 'CHOOSE_SERVICE':
      if (state.screen !== 'S1_SERVICE') return state
      return { ...state, service: event.service }
    case 'ACCOUNT_SET': {
      if (state.screen !== 'S2_ACCOUNT') return state
      // The sign-up email is also the owner's contact email on 4/7 unless the merchant already gave one.
      const contact = state.profile.fields.contactEmail.status === 'empty'
        ? applyUpdates(state.profile, { contactEmail: { value: event.email, confidence: 1, heardFrom: th.sources.account } })
        : state.profile
      return { ...state, email: event.email, profile: contact, startedAt: state.startedAt ?? event.at, screen: 'S2_PHONE' }
    }
    case 'PHONE_VERIFIED': {
      if (state.screen !== 'S2_PHONE') return state
      const withPhone = applyUpdates(state.profile, { phone: { value: event.phone, confidence: 1, heardFrom: event.heardFrom } })
      return { ...state, profile: confirmField(withPhone, 'phone'), phoneVerified: true, screen: 'S3_BUSINESS' }
    }
    case 'FILL':
      return { ...state, profile: applyUpdates(state.profile, event.updates), startedAt: state.startedAt ?? event.at }
    case 'CLEAR_FIELD':
      return { ...state, profile: reaskField(state.profile, event.field) }
    case 'CONFIRM_FIELD':
      return { ...state, profile: confirmField(state.profile, event.field) }
    case 'REMOVE_MENU_ITEM':
      return { ...state, profile: removeMenuItem(state.profile, event.name) }
    case 'NEXT': {
      if (state.screen === 'S1_SERVICE') return state.service ? { ...state, screen: 'S2_ACCOUNT' } : state
      if (state.screen === 'S2_PHONE') return state.phoneVerified ? { ...state, screen: 'S3_BUSINESS' } : state
      const step = FORM_STEP[state.screen]
      if (!step || !stepStatus(state.profile, step).valid) return state
      return { ...state, profile: confirmStep(state.profile, step), screen: nextInSignup(state.screen) }
    }
    case 'BACK': {
      const index = SIGNUP_ORDER.indexOf(state.screen)
      if (index > 0) return { ...state, screen: SIGNUP_ORDER[index - 1] }
      const back = BACK_TO[state.screen]
      return back ? { ...state, screen: back } : state
    }
    case 'SET_CONSENT':
      return { ...state, consents: { ...state.consents, [event.consent]: event.value } }
    case 'SUBMITTED':
      // The send takes a moment; if the merchant edited or left meanwhile, it no longer applies.
      if (state.screen !== 'S7_CONFIRM' || state.profile !== event.profile) return state
      return { ...state, submittedAt: event.at, screen: 'H1_HOME' }
    case 'SETUP_SAVED':
      if (state.screen !== SETUP_SCREEN[event.part] || state.profile !== event.profile) return state
      return { ...state, setupDone: { ...state.setupDone, [event.part]: true }, screen: 'H1_HOME' }
    case 'LOGGED_IN':
      if (state.screen !== 'L1_LOGIN') return state
      return { ...state, email: event.email, profile: event.profile, phoneVerified: true, startedAt: event.at, submittedAt: event.at, screen: 'H1_HOME' }
    case 'LOAD_PROFILE':
      return { ...state, profile: event.profile }
    case 'RESET':
      return { ...initialJourney(), runId: state.runId + 1 }
  }
}
