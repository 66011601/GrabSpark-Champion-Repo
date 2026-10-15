import { ACT2 } from '@/ai/language/corpus/act2.ts'
import { HOME } from '@/ai/language/corpus/home.ts'
import { SIGNUP } from '@/ai/language/corpus/signup.ts'
import type { FieldExpect, Utterance } from '@/ai/language/corpus/types.ts'
import type { BankEntry, ScreenId } from './types.ts'

const FIELD_TOPIC: Record<keyof FieldExpect, string> = {
  storeName: 'topic:storeName',
  category: 'topic:category',
  locationStartsWith: 'topic:location',
  addressIncludes: 'topic:address',
  buildingIncludes: 'topic:building',
  hours: 'topic:hours',
  menu: 'topic:menu',
}

function toEntry(utterance: Utterance): BankEntry | null {
  const base = { say: utterance.say, region: utterance.region, source: 'written' as const }
  const expected = utterance.expect
  if ('command' in expected) return expected.command ? { ...base, screens: [expected.screen as ScreenId], label: expected.command } : null
  if ('fields' in expected) {
    const named = Object.keys(expected.fields) as (keyof FieldExpect)[]
    return named.length === 1 ? { ...base, screens: [expected.step as ScreenId], label: FIELD_TOPIC[named[0]] } : null
  }
  if ('act2' in expected) {
    const label = expected.act2 === null ? 'none' : expected.act2 === 'confirm' ? 'act2:confirm' : expected.act2
    return { ...base, screens: ['ACT2'], label }
  }
  return null
}

/** The language layer's tested sentences, reused as training data (spec D1 §5). */
export const FROM_CORPUS: BankEntry[] = [...SIGNUP, ...HOME, ...ACT2].map(toEntry).filter((entry): entry is BankEntry => entry !== null)
