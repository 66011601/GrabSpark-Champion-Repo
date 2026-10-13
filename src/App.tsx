import { DemoPanel } from '@/app/demo/DemoPanel.tsx'
import { useJourney } from '@/app/journey/JourneyContext.ts'
import { JourneyProvider } from '@/app/journey/JourneyProvider.tsx'
import { DeviceFrame } from '@/components/shell/DeviceFrame.tsx'
import { TalkScreen } from '@/screens/act1-onboarding/A1-talk/TalkScreen.tsx'
import { ScreenStub } from '@/screens/ScreenStub.tsx'

function ScreenSwitch() {
  const { state } = useJourney()
  if (state.screen === 'A1_TALK') return <TalkScreen key={state.runId} />
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
