import type { Script, ScriptStep } from './types.ts'

/** What the screen does for the runner. The runner itself can only ask; it holds no write access. */
export interface RunnerIO {
  go(step: ScriptStep): Promise<void> // show the screen, move the cursor, tap
  say(text: string): Promise<void> // speak and show one line; resolves when it is finished
}

export interface Slots {
  item?: string // "ข้าวหมูกรอบ"
  itemId?: string // "M04"
}

/** Puts the menu item the owner named into a step. Scripts without placeholders come back unchanged. */
export function fillSlots(step: ScriptStep, slots: Slots): ScriptStep {
  const json = JSON.stringify(step).replaceAll('{itemId}', slots.itemId ?? '').replaceAll('{item}', slots.item ?? '')
  return JSON.parse(json) as ScriptStep
}

/** Plays a script one step at a time. Resolves true when it reached the end, false when it was cancelled. */
export async function runScript(script: Script, io: RunnerIO, signal: AbortSignal, slots: Slots = {}): Promise<boolean> {
  const cancelled = new Promise<'cancelled'>((resolve) => signal.addEventListener('abort', () => resolve('cancelled'), { once: true }))
  const step = async (work: Promise<void>) => (await Promise.race([work, cancelled])) !== 'cancelled' && !signal.aborted
  for (const raw of script.steps) {
    if (signal.aborted) return false
    const next = fillSlots(raw, slots)
    if (!(await step(io.go(next)))) return false
    if (!(await step(io.say(next.say)))) return false
  }
  return !signal.aborted
}
