import type { MicState } from './companionState.ts'
import type { createTurnGuard } from './turnGuard.ts'
import type { Turn } from './understandingStep.ts'

/** What a tap on one of the companion's buttons needs from useVoiceInput; tests supply fakes. */
export interface TapParts {
  guard: ReturnType<typeof createTurnGuard>
  mic: () => MicState
  /** Clears the thinking and resume timers and stops the companion's voice. */
  cancelPending: () => void
  /** Closes the open mic so that nothing it heard is reported afterwards. */
  closeMic: () => void
  setMic: (next: MicState) => void
  /** Forgets the waiting question and hides its buttons while the tap is worked on. */
  clearChoices: () => void
  show: (turn: Turn) => void
  /** Listens again after a moment, as a spoken turn does (when the conversation is hands-free). */
  resumeSoon: () => void
}

/**
 * A tap on a button is a turn of its own: it wins over anything still in flight. A spoken turn that was thinking
 * ("processing") or a mic that had reopened after an ask-back would otherwise stay that way: the newer turn makes
 * their callbacks return early, so they never set the mic back to idle and the merchant could not speak again.
 */
export async function runTap(parts: TapParts, work: (isCurrent: () => boolean) => Promise<Turn>): Promise<void> {
  const { guard } = parts
  if (!guard.mounted()) return
  parts.cancelPending()
  const mic = parts.mic()
  if (mic === 'listening') parts.closeMic()
  const isCurrent = guard.begin()
  parts.clearChoices()
  // A mic error stays on show: tapping a button does not mend the microphone.
  if (mic === 'listening' || mic === 'processing') parts.setMic('idle')
  const turn = await work(isCurrent)
  if (!isCurrent()) return
  parts.show(turn)
  parts.resumeSoon()
}

/**
 * Which listening session may still report. A session closed by a tap can still fire its final words and its end
 * as the recogniser shuts down; those must not start a turn or touch the mic after the tap.
 */
export function createSessionGate() {
  let latest = 0
  return {
    /** A new session; the returned function is true while it is the latest and has not been closed. */
    open: () => {
      const mine = ++latest
      return () => mine === latest
    },
    close: () => {
      latest += 1
    },
  }
}
