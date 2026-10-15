import { SCREEN_LABELS } from '../labels.ts'
import { FROM_CORPUS } from './fromCorpus.ts'
import type { BankEntry, ScreenId } from './types.ts'

export const BANK: BankEntry[] = [...FROM_CORPUS]

// FNV-1a: a stable hash, so the same sentence is always in the same half.
function hash(text: string): number {
  let value = 0x811c9dc5
  for (let index = 0; index < text.length; index += 1) {
    value ^= text.charCodeAt(index)
    value = Math.imul(value, 0x01000193) >>> 0
  }
  return value
}

/** One written sentence in five is kept out of training, to measure how well unseen speech is understood. */
export const isHeldOut = (entry: BankEntry): boolean => entry.source === 'written' && hash(entry.say) % 5 === 0

const onScreen = (entry: BankEntry, screen: ScreenId) =>
  (entry.screens === 'any' || entry.screens.includes(screen)) && (entry.label === 'none' || SCREEN_LABELS[screen].includes(entry.label))

export const trainingFor = (screen: ScreenId): BankEntry[] => BANK.filter((entry) => onScreen(entry, screen) && !isHeldOut(entry))
export const heldOutFor = (screen: ScreenId): BankEntry[] => BANK.filter((entry) => onScreen(entry, screen) && isHeldOut(entry))
