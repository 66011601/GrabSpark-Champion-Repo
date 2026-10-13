import { useJourney } from '@/app/journey/JourneyContext.ts'
import type { Screen } from '@/app/journey/journeyMachine.ts'
import { OnboardingShell } from '@/components/shell/OnboardingShell.tsx'
import { Button } from '@/components/ui/Button.tsx'

const NEXT: Record<Screen, Screen> = {
  A1_TALK: 'A2_REVIEW',
  A2_REVIEW: 'A3_SUBMITTED',
  A3_SUBMITTED: 'TRANSITION',
  TRANSITION: 'G1_DASHBOARD',
  G1_DASHBOARD: 'A1_TALK',
}

export function ScreenStub({ screen }: { screen: Screen }) {
  const { dispatch } = useJourney()
  return (
    <OnboardingShell title={screen}>
      <Button onClick={() => dispatch({ type: 'GO', screen: NEXT[screen] })}>{`→ ${NEXT[screen]}`}</Button>
    </OnboardingShell>
  )
}
