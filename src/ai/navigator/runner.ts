import type { NavState, Script, ScriptStep } from './types.ts'

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

/**
 * A script's steps from where the merchant already is. Scripts start on the home screen and tap their way in; when the
 * merchant is already on the page they lead to (the menu, for "หมูกรอบหมดแล้ว"), the walk there is skipped.
 * The same steps come back when the merchant is elsewhere.
 */
export function stepsFromHere(steps: ScriptStep[], nav: NavState): ScriptStep[] {
  if (nav.screen === 'HOME') return steps
  const arrive = steps.findIndex((step) => step.screen !== 'HOME')
  if (arrive <= 0) return steps
  const page = steps.slice(0, arrive).reduce<NavState['page'] | undefined>((chosen, step) => step.set?.page ?? chosen, undefined)
  const there = steps[arrive].screen === nav.screen && (nav.screen !== 'PAGE' || page === nav.page)
  return there ? steps.slice(arrive) : steps
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
