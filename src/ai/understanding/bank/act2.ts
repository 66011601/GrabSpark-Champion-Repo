import { BUTTONS_BANK } from './act2/buttons.ts'
import { INTENTS_BANK } from './act2/intents.ts'
import { PAGES_BANK } from './act2/pages.ts'
import type { BankEntry } from './types.ts'

/** Act 2, written by hand in central Thai, Isan, Northern and Southern: the scripts, controls, 13 pages and buttons. */
export const ACT2_BANK: BankEntry[] = [...INTENTS_BANK, ...PAGES_BANK, ...BUTTONS_BANK]
