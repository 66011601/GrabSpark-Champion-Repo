import { DemoPanel } from '@/app/demo/DemoPanel.tsx'
import { useJourney } from '@/app/journey/JourneyContext.ts'
import { JourneyProvider } from '@/app/journey/JourneyProvider.tsx'
import { DeviceFrame } from '@/components/shell/DeviceFrame.tsx'
import { DashboardScreen } from '@/screens/act2-grow/1-dashboard/DashboardScreen.tsx'
import { ActTransition } from '@/screens/ActTransition.tsx'

// Temporary while Plan 1c rebuilds Act 1 screen by screen; Task 13 removes it.
function NotBuiltYet({ screen }: { screen: string }) {
  return <p className="m-auto p-6 text-center text-ink-muted">{screen}</p>
}

function ScreenSwitch() {
  const { state } = useJourney()
  switch (state.screen) {
    case 'TRANSITION':
      return <ActTransition />
    case 'G1_DASHBOARD':
      return <DashboardScreen />
    default:
      return <NotBuiltYet screen={state.screen} />
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
