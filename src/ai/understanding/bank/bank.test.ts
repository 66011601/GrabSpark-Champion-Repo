import { describe, expect, it } from 'vitest'
import { SCREEN_LABELS } from '../labels.ts'
import { BANK, heldOutFor, isHeldOut, trainingFor } from './index.ts'
import type { ScreenId } from './types.ts'

const ALL_LABELS = new Set(['none', ...Object.values(SCREEN_LABELS).flat()])
const screens = Object.keys(SCREEN_LABELS) as ScreenId[]

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
})
