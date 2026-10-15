import { th } from '@/copy/th.ts'

export type MicState = 'idle' | 'listening' | 'processing' | 'error'
/** 'private' = looking away while the merchant types something the companion must not see. */
export type CompanionState = MicState | 'private'

/** A button the companion offers while it waits for the merchant to pick: yes / no, or one of its best guesses. */
export interface Choice {
  id: string // unique among the buttons shown together: two labels may share a display name
  label: string
  onPress: () => void
}

/**
 * A talk sheet's own chips first, then the companion's buttons that do not repeat one of them by name
 * (the sheet covers the helper bar, so the companion's buttons ride along with the sheet's chips).
 */
export function withChoices(own: { label: string; onPress: () => void }[], choices: Choice[]): Choice[] {
  const chips = own.map((chip) => ({ id: `chip:${chip.label}`, ...chip }))
  return [...chips, ...choices.filter((choice) => !own.some((chip) => chip.label === choice.label))]
}

export const MIC_LABELS: Record<MicState, string> = {
  idle: th.mic.idle,
  listening: th.mic.listening,
  processing: th.mic.processing,
  error: th.mic.error,
}
