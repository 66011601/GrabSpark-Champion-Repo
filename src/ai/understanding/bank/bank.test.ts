import { describe, expect, it } from 'vitest'
import { matchCommand } from '@/ai/commands/matchCommand.ts'
import { SAY } from '@/ai/commands/phrases.ts'
import { SCREEN_COMMANDS } from '@/ai/language/corpus/screens.ts'
import type { Said } from '@/ai/language/corpus/types.ts'
import { understandThai } from '@/ai/language/understand.ts'
import { businessUpdates } from '@/ai/onboarding/businessTalk.ts'
import { createEmptyProfile } from '@/ai/onboarding/profile.ts'
import { getLandmarks } from '@/services/merchantApi.ts'
import { act2Route } from '../act2Route.ts'
import { learnable, prepare } from '../features.ts'
import { BLOCKED, SCREEN_LABELS } from '../labels.ts'
import { BANK, heldOutFor, isHeldOut, learned, sentenceKey, trainingFor } from './index.ts'
import { NONE_BANK } from './none.ts'
import { SIGNUP_BANK } from './signup.ts'
import { TEMPLATE_BANK } from './templates.ts'
import type { ScreenId } from './types.ts'

const ALL_LABELS = new Set(['none', ...Object.values(SCREEN_LABELS).flat()])
const screens = Object.keys(SCREEN_LABELS) as ScreenId[]
const REGIONS: Said[] = ['central', 'isan', 'north', 'south']
const WRITTEN = BANK.filter((entry) => entry.source === 'written')

// Spec D1 §5 and the Task 5–6 quotas: hand-written sentences per label in each region (FROM_CORPUS counts, templates do not).
function minimumFor(label: string): number {
  if (label === 'next' || label === 'back') return 12
  if (label.startsWith('intent:')) return 10
  if (label.startsWith('open:') || label.startsWith('button:')) return 3
  if (BLOCKED.has(label)) return 4
  return 8 // commands, field topics, Home tasks, Act 2 controls
}

describe('bank structure', () => {
  it('uses only known labels, each allowed on the screens it names', () => {
    for (const entry of BANK) {
      expect(ALL_LABELS.has(entry.label), entry.say).toBe(true)
      if (entry.screens !== 'any') for (const screen of entry.screens) expect(entry.label === 'none' || SCREEN_LABELS[screen].includes(entry.label), `${entry.say} @${screen}`).toBe(true)
    }
  })

  it('never trains on a held-out sentence', () => {
    for (const screen of screens) {
      const trained = new Set(trainingFor(screen).map((entry) => entry.say))
      for (const entry of heldOutFor(screen)) expect(trained.has(entry.say), entry.say).toBe(false)
    }
  })

  it('holds out written sentences only', () => {
    expect(BANK.filter(isHeldOut).every((entry) => entry.source === 'written')).toBe(true)
  })

  it('has no duplicate sentence with two different labels on the same screen', () => {
    const seen = new Map<string, string>()
    for (const entry of BANK) {
      const key = `${entry.screens === 'any' ? 'any' : entry.screens.join(',')}|${entry.say}`
      if (seen.has(key)) expect(seen.get(key), entry.say).toBe(entry.label)
      seen.set(key, entry.label)
    }
  })

  // The matcher only hears what 3/7's rules did not understand, so a topic sentence the parsers fill would never reach
  // it. (The corpus's S3 field sentences are the opposite: the parsers must fill them, so they are not checked here.)
  it('keeps every written S3 topic and type-instead sentence out of the parsers, so it reaches the matcher', () => {
    const landmarks = getLandmarks()
    const talk = SIGNUP_BANK.filter((entry) => entry.screens !== 'any' && entry.screens.includes('S3'))
    for (const entry of talk.filter((e) => e.label.startsWith('topic:') || e.label === 'typeInstead')) {
      const updates = businessUpdates(understandThai(entry.say).text, { expecting: undefined, landmarks, profile: createEmptyProfile() })
      expect(Object.keys(updates), entry.say).toEqual([])
    }
  })

  // index.ts reads the learned forms from learned.json instead of running the language layer on every sentence.
  it('keeps learned.json the same as the language layer (remake it with: npx vitest run src/ai/understanding/bank --update)', async () => {
    const changed = BANK.filter((entry) => learnable(entry.say) !== prepare(entry.say))
      .map((entry) => [sentenceKey(entry.say), learnable(entry.say)])
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    await expect(`${JSON.stringify(Object.fromEntries(changed), null, 1)}
`).toMatchFileSnapshot('./learned.json')
    for (const entry of BANK) expect(learned(entry), entry.say).toBe(learnable(entry.say))
  })

  it('gives every label a screen allows at least one training sentence there', () => {
    for (const screen of screens) {
      const trained = new Set(trainingFor(screen).map((entry) => entry.label))
      for (const label of SCREEN_LABELS[screen]) expect(trained.has(label), `${label} @${screen}`).toBe(true)
    }
  })

  // A "none" sentence a screen's own rules would act on is not "none" at all, and the matcher would never see it.
  it('keeps every none sentence away from every screen’s commands and Act 2’s routes', () => {
    for (const entry of NONE_BANK) {
      const text = understandThai(entry.say).text
      for (const [screen, keys] of Object.entries(SCREEN_COMMANDS)) {
        expect(matchCommand(text, keys.map((id) => ({ id, phrases: SAY[id] }))), `${entry.say} @${screen}`).toBeNull()
      }
      expect(act2Route(text), entry.say).toBeNull()
    }
  })
})

describe('bank size (spec D1 §5)', () => {
  it('has at least 3,000 sentences, 600 in each region, 70% written by hand and 300 that mean nothing', () => {
    expect(BANK.length).toBeGreaterThanOrEqual(3000)
    for (const region of REGIONS) expect(BANK.filter((entry) => entry.region === region).length, region).toBeGreaterThanOrEqual(600)
    expect(WRITTEN.length).toBeGreaterThanOrEqual(0.7 * BANK.length)
    expect(BANK.filter((entry) => entry.label === 'none').length).toBeGreaterThanOrEqual(300)
  })

  it('meets every label’s hand-written minimum in every region', () => {
    for (const label of new Set(Object.values(SCREEN_LABELS).flat())) {
      for (const region of REGIONS) {
        const count = WRITTEN.filter((entry) => entry.label === label && entry.region === region).length
        expect(count, `${label} ${region}`).toBeGreaterThanOrEqual(minimumFor(label))
      }
    }
  })

  it('keeps templates at 30% or less, training only, and never a copy of a held-out sentence', () => {
    expect(TEMPLATE_BANK.length).toBeLessThanOrEqual(0.3 * BANK.length)
    expect(TEMPLATE_BANK.every((entry) => entry.source === 'template' && !isHeldOut(entry))).toBe(true)
    const tested = new Set(BANK.filter(isHeldOut).map(learned))
    for (const entry of TEMPLATE_BANK) expect(tested.has(learned(entry)), entry.say).toBe(false)
  })
})

