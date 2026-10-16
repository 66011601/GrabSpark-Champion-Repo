import { useSyncExternalStore } from 'react'
import { heardLogOn, onHeardLog, readHeardLog } from '@/services/speech/heardLog.ts'

// One string per state, so React sees a change only when the switch or the count changes.
const snapshot = () => `${heardLogOn() ? 1 : 0}:${heardLogOn() ? readHeardLog().length : 0}`

/** Whether the heard log is on, and how many turns it holds. */
export function useHeardLog(): { on: boolean; count: number } {
  const [on, count] = useSyncExternalStore(onHeardLog, snapshot, () => '0:0').split(':')
  return { on: on === '1', count: Number(count) }
}
