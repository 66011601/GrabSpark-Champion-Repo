import type { Screen, SayKey } from './types.ts'

/** Each listening screen's voice commands, in the order the screen checks them (ties go to the earlier one). */
export const SCREEN_COMMANDS: Record<Screen, SayKey[]> = {
  G0: ['register', 'login'],
  S1: ['food', 'mart', 'next', 'back'],
  S2_ACCOUNT: ['next', 'back'],
  S2_PHONE: ['next', 'back', 'yes'],
  S3: ['next', 'back', 'typeInstead', 'here', 'pin'],
  S4: ['personal', 'company', 'next', 'back'],
  S5: ['shoot', 'next', 'back'],
  S6: ['shoot', 'next', 'back'],
  S7: ['listenSummary', 'submit', 'consentTick', 'back'],
  H2: ['shoot', 'back'],
  H3: ['back'],
}
