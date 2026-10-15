import { describe, expect, it } from 'vitest'
import type { Said } from '@/ai/language/corpus/types.ts'
import { decide, type Step } from '@/components/assistant/understandingStep.ts'
import { SCREEN_LABELS } from '../labels.ts'
import { buildIndex, classify } from '../matcher.ts'
import { heldOutFor, learned, trainingFor } from './index.ts'
import type { BankEntry, ScreenId } from './types.ts'

// Spec D1 §8: what the companion would do with every held-out sentence, on every screen that allows its label, with
// that screen's training index. Each sentence counts ONCE: a sentence allowed on several screens ("next", "none")
// scores the average of its outcomes there, so the many screens of a few easy labels cannot lift a region.

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
  outcome: Outcome
  asked: boolean
}

const OUTCOMES: Outcome[] = ['right', 'wrongWithoutAsking', 'askedWrong', 'lost']
const rowsOf = new Map<BankEntry, Row[]>()
for (const screen of Object.keys(SCREEN_LABELS) as ScreenId[]) {
  const index = buildIndex(trainingFor(screen).map((entry) => ({ text: learned(entry), label: entry.label })))
  for (const entry of heldOutFor(screen)) {
    const step = decide(classify(index, learned(entry)))
    rowsOf.set(entry, [...(rowsOf.get(entry) ?? []), { screen, outcome: outcomeOf(entry.label, step), asked: step.kind === 'ask' }])
  }
}

/** One sentence's share of each outcome and of asking, averaged over the screens it was tried on. */
function shares(rows: Row[]): Record<Outcome | 'asked', number> {
  const share = (hit: (row: Row) => boolean) => rows.filter(hit).length / rows.length
  return {
    ...(Object.fromEntries(OUTCOMES.map((outcome) => [outcome, share((row) => row.outcome === outcome)])) as Record<Outcome, number>),
    asked: share((row) => row.asked),
  }
}

const percent = (value: number) => Math.round(1000 * value) / 10

function table(groups: Row[][]) {
  const total = (key: Outcome | 'asked') => groups.reduce((sum, rows) => sum + shares(rows)[key], 0) / groups.length
  return {
    sentences: groups.length,
    'right %': percent(total('right')),
    'ask %': percent(total('asked')),
    'wrong without asking %': percent(total('wrongWithoutAsking')),
    'asked wrong %': percent(total('askedWrong')),
    'lost %': percent(total('lost')),
  }
}

const REGIONS: Said[] = ['central', 'isan', 'north', 'south']
const sentences = [...rowsOf.entries()]
const inRegion = (region: Said, only: (entry: BankEntry) => boolean = () => true) =>
  sentences.filter(([entry]) => entry.region === region && only(entry)).map(([, rows]) => rows)

describe('held-out accuracy (spec D1 §8), each sentence counted once', () => {
  it('is right at least 85% of the time in every region, and wrong without asking at most 2% overall', () => {
    const byRegion = Object.fromEntries(REGIONS.map((region) => [region, table(inRegion(region))]))
    const all = table(sentences.map(([, rows]) => rows))
    const screenOnly = (entry: BankEntry) => entry.screens !== 'any'
    const specific = Object.fromEntries(REGIONS.map((region) => [region, table(inRegion(region, screenOnly))]))
    const byScreen = Object.fromEntries(
      Object.keys(SCREEN_LABELS).map((screen) => [screen, table(sentences.flatMap(([, rows]) => rows.filter((row) => row.screen === screen)).map((row) => [row]))]),
    )
    console.table({ ...byRegion, all })
    console.table(specific) // labels of one screen only: no next, back or none
    console.table(byScreen)

    expect(all['wrong without asking %']).toBeLessThanOrEqual(2)
    for (const region of REGIONS) expect(byRegion[region]['right %'], region).toBeGreaterThanOrEqual(85)
  })
})
