import { SAY } from '@/ai/commands/phrases.ts'
import { SCREEN_COMMANDS } from '@/ai/language/corpus/screens.ts'
import { BUTTONS } from '@/ai/navigator/buttons.ts'
import { CONTROLS } from '@/ai/navigator/matchIntent.ts'
import { GRID } from '@/ai/navigator/openPage.ts'
import { SCRIPTS } from '@/ai/navigator/scripts.ts'
import { th } from '@/copy/th.ts'
import type { ScreenId } from './bank/types.ts'

const TOPICS_S3 = ['topic:storeName', 'topic:location', 'topic:category', 'topic:building', 'topic:address']
const ACT2_LABELS = [
  ...SCRIPTS.map((script) => `intent:${script.id}`),
  ...CONTROLS.map((control) => `control:${control.id}`),
  ...GRID.map((item) => `open:${item.id}`),
  ...BUTTONS.map((button) => `button:${button.id}`),
  'act2:confirm',
]

/** What each screen's matcher may answer (besides "none"): its own voice commands, field topics, Act 2 routes. */
export const SCREEN_LABELS: Record<ScreenId, string[]> = {
  G0: [...SCREEN_COMMANDS.G0],
  S1: [...SCREEN_COMMANDS.S1],
  S2_ACCOUNT: [...SCREEN_COMMANDS.S2_ACCOUNT],
  S2_PHONE: [...SCREEN_COMMANDS.S2_PHONE],
  S3: [...SCREEN_COMMANDS.S3, ...TOPICS_S3],
  S4: [...SCREEN_COMMANDS.S4],
  S5: [...SCREEN_COMMANDS.S5],
  S6: [...SCREEN_COMMANDS.S6],
  S7: [...SCREEN_COMMANDS.S7],
  H1: ['task:menu', 'task:hours'],
  H2: [...SCREEN_COMMANDS.H2, 'topic:menu'],
  H3: [...SCREEN_COMMANDS.H3, 'topic:hours'],
  ACT2: ACT2_LABELS,
}

/** Learned so they are not mistaken for other labels, but only the merchant's own tap may do them. */
export const BLOCKED: ReadonlySet<string> = new Set(['submit', 'consentTick', 'act2:confirm'])

/** The sentence that performs a label through the screen's own rules; null when there is none (topics, tasks, none). */
export function canonicalPhrase(label: string): string | null {
  if (label in SAY) return SAY[label as keyof typeof SAY][0]
  const [kind, id] = label.split(':')
  if (kind === 'intent') return SCRIPTS.find((script) => script.id === id)?.phrases[0] ?? null
  if (kind === 'control') return CONTROLS.find((control) => control.id === id)?.phrases[0] ?? null
  if (kind === 'open') {
    const item = GRID.find((entry) => entry.id === id)
    return item ? `เปิด${item.label}` : null
  }
  if (kind === 'button') return BUTTONS.find((button) => button.id === id)?.names[0] ?? null
  return null
}

const TOPIC_QUESTIONS: Record<string, string> = {
  'topic:storeName': th.followUp.storeName,
  'topic:location': th.followUp.location,
  'topic:category': th.followUp.category,
  'topic:building': th.followUp.building,
  'topic:address': th.understanding.askAddress,
  'topic:menu': th.followUp.menu,
  'topic:hours': th.followUp.hours,
}

/** The follow-up question for a field topic: the matcher never fills a value, it asks for it. */
export const topicQuestion = (label: string): string | null => TOPIC_QUESTIONS[label] ?? null

/** The tap-only line for a blocked label, or null when the label is not blocked. */
export function blockedReply(label: string): string | null {
  if (!BLOCKED.has(label)) return null
  return label === 'act2:confirm' ? th.act2.confirm.byTap : th.s7.mustTap
}
