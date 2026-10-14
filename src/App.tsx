import { DemoPanel } from '@/app/demo/DemoPanel.tsx'
import { useJourney } from '@/app/journey/JourneyContext.ts'
import { JourneyProvider } from '@/app/journey/JourneyProvider.tsx'
import { DeviceFrame } from '@/components/shell/DeviceFrame.tsx'
import { DashboardScreen } from '@/screens/act2-grow/1-dashboard/DashboardScreen.tsx'
import { ActTransition } from '@/screens/ActTransition.tsx'
import { G0Welcome } from '@/screens/signup/G0Welcome.tsx'
import { L1Login } from '@/screens/signup/L1Login.tsx'
import { S1Service } from '@/screens/signup/S1Service.tsx'

// Temporary while Plan 1c rebuilds Act 1 screen by screen; Task 13 removes it.
function NotBuiltYet({ screen }: { screen: string }) {
  return <p className="m-auto p-6 text-center text-ink-muted">{screen}</p>
}

function ScreenSwitch() {
  const { state } = useJourney()
  switch (state.screen) {
    case 'G0_WELCOME':
      return <G0Welcome />
    case 'L1_LOGIN':
      return <L1Login key={state.runId} />
    case 'S1_SERVICE':
      return <S1Service />
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
