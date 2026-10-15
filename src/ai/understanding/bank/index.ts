import { learnable } from '../features.ts'
import { SCREEN_LABELS } from '../labels.ts'
import { ACT2_BANK } from './act2.ts'
import { FROM_CORPUS } from './fromCorpus.ts'
import { HOME_BANK } from './home.ts'
import { NONE_BANK } from './none.ts'
import { SIGNUP_BANK } from './signup.ts'
import type { BankEntry, ScreenId } from './types.ts'

export const BANK: BankEntry[] = [...FROM_CORPUS, ...SIGNUP_BANK, ...HOME_BANK, ...ACT2_BANK, ...NONE_BANK]

// FNV-1a: a stable hash, so the same sentence is always in the same half.
function hash(text: string): number {
  let value = 0x811c9dc5
  for (let index = 0; index < text.length; index += 1) {
    value ^= text.charCodeAt(index)
    value = Math.imul(value, 0x01000193) >>> 0
  }
  return value
}

// Every screen's index asks about every entry; running the language layer each time would be wasted work.
const heldOut = new WeakMap<BankEntry, boolean>()

/**
 * One written sentence in five is kept out of training, to measure how well unseen speech is understood. The hash is of
 * the form the matcher learns, so ค่ะ/ครับ or spacing variants of one sentence always land on the same side.
 */
export function isHeldOut(entry: BankEntry): boolean {
  if (entry.source !== 'written') return false
  let held = heldOut.get(entry)
  if (held === undefined) {
    held = hash(learnable(entry.say)) % 5 === 0
    heldOut.set(entry, held)
  }
  return held
}

const onScreen = (entry: BankEntry, screen: ScreenId) =>
  (entry.screens === 'any' || entry.screens.includes(screen)) && (entry.label === 'none' || SCREEN_LABELS[screen].includes(entry.label))

export const trainingFor = (screen: ScreenId): BankEntry[] => BANK.filter((entry) => onScreen(entry, screen) && !isHeldOut(entry))
export const heldOutFor = (screen: ScreenId): BankEntry[] => BANK.filter((entry) => onScreen(entry, screen) && isHeldOut(entry))
