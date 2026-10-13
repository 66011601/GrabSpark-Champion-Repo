import { CheckCircle2 } from 'lucide-react'
import { useJourney } from '@/app/journey/JourneyContext.ts'
import { CompanionDock } from '@/components/assistant/CompanionDock.tsx'
import { OnboardingShell } from '@/components/shell/OnboardingShell.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { th } from '@/copy/th.ts'
import { formatDuration } from '@/lib/format.ts'

export function SubmittedScreen() {
  const { state, dispatch } = useJourney()
  const { startedAt, submittedAt } = state
  const elapsed = startedAt !== null && submittedAt !== null ? formatDuration(submittedAt - startedAt) : null
  return (
    <OnboardingShell
      title={th.onboarding.title}
      dock={
        <CompanionDock
          text={th.submitted.dockLine}
          actions={
            <Button fullWidth onClick={() => dispatch({ type: 'GO', screen: 'TRANSITION' })}>
              {th.submitted.continue}
            </Button>
          }
        />
      }
    >
      <div className="flex flex-col items-center gap-3 pt-6 text-center">
        <CheckCircle2 className="size-24 animate-pop text-action" aria-hidden />
        <h2 className="text-2xl font-bold">{th.submitted.title}</h2>
        {elapsed && <p className="text-lg">{th.submitted.elapsed(elapsed)}</p>}
      </div>
      <section className="mt-8">
        <h3 className="mb-3 font-bold">{th.submitted.nextTitle}</h3>
        <ol className="flex flex-col gap-3">
          {th.submitted.steps.map((step, index) => (
            <li key={step} className="flex items-start gap-3">
              <span
                className={`flex size-9 shrink-0 items-center justify-center rounded-full font-bold ${index === 0 ? 'bg-action text-white' : 'bg-canvas text-ink-muted'}`}
              >
                {index + 1}
              </span>
              <span className="pt-1">
                {step}
                {index === 0 && <span className="ml-2 rounded-full bg-ok-bg px-2 text-sm text-action">{th.submitted.upNext}</span>}
              </span>
            </li>
          ))}
        </ol>
      </section>
    </OnboardingShell>
  )
}
