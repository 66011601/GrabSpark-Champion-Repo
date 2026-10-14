import { describe, expect, it } from 'vitest'
import { matchCommand } from '@/ai/commands/matchCommand.ts'
import { SAY } from '@/ai/commands/phrases.ts'
import { businessUpdates } from '@/ai/onboarding/businessTalk.ts'
import { extractProfile } from '@/ai/onboarding/extractProfile.ts'
import { createEmptyProfile } from '@/ai/onboarding/profile.ts'
import { understandThai } from '@/ai/language/understand.ts'
import { getLandmarks } from '@/services/merchantApi.ts'
import { SCREEN_COMMANDS } from './screens.ts'
import { SIGNUP } from './signup.ts'
import type { Expect, Screen, Utterance } from './types.ts'

const landmarks = getLandmarks()
const ALL: Utterance[] = [...SIGNUP]

function commandOn(screen: keyof typeof SCREEN_COMMANDS, text: string) {
  return matchCommand(text, SCREEN_COMMANDS[screen].map((id) => ({ id, phrases: SAY[id] })))
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

describe('sentence bank coverage', () => {
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
})
