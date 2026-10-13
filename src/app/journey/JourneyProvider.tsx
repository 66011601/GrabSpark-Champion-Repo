import { useMemo, useReducer, type ReactNode } from 'react'
import { JourneyContext } from './JourneyContext.ts'
import { initialJourney, journeyReducer } from './journeyMachine.ts'

export function JourneyProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(journeyReducer, undefined, initialJourney)
  const value = useMemo(() => ({ state, dispatch }), [state])
  return <JourneyContext value={value}>{children}</JourneyContext>
}
