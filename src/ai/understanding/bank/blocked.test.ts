import { describe, expect, it, vi } from 'vitest'
import { understandThai } from '@/ai/language/understand.ts'
import { takeTurn, type Turn } from '@/components/assistant/understandingStep.ts'
import { th } from '@/copy/th.ts'
import { BLOCKED, blockedReply, SCREEN_LABELS } from '../labels.ts'
import { matchOn } from '../load.ts'
import { BANK } from './index.ts'
import type { ScreenId } from './types.ts'

// Spec D1 §7: "a test asserts this for every screen". Every sentence the bank teaches for a blocked label, training
// and held-out alike, is said on every screen with the rules not understanding it: the matcher's guess must never
// perform a blocked label, ask about one or offer one as a button.
const blockedSentences = BANK.filter((entry) => BLOCKED.has(entry.label))
const tapOnly = new Set([th.s7.mustTap, th.act2.confirm.byTap])

async function turnOn(screen: ScreenId, say: string): Promise<{ turn: Turn; performed: string[] }> {
  const perform = vi.fn(async () => true as const)
  const turn = await takeTurn({
    heard: understandThai(say),
    pending: null,
    screen,
    rules: () => false,
    perform,
    matchOn,
    isCurrent: () => true,
  })
  return { turn, performed: perform.mock.calls.map(([label]) => label as string) }
}

describe('blocked labels (spec D1 §7)', () => {
  it('has blocked sentences to try', () => {
    for (const label of BLOCKED) expect(blockedSentences.some((entry) => entry.label === label), label).toBe(true)
  })

  for (const screen of Object.keys(SCREEN_LABELS) as ScreenId[]) {
    it(`are never acted on, asked about or offered on ${screen}`, async () => {
      for (const entry of blockedSentences) {
        const { turn, performed } = await turnOn(screen, entry.say)
        const where = `${screen}: ${entry.say}`
        expect(performed.filter((label) => BLOCKED.has(label)), where).toEqual([])
        expect(turn.pending && BLOCKED.has(turn.pending.label), where).toBeFalsy()
        expect(turn.offers.filter((label) => BLOCKED.has(label)), where).toEqual([])
        // Where the label is allowed, the merchant hears the tap-only line, the companion is lost, or it asks about
        // another label (a "yes" then does that label, never the blocked one).
        if (SCREEN_LABELS[screen].includes(entry.label)) {
          const lost = turn.reply === false || turn.reply === th.understanding.unsure
          expect(turn.reply === blockedReply(entry.label) || lost || turn.pending !== null, where).toBe(true)
          expect(performed, where).toEqual([])
        } else if (tapOnly.has(turn.reply as string)) {
          // "ยืนยัน" teaches both submit and act2:confirm: on 7/7 it gets the submit line, which is still a tap-only one.
          const own = SCREEN_LABELS[screen].filter((label) => BLOCKED.has(label)).map(blockedReply)
          expect(own, where).toContain(turn.reply)
        }
      }
    })
  }
})
