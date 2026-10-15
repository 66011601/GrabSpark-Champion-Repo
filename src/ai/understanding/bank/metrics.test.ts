import { describe, expect, it } from 'vitest'
import type { Said } from '@/ai/language/corpus/types.ts'
import { decide, type Step } from '@/components/assistant/understandingStep.ts'
import { SCREEN_LABELS } from '../labels.ts'
import { buildIndex, classify } from '../matcher.ts'
import { heldOutFor, learned, trainingFor } from './index.ts'
import type { ScreenId } from './types.ts'

// Spec D1 §8: what the companion would do with every held-out sentence, on every screen that allows its label, with
// that screen's training index. A sentence allowed on many screens ("next", "none") is counted once per screen,
// because the merchant may say it on any of them.

type Outcome = 'right' | 'wrongWithoutAsking' | 'askedWrong' | 'lost'

/**
 * right: act on the right label, or ask about it (a "yes" then does it); for a sentence that means nothing, being lost.
 * wrong without asking: act on another label. A blocked label's tap-only line counts here too when it is the wrong
 * label: the companion answered without asking, even though nothing was done.
 */
function outcomeOf(label: string, step: Step): Outcome {
  switch (step.kind) {
    case 'act':
    case 'blocked':
      return step.label === label ? 'right' : 'wrongWithoutAsking'
    case 'ask':
      return step.label === label ? 'right' : 'askedWrong'
    case 'lost':
      return label === 'none' ? 'right' : 'lost'
  }
}

interface Row {
  screen: ScreenId
  region: Said
  outcome: Outcome
  asked: boolean
}

const rows: Row[] = (Object.keys(SCREEN_LABELS) as ScreenId[]).flatMap((screen) => {
  const index = buildIndex(trainingFor(screen).map((entry) => ({ text: learned(entry), label: entry.label })))
  return heldOutFor(screen).map((entry) => {
    const step = decide(classify(index, learned(entry)))
    return { screen, region: entry.region, outcome: outcomeOf(entry.label, step), asked: step.kind === 'ask' }
  })
})

const percent = (part: number, whole: number) => Math.round((1000 * part) / whole) / 10

function summary(group: Row[]) {
  const count = (outcome: Outcome) => group.filter((row) => row.outcome === outcome).length
  return {
    sentences: group.length,
    'right %': percent(count('right'), group.length),
    'ask %': percent(group.filter((row) => row.asked).length, group.length),
    'wrong without asking %': percent(count('wrongWithoutAsking'), group.length),
    'asked wrong %': percent(count('askedWrong'), group.length),
    'lost %': percent(count('lost'), group.length),
  }
}

const REGIONS: Said[] = ['central', 'isan', 'north', 'south']

describe('held-out accuracy (spec D1 §8)', () => {
  it('is right at least 85% of the time in every region, and wrong without asking at most 2% overall', () => {
    const byRegion = Object.fromEntries(REGIONS.map((region) => [region, summary(rows.filter((row) => row.region === region))]))
    const byScreen = Object.fromEntries(Object.keys(SCREEN_LABELS).map((screen) => [screen, summary(rows.filter((row) => row.screen === screen))]))
    console.table({ ...byRegion, all: summary(rows) })
    console.table(byScreen)

    const wrong = rows.filter((row) => row.outcome === 'wrongWithoutAsking').length
    expect(wrong / rows.length).toBeLessThanOrEqual(0.02)
    for (const region of REGIONS) expect(byRegion[region]['right %'], region).toBeGreaterThanOrEqual(85)
  })
})
