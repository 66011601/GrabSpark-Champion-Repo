import { BUSINESS_BANK } from './signup/business.ts'
import { FINISH_BANK } from './signup/finish.ts'
import { MOVING_BANK } from './signup/moving.ts'
import { START_BANK } from './signup/start.ts'
import type { BankEntry } from './types.ts'

/** Act 1 sign-up, written by hand in central Thai, Isan, Northern and Southern: G0 to S7, plus next and back. */
export const SIGNUP_BANK: BankEntry[] = [...START_BANK, ...MOVING_BANK, ...BUSINESS_BANK, ...FINISH_BANK]
