export type NavScreen = 'HOME' | 'INSIGHTS' | 'BOOST' | 'MENU' | 'FEEDBACK' | 'PAGE'

/** The 13 items on GrabMerchant's home. */
export type GridId = 'orders' | 'menu' | 'shop' | 'boost' | 'staff' | 'grabshop' | 'ai' | 'insights' | 'feedback' | 'cashier' | 'express' | 'smartlink' | 'help'
export type InsightsTab = 'overview' | 'sales' | 'trend'

/** A promotion the AI prepared. It stays a draft until the merchant taps the confirm bar. */
export interface PromoDraft {
  kind: 'promo'
  name: string
  itemIds: string[]
  normalPrice: number
  bundlePrice: number
  window: [string, string]
  days: number
  dailyCap: number
}

/** GrabMerchant's two choices when a dish is switched off. Null until the merchant answers. */
export type SoldOutUntil = 'today' | 'indefinite'

/** A dish switched off: 'today' comes back by itself tomorrow, 'indefinite' waits for the merchant. */
export interface SoldOutDraft {
  kind: 'soldOut'
  itemId: string
  until: SoldOutUntil | null
}

export type Draft = PromoDraft | SoldOutDraft

/** Everything the mock app shows. Scripts change it through `set`; they never write anywhere else. */
export interface NavState {
  screen: NavScreen
  page: GridId | null // which item 'PAGE' describes
  tab: InsightsTab
  period: 7 | 30
  compare: boolean
  rain: boolean
  promo: PromoDraft | null
  soldOut: SoldOutDraft | null
  negativeOnly: boolean
  lesson: boolean
  done: 'promo' | 'soldOut' | null
}

export const INITIAL_NAV: NavState = {
  screen: 'HOME',
  page: null,
  tab: 'overview',
  period: 30,
  compare: false,
  rain: false,
  promo: null,
  soldOut: null,
  negativeOnly: false,
  lesson: false,
  done: null,
}

export type ScriptId = 'sales' | 'forecast' | 'promo' | 'soldOut' | 'feedback'

export interface ScriptStep {
  screen: NavScreen
  target?: string // data-nav id the cursor moves to and taps
  highlight?: string // data-nav id outlined, not tapped
  set?: Partial<NavState> // what the tap changes
  say: string // one short line, spoken and shown in the helper bar
}

/** A feature script (ScriptId) or a plain "open this home item" one. */
export interface Script<Id extends string = ScriptId | `open-${GridId}`> {
  id: Id
  phrases: string[] // whole sentences, matched with matchCommand
  keywords: string[][] // a group matches when all its words are in the sentence
  not?: string[] // any of these rules the script out
  steps: ScriptStep[]
}
