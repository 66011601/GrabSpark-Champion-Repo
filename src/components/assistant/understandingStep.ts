import { matchCommand } from '@/ai/commands/matchCommand.ts'
import type { Understood } from '@/ai/language/understand.ts'
import type { ScreenId } from '@/ai/understanding/bank/types.ts'
import { blockedReply, BLOCKED } from '@/ai/understanding/labels.ts'
import { labelName } from '@/ai/understanding/labelNames.ts'
import { ASK_SCORE, levelOf, type Match } from '@/ai/understanding/matcher.ts'
import { th } from '@/copy/th.ts'
import { replyTo, type Reply } from './turnReply.ts'

/** What the companion does with the matcher's guess. */
export type Step =
  | { kind: 'act'; label: string }
  | { kind: 'blocked'; label: string }
  | { kind: 'ask'; label: string; rest: string[] }
  | { kind: 'lost'; options: string[] }

const OFFERED = 2
const offerable = (labels: string[]) => labels.filter((label) => label !== 'none' && !BLOCKED.has(label))

/** sure → act; unsure → ask about the top label; lost → offer the two best real labels. Blocked labels never act. */
export function decide(match: Match): Step {
  // A blocked guess answers only with some confidence: unrelated talk must not get the tap-only line.
  if (BLOCKED.has(match.label) && match.score >= ASK_SCORE) return { kind: 'blocked', label: match.label }
  const level = levelOf(match)
  if (level === 'sure') return { kind: 'act', label: match.label }
  if (level === 'unsure') return { kind: 'ask', label: match.label, rest: offerable(match.ranked.slice(1)).slice(0, OFFERED) }
  return { kind: 'lost', options: offerable(match.ranked).slice(0, OFFERED) }
}

const ANSWERS = [
  { id: 'yes' as const, phrases: ['ใช่', 'ใช่แล้ว', 'ได้', 'ได้เลย', 'โอเค', 'ถูกแล้ว', 'ถูกต้อง', 'เอา', 'เอาเลย'] },
  { id: 'no' as const, phrases: ['ไม่ใช่', 'ไม่', 'ไม่เอา', 'ผิด', 'ไม่ถูก', 'ไม่ใช่อันนี้'] },
]

/** The merchant's answer to "หมายถึง … ใช่ไหมคะ", or null when they said something else. */
export const answerOf = (understood: string): 'yes' | 'no' | null => matchCommand(understood, ANSWERS)

/** A question the companion asked and is waiting on: the guess, and the next best labels to offer if it was wrong. */
export interface Pending {
  label: string
  rest: string[]
}

/** One finished turn: what to say, the question now waiting (if any), and labels to show as buttons. */
export interface Turn {
  reply: Reply
  pending: Pending | null
  offers: string[]
}

const plain = (reply: Reply): Turn => ({ reply, pending: null, offers: [] })

/** The merchant answered the waiting question, by voice or by a tap. */
export async function answerPending(pending: Pending, answer: 'yes' | 'no', perform: (label: string) => Promise<Reply>): Promise<Turn> {
  if (answer === 'yes') return plain(await perform(pending.label))
  return { reply: th.understanding.declined, pending: null, offers: pending.rest }
}

/** Everything one turn needs; the hook supplies the real rules, performer and matcher, tests supply fakes. */
export interface TurnParts {
  heard: Pick<Understood, 'text' | 'onlyRude'>
  pending: Pending | null
  /** null when the screen has no understanding option. */
  screen: ScreenId | null
  rules: (text: string) => Reply | Promise<Reply>
  perform: (label: string) => Promise<Reply>
  matchOn: (screen: ScreenId, understood: string) => Promise<Match>
  isCurrent: () => boolean
}

/** A turn runs in this order: a waiting question, then the screen's rules, then (only if they did not understand) the matcher. */
export async function takeTurn({ heard, pending, screen, rules, perform, matchOn, isCurrent }: TurnParts): Promise<Turn> {
  if (pending) {
    const answer = answerOf(heard.text)
    if (answer) return answerPending(pending, answer, perform)
  }
  const reply = await replyTo(heard, rules)
  if (reply !== false || !screen || !heard.text) return plain(reply)
  // A failed bank import means "no guess", so the usual not-understood line is shown.
  const match = await matchOn(screen, heard.text).catch(() => null)
  if (!match || !isCurrent()) return plain(false)
  const step = decide(match)
  switch (step.kind) {
    case 'act':
      return plain(await perform(step.label))
    case 'blocked':
      return plain(blockedReply(step.label) ?? false)
    case 'ask':
      return { reply: th.understanding.ask(labelName(step.label)), pending: { label: step.label, rest: step.rest }, offers: [] }
    case 'lost':
      return step.options.length > 0 ? { reply: th.understanding.unsure, pending: null, offers: step.options } : plain(false)
  }
}
