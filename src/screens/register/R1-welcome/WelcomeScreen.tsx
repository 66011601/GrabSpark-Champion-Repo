import { Clock, Mic, ShieldCheck, Store } from 'lucide-react'
import { matchCommand } from '@/ai/commands/matchCommand.ts'
import { SAY } from '@/ai/commands/phrases.ts'
import { useJourney } from '@/app/journey/JourneyContext.ts'
import { CompanionDock } from '@/components/assistant/CompanionDock.tsx'
import { MIC_LABELS } from '@/components/assistant/companionState.ts'
import { useVoiceInput } from '@/components/assistant/useVoiceInput.ts'
import { Button } from '@/components/ui/Button.tsx'
import { th } from '@/copy/th.ts'

const POINT_ICONS = [Mic, Clock, ShieldCheck]
const STAGGER_MS = 70

const delay = (step: number) => ({ animationDelay: `${step * STAGGER_MS}ms` })

const COMMANDS = [
  { id: 'register' as const, phrases: SAY.register },
  { id: 'login' as const, phrases: SAY.login },
]

export function WelcomeScreen() {
  const { dispatch } = useJourney()
  // Answering the companion's question out loud presses the matching button.
  const { mic, transcript, notice, toggleMic, onSpoken } = useVoiceInput(
    (text) => {
      const mode = matchCommand(text, COMMANDS)
      if (mode) dispatch({ type: 'CHOOSE_AUTH', mode })
      return mode !== null
    },
    { autoListen: true },
  )
  return (
    <>
      <main className="relative flex flex-1 flex-col overflow-y-auto">
        {/* A soft green wash with a dot grid, fading out before the buttons. */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-linear-to-b from-ok-bg to-surface" aria-hidden />
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(circle,var(--color-grab)_1.5px,transparent_1.5px)] [mask-image:linear-gradient(to_bottom,black,transparent)] bg-size-[22px_22px] opacity-30"
          aria-hidden
        />

        <div className="relative flex flex-1 flex-col px-5 pt-12 pb-2">
          <p className="flex animate-rise items-center gap-3 text-lg font-bold text-action">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-action text-white">
              <Store className="size-6" aria-hidden />
            </span>
            {th.companion.name}
          </p>

          <h1 className="mt-8 animate-rise text-[2.5rem] leading-[1.3] font-bold" style={delay(1)}>
            {th.welcome.headline}
            <br />
            <span className="text-action">{th.welcome.headlineAccent}</span>
          </h1>
          <p className="mt-3 animate-rise text-ink-muted" style={delay(2)}>
            {th.welcome.body}
          </p>

          <ul className="mt-6 flex flex-col gap-3">
            {th.welcome.points.map((point, index) => {
              const Icon = POINT_ICONS[index]
              return (
                <li key={point} className="flex animate-rise items-center gap-3" style={delay(3 + index)}>
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface text-action ring-1 ring-line">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  {point}
                </li>
              )
            })}
          </ul>

          <div className="mt-auto grid animate-rise grid-cols-2 gap-3 pt-8" style={delay(6)}>
            <Button onClick={() => dispatch({ type: 'CHOOSE_AUTH', mode: 'register' })}>{th.welcome.register}</Button>
            <Button variant="secondary" onClick={() => dispatch({ type: 'CHOOSE_AUTH', mode: 'login' })}>
              {th.welcome.login}
            </Button>
          </div>
        </div>
      </main>
      <CompanionDock
        bare
        text={th.welcome.bubble}
        notice={notice}
        hint={mic === 'error' ? undefined : MIC_LABELS[mic]}
        heard={transcript}
        state={mic}
        onPress={toggleMic}
        onSpoken={onSpoken}
      />
    </>
  )
}
