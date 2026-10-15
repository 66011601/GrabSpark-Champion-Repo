import type { SAY } from '@/ai/commands/phrases.ts'
import type { Region } from '@/ai/language/dialect.ts'
import type { ProfileFieldKey } from '@/types/domain.ts'

export type Said = 'central' | Region
export type SayKey = keyof typeof SAY
export type Screen = 'G0' | 'S1' | 'S2_ACCOUNT' | 'S2_PHONE' | 'S3' | 'S4' | 'S5' | 'S6' | 'S7' | 'H2' | 'H3'

/** What one sentence must do in the real system. */
export type Expect =
  | { screen: Screen; command: SayKey | null } // the screen's command list picks this (null = it must not be taken as a command)
  | { step: 'S3' | 'H2' | 'H3'; expecting?: ProfileFieldKey; fields: FieldExpect } // what the step's parser fills
  | { act2: string | null } // Act 2's route: 'confirm', 'control:back', 'open:menu', 'button:<id>', 'intent:sales', or null
  | { masked: boolean } // whether the transcript hides a rude word

export interface FieldExpect {
  storeName?: string
  category?: string
  locationStartsWith?: string
  addressIncludes?: string
  buildingIncludes?: string
  hours?: { open: string; close: string }
  menu?: { name: string; priceTHB: number }[] // each must be in the heard menu
}

/** One real merchant sentence. `knownGap` marks one the layer cannot rescue without editing Act 2 (reported, not failed). */
export interface Utterance {
  say: string
  region: Said
  expect: Expect
  knownGap?: string
}
