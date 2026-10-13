import { useJourney } from '@/app/journey/JourneyContext.ts'
import type { Screen } from '@/app/journey/journeyMachine.ts'
import { CompanionDock } from '@/components/assistant/CompanionDock.tsx'
import { OnboardingShell } from '@/components/shell/OnboardingShell.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { th } from '@/copy/th.ts'

const NEXT: Record<Screen, Screen> = {
  R1_WELCOME: 'R2_ACCOUNT',
  R2_ACCOUNT: 'R3_STORE',
  R3_STORE: 'A1_TALK',
  A1_TALK: 'A2_REVIEW',
  A2_REVIEW: 'A3_SUBMITTED',
  A3_SUBMITTED: 'TRANSITION',
  TRANSITION: 'G1_DASHBOARD',
  G1_DASHBOARD: 'R1_WELCOME',
}

export function ScreenStub({ screen }: { screen: Screen }) {
  const { dispatch } = useJourney()
  return (
    <OnboardingShell
      title={screen}
      dock={
        <CompanionDock
          text={th.act2Placeholder.body}
          actions={
            <Button fullWidth onClick={() => dispatch({ type: 'GO', screen: NEXT[screen] })}>{`→ ${NEXT[screen]}`}</Button>
          }
        />
      }
    >
      {null}
    </OnboardingShell>
  )
}
