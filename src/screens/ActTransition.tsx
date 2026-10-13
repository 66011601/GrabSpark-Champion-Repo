import { CalendarClock } from 'lucide-react'
import { useJourney } from '@/app/journey/JourneyContext.ts'
import { Button } from '@/components/ui/Button.tsx'
import { th } from '@/copy/th.ts'

/** "30 วันต่อมา…": the hand-off from Act 1 (sign-up) to Act 2 (growth). */
export function ActTransition() {
  const { dispatch } = useJourney()
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-action px-6 text-center text-white">
      <CalendarClock className="size-16" aria-hidden />
      <h1 className="text-money font-bold">{th.transition.title}</h1>
      <p className="text-lg">{th.transition.body}</p>
      <Button variant="secondary" onClick={() => dispatch({ type: 'GO', screen: 'G1_DASHBOARD' })}>
        {th.transition.cta}
      </Button>
    </div>
  )
}
