import { describe, expect, it } from 'vitest'
import { decide } from '@/components/assistant/understandingStep.ts'
import { BLOCKED, SCREEN_LABELS } from '../labels.ts'
import { buildIndex, classify } from '../matcher.ts'
import { heldOutFor, learned, trainingFor } from './index.ts'
import type { ScreenId } from './types.ts'

// Spec D1 §2: "ไม่ใช่" offers the next two labels, and the lost state the two best. The five nearest sentences often
// share one label, so this holds only because `ranked` lists every label of the screen, not just the voters.
describe('buttons after "ไม่ใช่" and when lost, on the held-out sentences', () => {
  for (const screen of Object.keys(SCREEN_LABELS) as ScreenId[]) {
    it(`offers two labels whenever ${screen} has two to offer`, () => {
      const training = trainingFor(screen)
      const offerable = new Set(training.map((entry) => entry.label).filter((label) => label !== 'none' && !BLOCKED.has(label)))
      const index = buildIndex(training.map((entry) => ({ text: learned(entry), label: entry.label })))
      for (const entry of heldOutFor(screen)) {
        const match = classify(index, learned(entry))
        const step = decide(match)
        if (step.kind === 'ask') {
          const others = [...offerable].filter((label) => label !== step.label).length
          expect(step.rest.length, entry.say).toBe(Math.min(2, others))
        }
        if (step.kind === 'lost' && match.ranked.length > 0) expect(step.options.length, entry.say).toBe(Math.min(2, offerable.size))
      }
    })
  }
})
