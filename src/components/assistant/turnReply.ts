import type { Understood } from '@/ai/language/understand.ts'
import { withGreeting } from '@/ai/language/greeting.ts'
import { kindReply } from '@/ai/language/kindWords.ts'
import { th } from '@/copy/th.ts'

/** true = understood, false = not understood, or the companion's own reply to say instead. */
export type Reply = boolean | string

/**
 * The companion's answer to one heard sentence. Swearing alone gets a calm line and never reaches the screen;
 * thanks or praise alone gets a warm one; a sentence with nothing left (only particles) is not understood;
 * anything else is the screen's to answer.
 */
export function replyTo(heard: Pick<Understood, 'text' | 'onlyRude'>, interpret: (text: string) => Reply | Promise<Reply>): Promise<Reply> {
  if (heard.onlyRude) return Promise.resolve(th.language.calm)
  if (!heard.text) return Promise.resolve(false)
  const kind = kindReply(heard.text)
  if (kind) return Promise.resolve(kind)
  return Promise.resolve()
    .then(() => interpret(heard.text))
    .catch(() => false as const)
}

/** What the companion shows for a reply: nothing when it simply worked, with any waiting greeting in front. */
export function noticeFor(reply: Reply, greeting: string | null): string | null {
  return withGreeting(reply === true ? null : reply === false ? th.onboarding.notUnderstood : reply, greeting)
}
