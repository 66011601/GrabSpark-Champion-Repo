import { Bell, CheckCircle2, ChevronRight, Circle, ClipboardList, Clock, Home, ReceiptText, User, UtensilsCrossed } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useJourney } from '@/app/journey/JourneyContext.ts'
import { useVoiceInput } from '@/components/assistant/useVoiceInput.ts'
import { AiHelperBar } from '@/components/grab/AiHelperBar.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { th } from '@/copy/th.ts'
import { formatDuration } from '@/lib/format.ts'

const NAV_ICONS = [Home, ReceiptText, UtensilsCrossed, User]

// Set when the merchant leaves Home for a task: coming back, the companion says what is left instead of its welcome.
let leftHome = false

/** Home after submitting: waiting for approval, and the two set-up tasks. */
export function H1Home() {
  const { state, dispatch } = useJourney()
  const { startedAt, submittedAt, setupDone } = state
  const allDone = setupDone.menu && setupDone.hours
  const [returning] = useState(() => leftHome)
  useEffect(
    () => () => {
      leftHome = true
    },
    [],
  )
  const helper = allDone
    ? th.h1.helperDone
    : setupDone.menu
      ? th.h1.helperMenuDone
      : setupDone.hours
        ? th.h1.helperHoursDone
        : returning
          ? th.h1.helperBack
          : th.h1.helper
  // A returning merchant who logs in has startedAt equal to submittedAt: there is no sign-up time to show.
  const elapsed = startedAt !== null && submittedAt !== null && submittedAt - startedAt > 0 ? formatDuration(submittedAt - startedAt) : null
  // Nothing here is understood by rules; the matcher's guess is acted on by opening the task it names.
  const { mic, notice, choices, toggleMic } = useVoiceInput(() => false, {
    understanding: {
      screen: 'H1',
      act: (label) => {
        if (label === 'task:menu') dispatch({ type: 'GO', screen: 'H2_MENU' })
        else if (label === 'task:hours') dispatch({ type: 'GO', screen: 'H3_HOURS' })
        else return false
        return true
      },
    },
  })
  const tasks = [
    { key: 'menu' as const, label: th.h1.menuTask, Icon: UtensilsCrossed, screen: 'H2_MENU' as const },
    { key: 'hours' as const, label: th.h1.hoursTask, Icon: Clock, screen: 'H3_HOURS' as const },
  ]
  return (
    <>
      <header className="flex min-h-14 items-center justify-between bg-action px-4 text-white">
        <p className="text-lg font-bold">{state.profile.fields.storeName.value ?? th.h1.heading}</p>
        <span className="flex size-12 items-center justify-center" title={th.h1.bell}>
          <Bell className="size-6" aria-hidden />
          <span className="sr-only">{th.h1.bell}</span>
        </span>
      </header>
      <main className="flex flex-1 flex-col gap-4 overflow-y-auto bg-canvas px-4 py-4">
        <section className="flex items-start gap-3 rounded-2xl bg-surface p-4 ring-1 ring-line">
          <ClipboardList className="mt-0.5 size-6 shrink-0 text-action" aria-hidden />
          <div>
            <h1 className="text-lg font-bold">{th.h1.status}</h1>
            <p className="text-base text-ink-muted">{th.h1.statusBody}</p>
            {elapsed && <p className="mt-1 text-base">{th.h1.elapsed(elapsed)}</p>}
          </div>
        </section>
        <section className={`rounded-2xl p-4 ring-1 ${allDone ? 'bg-ok-bg ring-action' : 'bg-surface ring-line'}`}>
          <h2 className="font-bold">{allDone ? th.h1.allDone : th.h1.tasksTitle}</h2>
          <ul className="mt-2 divide-y divide-line">
            {tasks.map(({ key, label, Icon, screen }) => (
              <li key={key}>
                <button type="button" onClick={() => dispatch({ type: 'GO', screen })} className="flex min-h-14 w-full cursor-pointer items-center gap-3 text-left">
                  <Icon className="size-6 shrink-0 text-action" aria-hidden />
                  <span className="flex-1">{label}</span>
                  {setupDone[key] ? <CheckCircle2 className="size-6 text-action" aria-hidden /> : <Circle className="size-6 text-line" aria-hidden />}
                  <ChevronRight className="size-5 text-ink-muted" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </section>
        {allDone && (
          <Button fullWidth onClick={() => dispatch({ type: 'GO', screen: 'TRANSITION' })}>
            {th.h1.continue}
          </Button>
        )}
      </main>
      <div className="px-4 pt-2">
        <AiHelperBar text={helper} notice={notice} mic={mic} onAvatar={toggleMic} choices={choices} />
      </div>
      <nav className="mt-2 grid grid-cols-4 border-t border-line bg-surface" aria-hidden>
        {th.h1.nav.map((label, index) => {
          const Icon = NAV_ICONS[index]
          return (
            <span key={label} className={`flex min-h-14 flex-col items-center justify-center text-sm ${index === 0 ? 'text-action' : 'text-ink-muted'}`}>
              <Icon className="size-5" />
              {label}
            </span>
          )
        })}
      </nav>
    </>
  )
}
