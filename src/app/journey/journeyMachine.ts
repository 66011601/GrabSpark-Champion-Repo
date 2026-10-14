import { applyUpdates, confirmField, createEmptyProfile, DOC_FOR_FIELD, missingDocs, onlyEmptyFields, reaskField, removeMenuItem } from '@/ai/onboarding/profile.ts'
import type { DocKind, FillMethod, OnboardingProfile, ProfileFieldKey, ProfileUpdates } from '@/types/domain.ts'

// Plan 2 adds G2_INTENT, G3_PREVIEW, G4_SUCCESS, G5_RECAP.
export type Screen =
  | 'R1_WELCOME'
  | 'R2_ACCOUNT'
  | 'R3_STORE'
  | 'A1_TALK'
  | 'S1_SCAN'
  | 'A2_REVIEW'
  | 'A3_SUBMITTED'
  | 'TRANSITION'
  | 'G1_DASHBOARD'

export type AuthMode = 'register' | 'login'

/** The documents S1 is working through. `docs` is the whole list, for the step chips; `queue` is what is left. */
export interface ScanPlan {
  docs: DocKind[]
  queue: DocKind[]
  returnTo: Screen
}

/** The photo path scans everything first, then A1 asks for what a photo cannot show. */
export const PHOTO_PATH: DocKind[] = ['idCard', 'bankBook', 'menu']

export interface JourneyState {
  screen: Screen
  authMode: AuthMode
  email: string | null // the password is never kept
  building: string | null // optional, typed or heard on R3
  profile: OnboardingProfile
  startedAt: number | null // first utterance, for the "คุยกันแค่…" time on A3
  submittedAt: number | null
  method: FillMethod // chosen on R2; a returning merchant keeps 'voice'
  scan: ScanPlan | null
  runId: number // bumps on RESET so screens start fresh
}

export type JourneyEvent =
  | { type: 'GO'; screen: Screen }
  | { type: 'CHOOSE_AUTH'; mode: AuthMode }
  | { type: 'AUTHENTICATED'; email: string; method?: FillMethod }
  | { type: 'STORE_BASICS'; updates: ProfileUpdates; building: string | null; at: number }
  | { type: 'HEARD'; updates: ProfileUpdates; at: number }
  | { type: 'START_SCAN'; docs: DocKind[]; returnTo: Screen }
  | { type: 'SCANNED'; doc: DocKind; updates: ProfileUpdates; at: number }
  | { type: 'SKIP_DOC'; doc: DocKind }
  | { type: 'TALK_DONE' } // A1 has heard every talk field
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
    method: 'voice',
    scan: null,
    runId: 0,
  }
}

function startScan(state: JourneyState, docs: DocKind[], returnTo: Screen): JourneyState {
  if (docs.length === 0) return { ...state, scan: null, screen: returnTo }
  return { ...state, scan: { docs, queue: docs, returnTo }, screen: 'S1_SCAN' }
}

/** The document on S1 is done (read or skipped): show the next one, or go where the scan was heading. */
function nextDoc(state: JourneyState): JourneyState {
  if (!state.scan) return state
  const queue = state.scan.queue.slice(1)
  return queue.length > 0 ? { ...state, scan: { ...state.scan, queue } } : { ...state, scan: null, screen: state.scan.returnTo }
}

// A result only counts for the document S1 is showing now; anything else arrived after the screen moved on.
const isCurrentDoc = (state: JourneyState, doc: DocKind) => state.screen === 'S1_SCAN' && state.scan?.queue[0] === doc

export function journeyReducer(state: JourneyState, event: JourneyEvent): JourneyState {
  switch (event.type) {
    case 'GO':
      return { ...state, screen: event.screen }
    case 'CHOOSE_AUTH':
      return { ...state, authMode: event.mode, screen: 'R2_ACCOUNT' }
    case 'AUTHENTICATED': {
      const signedIn = { ...state, email: event.email }
      // A returning merchant goes straight to the companion; a new one starts the way they chose on R2.
      if (state.authMode === 'login') return { ...signedIn, screen: 'A1_TALK' }
      const method = event.method ?? 'voice'
      if (method === 'photo') return startScan({ ...signedIn, method }, PHOTO_PATH, 'A1_TALK')
      return { ...signedIn, method, screen: 'R3_STORE' }
    }
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
    case 'START_SCAN':
      return startScan(state, event.docs, event.returnTo)
    case 'SCANNED':
      if (!isCurrentDoc(state, event.doc)) return state
      return nextDoc({ ...state, profile: applyUpdates(state.profile, onlyEmptyFields(state.profile, event.updates)), startedAt: state.startedAt ?? event.at })
    case 'SKIP_DOC':
      if (!isCurrentDoc(state, event.doc)) return state
      return nextDoc(state)
    case 'TALK_DONE':
      // Only A1 sends this; a late or repeated one from elsewhere changes nothing.
      if (state.screen !== 'A1_TALK') return state
      return startScan(state, missingDocs(state.profile), 'A2_REVIEW')
    case 'CONFIRM_FIELD':
      return { ...state, profile: confirmField(state.profile, event.field) }
    case 'REASK_FIELD': {
      const profile = reaskField(state.profile, event.field)
      // A document field is corrected by photographing it again, then back to A2.
      const doc = DOC_FOR_FIELD[event.field]
      return doc ? startScan({ ...state, profile }, [doc], 'A2_REVIEW') : { ...state, profile, screen: 'A1_TALK' }
    }
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
