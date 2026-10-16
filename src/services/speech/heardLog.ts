/**
 * What the recogniser heard, kept on this device only, for testers collecting real dialect speech (spec D3 §3).
 * Off unless turned on: open the app with `?heardlog` (or tick it in the demo panel); `?heardlog=off` turns it off.
 * Nothing here is ever sent anywhere; a tester downloads the file and shares it themselves.
 */

export type HeardOutcome = 'done' | 'asked' | 'offered' | 'lost'

export interface HeardTurn {
  at: string // ISO time
  screen: string | null
  said: string // the recogniser's words
  others: string[] // its other guesses
  fixed: string // after fixHeard, what the screen read
  outcome: HeardOutcome
}

const ON_KEY = 'grab.heardLog.on'
const LOG_KEY = 'grab.heardLog'
export const HEARD_LOG_MAX = 300
// 2/7 email and password: never kept, even if a password was said aloud.
const PRIVATE_SCREENS = new Set(['S2_ACCOUNT'])

const listeners = new Set<() => void>()
const changed = () => listeners.forEach((listener) => listener())

// Storage may be missing or blocked (private window, previews): then the log is simply off.
function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key)
    else window.localStorage.setItem(key, value)
  } catch {
    // Not kept: nothing else depends on it.
  }
}

export const heardLogOn = (): boolean => read(ON_KEY) === '1'

export function setHeardLogOn(on: boolean) {
  write(ON_KEY, on ? '1' : null)
  changed()
}

export function readHeardLog(): HeardTurn[] {
  try {
    const parsed: unknown = JSON.parse(read(LOG_KEY) ?? '[]')
    return Array.isArray(parsed) ? (parsed as HeardTurn[]) : []
  } catch {
    return []
  }
}

export function clearHeardLog() {
  write(LOG_KEY, null)
  changed()
}

/** Keeps one mic turn, newest last, the oldest dropped past the cap. Does nothing while the log is off. */
export function noteHeard(turn: Omit<HeardTurn, 'at'>, now: Date = new Date()) {
  if (!heardLogOn() || (turn.screen !== null && PRIVATE_SCREENS.has(turn.screen))) return
  write(LOG_KEY, JSON.stringify([...readHeardLog(), { at: now.toISOString(), ...turn }].slice(-HEARD_LOG_MAX)))
  changed()
}

/** `?heardlog` turns the log on, `?heardlog=off` (or `=0`) turns it off; anything else leaves it as it was. */
export function heardLogFromUrl(search: string) {
  const params = new URLSearchParams(search)
  if (!params.has('heardlog')) return
  setHeardLogOn(!['off', '0', 'false'].includes(params.get('heardlog') ?? ''))
}

/** Calls back whenever the log or its switch changes; returns the unsubscribe. */
export function onHeardLog(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Saves the log as a JSON file through the browser's own download. */
export function downloadHeardLog(now: Date = new Date()) {
  const blob = new Blob([JSON.stringify(readHeardLog(), null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `heard-${now.toISOString().slice(0, 16).replace(/[:T]/g, '-')}.json`
  link.click()
  URL.revokeObjectURL(url)
}
