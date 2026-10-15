import { describe, expect, it } from 'vitest'
import { matchCommand } from '@/ai/commands/matchCommand.ts'
import { SAY } from '@/ai/commands/phrases.ts'
import { SCREEN_COMMANDS } from '@/ai/language/corpus/screens.ts'
import { matchButton } from '@/ai/navigator/buttons.ts'
import { asksToConfirm, CONTROLS, matchIntent } from '@/ai/navigator/matchIntent.ts'
import { matchOpen } from '@/ai/navigator/openPage.ts'
import { SCRIPTS } from '@/ai/navigator/scripts.ts'
import { understandThai } from '@/ai/language/understand.ts'
import type { ScreenId } from './bank/types.ts'
import { BLOCKED, blockedReply, canonicalPhrase, SCREEN_LABELS, topicQuestion } from './labels.ts'
import { labelName } from './labelNames.ts'

// The same order DashboardScreen checks a sentence in (see src/ai/language/corpus/corpus.test.ts).
function act2Route(text: string): string | null {
  if (asksToConfirm(text)) return 'act2:confirm'
  const control = matchCommand(text, CONTROLS)
  if (control) return `control:${control}`
  const page = matchOpen(text)
  if (page) return `open:${page}`
  const button = matchButton(text)
  if (button) return `button:${button}`
  const intent = matchIntent(text, SCRIPTS)
  return intent ? `intent:${intent}` : null
}

describe('labels', () => {
  it('replays every command label through its own screen’s rules', () => {
    for (const [screen, keys] of Object.entries(SCREEN_COMMANDS)) {
      for (const key of keys) {
        const phrase = understandThai(canonicalPhrase(key)!).text
        expect(matchCommand(phrase, keys.map((id) => ({ id, phrases: SAY[id] }))), `${screen} ${key}`).toBe(key)
      }
    }
  })

  it('replays every Act 2 label through Act 2’s rules', () => {
    for (const label of SCREEN_LABELS.ACT2.filter((entry) => entry !== 'act2:confirm')) {
      expect(act2Route(understandThai(canonicalPhrase(label)!).text), label).toBe(label)
    }
  })

  it('asks a question for every topic and names every label', () => {
    for (const labels of Object.values(SCREEN_LABELS)) {
      for (const label of labels) {
        if (label.startsWith('topic:')) expect(topicQuestion(label), label).toBeTruthy()
        expect(labelName(label), label).not.toBe(label)
      }
    }
  })

  it('blocks only the tap-only labels, each with its tap-only line', () => {
    expect([...BLOCKED].sort()).toEqual(['act2:confirm', 'consentTick', 'submit'])
    for (const label of BLOCKED) expect(blockedReply(label)).toBeTruthy()
    expect(blockedReply('next')).toBeNull()
  })

  it('gives every screen at least two labels', () => {
    for (const screen of Object.keys(SCREEN_LABELS) as ScreenId[]) expect(SCREEN_LABELS[screen].length, screen).toBeGreaterThanOrEqual(2)
  })
})
