import { useJourney } from '@/app/journey/JourneyContext.ts'
import { JourneyProvider } from '@/app/journey/JourneyProvider.tsx'
import { DeviceFrame } from '@/components/shell/DeviceFrame.tsx'
import { ScreenStub } from '@/screens/ScreenStub.tsx'

function ScreenSwitch() {
  const { state } = useJourney()
  return <ScreenStub screen={state.screen} />
}

function App() {
  return (
    <JourneyProvider>
      <DeviceFrame>
        <ScreenSwitch />
      </DeviceFrame>
    </JourneyProvider>
  )
}

export default App
