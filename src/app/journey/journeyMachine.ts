import { applyUpdates, confirmField, createEmptyProfile, reaskField, removeMenuItem } from '@/ai/onboarding/profile.ts'
import type { OnboardingProfile, ProfileFieldKey, ProfileUpdates } from '@/types/domain.ts'

// Plan 2 adds G2_INTENT, G3_PREVIEW, G4_SUCCESS, G5_RECAP.
export type Screen = 'A1_TALK' | 'A2_REVIEW' | 'A3_SUBMITTED' | 'TRANSITION' | 'G1_DASHBOARD'

export interface JourneyState {
  screen: Screen
  profile: OnboardingProfile
  startedAt: number | null // first utterance, for the "คุยกันแค่…" time on A3
  submittedAt: number | null
}

export type JourneyEvent =
  | { type: 'GO'; screen: Screen }
  | { type: 'HEARD'; updates: ProfileUpdates; at: number }
  | { type: 'CONFIRM_FIELD'; field: ProfileFieldKey }
  | { type: 'REASK_FIELD'; field: ProfileFieldKey }
  | { type: 'REMOVE_MENU_ITEM'; name: string }
  | { type: 'SUBMITTED'; at: number }
  | { type: 'LOAD_PROFILE'; profile: OnboardingProfile }
  | { type: 'RESET' }

export function initialJourney(): JourneyState {
  return { screen: 'A1_TALK', profile: createEmptyProfile(), startedAt: null, submittedAt: null }
}

export function journeyReducer(state: JourneyState, event: JourneyEvent): JourneyState {
  switch (event.type) {
    case 'GO':
      return { ...state, screen: event.screen }
    case 'HEARD':
      return { ...state, profile: applyUpdates(state.profile, event.updates), startedAt: state.startedAt ?? event.at }
    case 'CONFIRM_FIELD':
      return { ...state, profile: confirmField(state.profile, event.field) }
    case 'REASK_FIELD':
      return { ...state, profile: reaskField(state.profile, event.field), screen: 'A1_TALK' }
    case 'REMOVE_MENU_ITEM':
      return { ...state, profile: removeMenuItem(state.profile, event.name) }
    case 'SUBMITTED':
      return { ...state, submittedAt: event.at, screen: 'A3_SUBMITTED' }
    case 'LOAD_PROFILE':
      return { ...state, profile: event.profile }
    case 'RESET':
      return initialJourney()
  }
}
