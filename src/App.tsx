import { DemoPanel } from '@/app/demo/DemoPanel.tsx'
import { useJourney } from '@/app/journey/JourneyContext.ts'
import { JourneyProvider } from '@/app/journey/JourneyProvider.tsx'
import { DeviceFrame } from '@/components/shell/DeviceFrame.tsx'
import { TalkScreen } from '@/screens/act1-onboarding/A1-talk/TalkScreen.tsx'
import { ReviewScreen } from '@/screens/act1-onboarding/A2-review/ReviewScreen.tsx'
import { WelcomeScreen } from '@/screens/register/R1-welcome/WelcomeScreen.tsx'
import { AccountScreen } from '@/screens/register/R2-account/AccountScreen.tsx'
import { StoreBasicsScreen } from '@/screens/register/R3-store/StoreBasicsScreen.tsx'
import { ScreenStub } from '@/screens/ScreenStub.tsx'

function ScreenSwitch() {
  const { state } = useJourney()
  if (state.screen === 'R1_WELCOME') return <WelcomeScreen />
  if (state.screen === 'R2_ACCOUNT') return <AccountScreen key={state.runId} />
  if (state.screen === 'R3_STORE') return <StoreBasicsScreen key={state.runId} />
  if (state.screen === 'A1_TALK') return <TalkScreen key={state.runId} />
  if (state.screen === 'A2_REVIEW') return <ReviewScreen />
  return <ScreenStub screen={state.screen} />
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
