import { prepare } from '../features.ts'
import { SCREEN_LABELS } from '../labels.ts'
import { ACT2_BANK } from './act2.ts'
import { FROM_CORPUS } from './fromCorpus.ts'
import { HOME_BANK } from './home.ts'
import { NONE_BANK } from './none.ts'
import { SIGNUP_BANK } from './signup.ts'
import { TEMPLATE_BANK } from './templates.ts'
import type { BankEntry, ScreenId } from './types.ts'
import LEARNED from './learned.json'

/** Every sentence the matcher learns from or is tested on: hand-written first, then the slot templates (training only). */
export const BANK: BankEntry[] = [...FROM_CORPUS, ...SIGNUP_BANK, ...HOME_BANK, ...ACT2_BANK, ...NONE_BANK, ...TEMPLATE_BANK]

// FNV-1a: a stable hash, so the same sentence is always in the same half.
function hash(text: string): number {
  let value = 0x811c9dc5
  for (let index = 0; index < text.length; index += 1) {
    value ^= text.charCodeAt(index)
    value = Math.imul(value, 0x01000193) >>> 0
  }
  return value
}

// The language layer is most of the work of building an index (the dashboard learns about 1,500 sentences), so the
// learned form of every bank sentence it changes is kept in learned.json, keyed by sentenceKey; the others learn as
// prepare(say). bank.test.ts checks the file against the language layer and remakes it with
// `npx vitest run src/ai/understanding/bank --update`.
const CHANGED: Record<string, string> = LEARNED

/** A sentence's key in learned.json: its hash, so the file does not carry every sentence a second time. */
export const sentenceKey = (say: string): string => hash(say).toString(36)

const learnedForms = new WeakMap<BankEntry, string>()

/** An entry's sentence as the matcher learns it: `learnable(say)`, read from learned.json. */
export function learned(entry: BankEntry): string {
  let form = learnedForms.get(entry)
  if (form === undefined) {
    form = CHANGED[sentenceKey(entry.say)] ?? prepare(entry.say)
    learnedForms.set(entry, form)
  }
  return form
}

/**
 * One written sentence in five is kept out of training, to measure how well unseen speech is understood. The hash is of
 * the form the matcher learns, so ค่ะ/ครับ or spacing variants of one sentence always land on the same side.
 */
export const isHeldOut = (entry: BankEntry): boolean => entry.source === 'written' && hash(learned(entry)) % 5 === 0

const onScreen = (entry: BankEntry, screen: ScreenId) =>
  (entry.screens === 'any' || entry.screens.includes(screen)) && (entry.label === 'none' || SCREEN_LABELS[screen].includes(entry.label))

/** What a screen's index learns from: its own labels and "none", without the held-out sentences. */
export const trainingFor = (screen: ScreenId): BankEntry[] => BANK.filter((entry) => onScreen(entry, screen) && !isHeldOut(entry))
/** The written sentences kept out of a screen's index, to measure it (metrics.test.ts). */
export const heldOutFor = (screen: ScreenId): BankEntry[] => BANK.filter((entry) => onScreen(entry, screen) && isHeldOut(entry))
