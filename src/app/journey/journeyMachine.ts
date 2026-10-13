import { applyUpdates, confirmField, createEmptyProfile, reaskField, removeMenuItem } from '@/ai/onboarding/profile.ts'
import type { OnboardingProfile, ProfileFieldKey, ProfileUpdates } from '@/types/domain.ts'

// Plan 2 adds G2_INTENT, G3_PREVIEW, G4_SUCCESS, G5_RECAP.
export type Screen =
  | 'R1_WELCOME'
  | 'R2_ACCOUNT'
  | 'R3_STORE'
  | 'A1_TALK'
  | 'A2_REVIEW'
  | 'A3_SUBMITTED'
  | 'TRANSITION'
  | 'G1_DASHBOARD'

export type AuthMode = 'register' | 'login'

export interface JourneyState {
  screen: Screen
  authMode: AuthMode
  email: string | null // the password is never kept
  building: string | null // optional, typed or heard on R3
  profile: OnboardingProfile
  startedAt: number | null // first utterance, for the "คุยกันแค่…" time on A3
  submittedAt: number | null
  runId: number // bumps on RESET so screens start fresh
}

export type JourneyEvent =
  | { type: 'GO'; screen: Screen }
  | { type: 'CHOOSE_AUTH'; mode: AuthMode }
  | { type: 'AUTHENTICATED'; email: string }
  | { type: 'STORE_BASICS'; updates: ProfileUpdates; building: string | null; at: number }
  | { type: 'HEARD'; updates: ProfileUpdates; at: number }
  | { type: 'CONFIRM_FIELD'; field: ProfileFieldKey }
  | { type: 'REASK_FIELD'; field: ProfileFieldKey }
  | { type: 'REMOVE_MENU_ITEM'; name: string }
  | { type: 'SUBMITTED'; at: number; profile: OnboardingProfile } // the profile that was sent
  | { type: 'LOAD_PROFILE'; profile: OnboardingProfile }
  | { type: 'RESET' }

export function initialJourney(): JourneyState {
  return {
    screen: 'R1_WELCOME',
    authMode: 'register',
    email: null,
    building: null,
    profile: createEmptyProfile(),
    startedAt: null,
    submittedAt: null,
    runId: 0,
  }
}

export function journeyReducer(state: JourneyState, event: JourneyEvent): JourneyState {
  switch (event.type) {
    case 'GO':
      return { ...state, screen: event.screen }
    case 'CHOOSE_AUTH':
      return { ...state, authMode: event.mode, screen: 'R2_ACCOUNT' }
    case 'AUTHENTICATED':
      // A new merchant gives the store basics first; a returning one goes straight to the companion.
      return { ...state, email: event.email, screen: state.authMode === 'register' ? 'R3_STORE' : 'A1_TALK' }
    case 'STORE_BASICS':
      return {
        ...state,
        profile: applyUpdates(state.profile, event.updates),
        building: event.building,
        startedAt: state.startedAt ?? event.at,
        screen: 'A1_TALK',
      }
    case 'HEARD':
      return { ...state, profile: applyUpdates(state.profile, event.updates), startedAt: state.startedAt ?? event.at }
    case 'CONFIRM_FIELD':
      return { ...state, profile: confirmField(state.profile, event.field) }
    case 'REASK_FIELD':
      return { ...state, profile: reaskField(state.profile, event.field), screen: 'A1_TALK' }
    case 'REMOVE_MENU_ITEM':
      return { ...state, profile: removeMenuItem(state.profile, event.name) }
    case 'SUBMITTED':
      // The send takes a moment; if the merchant edited or the demo reset meanwhile, it no longer applies.
      if (state.screen !== 'A2_REVIEW' || state.profile !== event.profile) return state
      return { ...state, submittedAt: event.at, screen: 'A3_SUBMITTED' }
    case 'LOAD_PROFILE':
      return { ...state, profile: event.profile }
    case 'RESET':
      return { ...initialJourney(), runId: state.runId + 1 }
  }
}
