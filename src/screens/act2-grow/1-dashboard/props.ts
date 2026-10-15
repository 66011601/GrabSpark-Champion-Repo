import type { NavState, SoldOutUntil } from '@/ai/navigator/types.ts'

/** What every mock GrabMerchant screen gets from the host. The screens only show state and report the merchant's own taps. */
export interface PanelProps {
  nav: NavState
  highlight: string | null
  change: (patch: Partial<NavState>) => void // a tap changes what is shown
  ask: (sentence: string) => void // a chip says something as if it was spoken
  pick: (until: SoldOutUntil) => void // the merchant chose how long a dish stays off
  announce: (line: string) => void // the companion says what just happened
  home: () => void
  line: string // what the companion is saying now, for a sheet that covers the helper bar
}
