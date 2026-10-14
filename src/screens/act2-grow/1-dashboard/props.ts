import type { NavState } from '@/ai/navigator/types.ts'

/** What every mock GrabMerchant screen gets from the host. The screens only show state and report the merchant's own taps. */
export interface PanelProps {
  nav: NavState
  highlight: string | null
  change: (patch: Partial<NavState>) => void // a tap changes what is shown
  ask: (sentence: string) => void // a chip says something as if it was spoken
  pick: (backAt: string) => void // the merchant chose when a sold-out dish comes back
  announce: (line: string) => void // the companion says what just happened
  home: () => void
}
