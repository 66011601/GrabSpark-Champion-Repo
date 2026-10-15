import type { Said } from '@/ai/language/corpus/types.ts'

/** Every screen that listens. ACT2 is the GrabMerchant home after "30 วันต่อมา…". */
export type ScreenId = 'G0' | 'S1' | 'S2_ACCOUNT' | 'S2_PHONE' | 'S3' | 'S4' | 'S5' | 'S6' | 'S7' | 'H1' | 'H2' | 'H3' | 'ACT2'

/** One sentence the matcher learns from: what a merchant said, where, and what they meant. */
export interface BankEntry {
  say: string
  region: Said
  screens: ScreenId[] | 'any' // 'any' for labels that mean the same everywhere (next, back, none)
  label: string
  source: 'written' | 'template'
}
