import { describe, expect, it } from 'vitest'
import { matchCommand } from '@/ai/commands/matchCommand.ts'
import { SAY } from '@/ai/commands/phrases.ts'
import { understandThai } from '@/ai/language/understand.ts'
import { matchButton } from '@/ai/navigator/buttons.ts'
import { asksToConfirm, CONTROLS, matchIntent } from '@/ai/navigator/matchIntent.ts'
import { matchOpen } from '@/ai/navigator/openPage.ts'
import { SCRIPTS } from '@/ai/navigator/scripts.ts'
import { businessUpdates } from '@/ai/onboarding/businessTalk.ts'
import { extractProfile } from '@/ai/onboarding/extractProfile.ts'
import { createEmptyProfile } from '@/ai/onboarding/profile.ts'
import { getLandmarks } from '@/services/merchantApi.ts'
import { ACT2 } from './act2.ts'
import { HOME } from './home.ts'
import { RUDE_CORPUS } from './rude.ts'
import { SCREEN_COMMANDS } from './screens.ts'
import { SIGNUP } from './signup.ts'
import type { Expect, Screen, Utterance } from './types.ts'

const landmarks = getLandmarks()
const ALL: Utterance[] = [...SIGNUP, ...HOME, ...ACT2, ...RUDE_CORPUS]

function commandOn(screen: keyof typeof SCREEN_COMMANDS, text: string) {
  return matchCommand(text, SCREEN_COMMANDS[screen].map((id) => ({ id, phrases: SAY[id] })))
}

/**
 * The route Act 2 takes for a sentence on its home screen, in DashboardScreen's own order. The sold-out time
 * question (BACK_TIMES) between control and open needs a pending sold-out draft, so it is left out here.
 */
function act2Route(text: string): string | null {
  if (asksToConfirm(text)) return 'confirm'
  const control = matchCommand(text, CONTROLS)
  if (control) return `control:${control}`
  const page = matchOpen(text)
  if (page) return `open:${page}`
  const button = matchButton(text)
  if (button) return `button:${button}`
  const intent = matchIntent(text, SCRIPTS)
  return intent ? `intent:${intent}` : null
}

function check(text: string, expected: Expect, shown: string) {
  if ('command' in expected) {
    expect(commandOn(expected.screen, text)).toBe(expected.command)
  } else if ('fields' in expected) {
    const updates =
      expected.step === 'S3'
        ? businessUpdates(text, { expecting: expected.expecting, landmarks, profile: createEmptyProfile() })
        : extractProfile(text, { expecting: expected.expecting, landmarks })
    const f = expected.fields
    if (f.storeName !== undefined) expect(updates.storeName?.value).toBe(f.storeName)
    if (f.category !== undefined) expect(updates.category?.value).toBe(f.category)
    if (f.locationStartsWith !== undefined) expect(updates.location?.value.text.startsWith(f.locationStartsWith)).toBe(true)
    if (f.addressIncludes !== undefined) expect(updates.address?.value).toContain(f.addressIncludes)
    if (f.buildingIncludes !== undefined) expect(updates.building?.value).toContain(f.buildingIncludes)
    if (f.hours !== undefined) expect(updates.hours?.value).toMatchObject(f.hours)
    if (f.menu !== undefined) for (const dish of f.menu) expect(updates.menu?.value).toContainEqual(expect.objectContaining(dish))
  } else if ('act2' in expected) {
    expect(act2Route(text)).toBe(expected.act2)
  } else if ('masked' in expected) {
    expect(shown.includes('***')).toBe(expected.masked)
  }
}

describe('sentence bank', () => {
  for (const utterance of ALL.filter((entry) => !entry.knownGap)) {
    it(`[${utterance.region}] ${utterance.say}`, () => {
      const heard = understandThai(utterance.say)
      if (utterance.region !== 'central') expect(heard.dialectWords, 'a dialect sentence must use at least one dialect word').toBeGreaterThan(0)
      check(heard.text, utterance.expect, heard.shown)
    })
  }
})

describe('known Act 2 gaps', () => {
  // A gap that starts passing should lose its mark, so the bank keeps checking it.
  for (const utterance of ALL.filter((entry) => entry.knownGap)) {
    it(`still fails: [${utterance.region}] ${utterance.say}`, () => {
      const heard = understandThai(utterance.say)
      expect(() => check(heard.text, utterance.expect, heard.shown)).toThrow()
    })
  }
})

describe('sentence bank size', () => {
  const count = (region: Utterance['region']) => ALL.filter((entry) => entry.region === region).length

  it('covers at least 300 sentences, 200 central and 40 per dialect', () => {
    expect(ALL.length).toBeGreaterThanOrEqual(300)
    expect(count('central')).toBeGreaterThanOrEqual(200)
    for (const region of ['isan', 'north', 'south'] as const) expect(count(region), region).toBeGreaterThanOrEqual(40)
    expect(RUDE_CORPUS.length).toBeGreaterThanOrEqual(30)
  })

  it('has a dialect sentence for every command on every listening screen', () => {
    const said = new Set(
      ALL.filter((entry) => entry.region !== 'central').flatMap((entry) =>
        'command' in entry.expect && entry.expect.command ? [`${entry.expect.screen}:${entry.expect.command}`] : [],
      ),
    )
    const missing = (Object.entries(SCREEN_COMMANDS) as [Screen, string[]][]).flatMap(([screen, ids]) =>
      ids.map((id) => `${screen}:${id}`).filter((key) => !said.has(key)),
    )
    expect(missing).toEqual([])
  })

  it('keeps known Act 2 gaps few and explained', () => {
    const gaps = ALL.filter((entry) => entry.knownGap)
    expect(gaps.length).toBeLessThanOrEqual(10)
    for (const gap of gaps) {
      expect('act2' in gap.expect, gap.say).toBe(true)
      expect(gap.knownGap?.length ?? 0, gap.say).toBeGreaterThan(10)
    }
  })
})
