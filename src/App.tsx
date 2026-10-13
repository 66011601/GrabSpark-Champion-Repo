import { DemoPanel } from '@/app/demo/DemoPanel.tsx'
import { useJourney } from '@/app/journey/JourneyContext.ts'
import { JourneyProvider } from '@/app/journey/JourneyProvider.tsx'
import { DeviceFrame } from '@/components/shell/DeviceFrame.tsx'
import { TalkScreen } from '@/screens/act1-onboarding/A1-talk/TalkScreen.tsx'
import { ReviewScreen } from '@/screens/act1-onboarding/A2-review/ReviewScreen.tsx'
import { SubmittedScreen } from '@/screens/act1-onboarding/A3-submitted/SubmittedScreen.tsx'
import { DashboardScreen } from '@/screens/act2-grow/1-dashboard/DashboardScreen.tsx'
import { ActTransition } from '@/screens/ActTransition.tsx'

function ScreenSwitch() {
  const { state } = useJourney()
  switch (state.screen) {
    case 'A1_TALK':
      return <TalkScreen key={state.runId} />
    case 'A2_REVIEW':
      return <ReviewScreen />
    case 'A3_SUBMITTED':
      return <SubmittedScreen />
    case 'TRANSITION':
      return <ActTransition />
    case 'G1_DASHBOARD':
      return <DashboardScreen />
  }
}

function App() {
  return (
    <JourneyProvider>
      <DeviceFrame side={<DemoPanel />}>
        <ScreenSwitch />
      </DeviceFrame>
    </JourneyProvider>
  )
}

export default App
