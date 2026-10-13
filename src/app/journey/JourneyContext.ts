import { createContext, useContext, type Dispatch } from 'react'
import type { JourneyEvent, JourneyState } from './journeyMachine.ts'

export interface JourneyContextValue {
  state: JourneyState
  dispatch: Dispatch<JourneyEvent>
}

export const JourneyContext = createContext<JourneyContextValue | null>(null)

export function useJourney(): JourneyContextValue {
  const value = useContext(JourneyContext)
  if (!value) throw new Error('useJourney must be used inside <JourneyProvider>')
  return value
}
