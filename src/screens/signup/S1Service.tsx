import { Check, ChevronRight, ShoppingBasket, UtensilsCrossed } from 'lucide-react'
import { matchCommand } from '@/ai/commands/matchCommand.ts'
import { SAY } from '@/ai/commands/phrases.ts'
import { useJourney } from '@/app/journey/JourneyContext.ts'
import type { Service } from '@/app/journey/journeyMachine.ts'
import { useVoiceInput } from '@/components/assistant/useVoiceInput.ts'
import { AiHelperBar } from '@/components/grab/AiHelperBar.tsx'
import { StepShell } from '@/components/grab/StepShell.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { th } from '@/copy/th.ts'

const SERVICES: { id: Service; Icon: typeof UtensilsCrossed }[] = [
  { id: 'food', Icon: UtensilsCrossed },
  { id: 'mart', Icon: ShoppingBasket },
]
const COMMANDS = [
  { id: 'food' as const, phrases: SAY.food },
  { id: 'mart' as const, phrases: SAY.mart },
  { id: 'next' as const, phrases: SAY.next },
  { id: 'back' as const, phrases: SAY.back },
]

/** 1/7 เลือกบริการ. */
export function S1Service() {
  const { state, dispatch } = useJourney()
  const choose = (service: Service) => dispatch({ type: 'CHOOSE_SERVICE', service })
  const { mic, notice, choices, toggleMic, onSpoken } = useVoiceInput(
    (text) => {
      const command = matchCommand(text, COMMANDS)
      if (command === 'food' || command === 'mart') choose(command)
      if (command === 'next') dispatch({ type: 'NEXT' })
      if (command === 'back') dispatch({ type: 'BACK' })
      return command !== null
    },
    { autoListen: true, understanding: { screen: 'S1' } },
  )
  return (
    <StepShell
      step={1}
      title={th.s1.title}
      subtitle={th.s1.subtitle}
      onBack={() => dispatch({ type: 'BACK' })}
      footer={
        <>
          <AiHelperBar text={state.service === 'mart' ? th.s1.martNote : th.s1.helper} notice={notice} mic={mic} onAvatar={toggleMic} onSpoken={onSpoken} choices={choices} />
          <Button fullWidth disabled={!state.service} onClick={() => dispatch({ type: 'NEXT' })}>
            {th.common.next}
          </Button>
        </>
      }
    >
      <div role="radiogroup" aria-label={th.s1.title} className="flex flex-col gap-3">
        {SERVICES.map(({ id, Icon }) => {
          const chosen = state.service === id
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={chosen}
              onClick={() => choose(id)}
              className={`flex min-h-20 cursor-pointer items-center gap-4 rounded-2xl p-4 text-left ring-1 transition-colors ${chosen ? 'bg-ok-bg ring-2 ring-action' : 'bg-surface ring-line active:bg-canvas'}`}
            >
              <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-canvas text-action">
                <Icon className="size-7" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold">{th.s1[id].title}</span>
                <span className="block text-base text-ink-muted">{th.s1[id].body}</span>
              </span>
              {chosen ? <Check className="size-6 text-action" aria-hidden /> : <ChevronRight className="size-6 text-ink-muted" aria-hidden />}
            </button>
          )
        })}
      </div>
    </StepShell>
  )
}
