export type NavScreen = 'HOME' | 'INSIGHTS' | 'BOOST' | 'MENU' | 'FEEDBACK' | 'PAGE'

/** The 13 items on GrabMerchant's home. */
export type GridId = 'orders' | 'menu' | 'shop' | 'boost' | 'staff' | 'grabshop' | 'ai' | 'insights' | 'feedback' | 'cashier' | 'express' | 'smartlink' | 'help'
export type InsightsTab = 'overview' | 'sales' | 'trend'
export type ReviewTab = 'reviews' | 'reports'

/** The mock pages behind the buttons on ออเดอร์, เพิ่มยอดขาย, พนักงาน, ส่งด่วน and Smart Link. */
export type SubId = 'orders-accept' | 'orders-history' | 'staff-add' | 'staff-accounts' | 'express-instant' | 'express-offline' | 'express-branch' | 'link-view' | 'link-copy' | 'link-share' | 'boost-ad' | 'boost-campaigns'

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
  sub: SubId | null // a mock page opened by a button on PAGE or BOOST
  tab: InsightsTab
  reviewTab: ReviewTab
  period: 7 | 30
  compare: boolean
  rain: boolean
  promo: PromoDraft | null
  soldOut: SoldOutDraft | null
  negativeOnly: boolean
  lesson: boolean
  done: 'promo' | 'soldOut' | null
  /** Dishes the merchant confirmed sold out, and until when. They stay off whatever screen the AI opens next. */
  off: Record<string, SoldOutUntil>
}

export const INITIAL_NAV: NavState = {
  screen: 'HOME',
  page: null,
  sub: null,
  tab: 'overview',
  reviewTab: 'reviews',
  period: 30,
  compare: false,
  rain: false,
  promo: null,
  soldOut: null,
  negativeOnly: false,
  lesson: false,
  done: null,
  off: {},
}

/** The home screen again, keeping what the merchant has confirmed (the dishes switched off). */
export const freshNav = (now: NavState): NavState => ({ ...INITIAL_NAV, off: now.off })

export type ScriptId = 'sales' | 'forecast' | 'promo' | 'soldOut' | 'feedback'

export interface ScriptStep {
  screen: NavScreen
  target?: string // data-nav id the cursor moves to and taps
  highlight?: string // data-nav id outlined, not tapped
  set?: Partial<NavState> // what the tap changes
  say: string // one short line, spoken and shown in the helper bar
}

/** A feature script (ScriptId), an "open this home item" one, or a button press. */
export interface Script<Id extends string = string> {
  id: Id
  title?: string // where the run ends up, for the banner
  phrases: string[] // whole sentences, matched with matchCommand
  keywords: string[][] // a group matches when all its words are in the sentence
  not?: string[] // any of these rules the script out
  steps: ScriptStep[]
}
