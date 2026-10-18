import { Camera, ClipboardPen, Mic, ScanLine, ShieldCheck, Signpost } from 'lucide-react'
import { useEffect, useState } from 'react'
import { matchCommand } from '@/ai/commands/matchCommand.ts'
import { SAY } from '@/ai/commands/phrases.ts'
import { useJourney } from '@/app/journey/JourneyContext.ts'
import { markSeen, shouldSpotlight } from '@/components/assistant/spotlight.ts'
import { useVoiceInput } from '@/components/assistant/useVoiceInput.ts'
import { AiHelperBar } from '@/components/grab/AiHelperBar.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { th } from '@/copy/th.ts'

const POINT_ICONS = [Mic, ScanLine, ShieldCheck]
const INTRO_ICONS = [Mic, ClipboardPen, Signpost, Camera]
const INTRO = {
  ...th.g0.intro,
  points: th.g0.intro.points.map((text, index) => ({ icon: INTRO_ICONS[index], text })),
}
const COMMANDS = [
  { id: 'register' as const, phrases: SAY.register },
  { id: 'login' as const, phrases: SAY.login },
]

/** The app's first screen, GrabMerchant style. */
export function G0Welcome() {
  const { dispatch } = useJourney()
  // She introduces herself once a visit: coming back here, she only asks again.
  const [introduce] = useState(() => shouldSpotlight(INTRO.hello))
  useEffect(() => markSeen(INTRO.hello), [])
  const { mic, notice, choices, toggleMic } = useVoiceInput(
    (text) => {
      const choice = matchCommand(text, COMMANDS)
      if (choice === 'register') dispatch({ type: 'GO', screen: 'S1_SERVICE' })
      if (choice === 'login') dispatch({ type: 'GO', screen: 'L1_LOGIN' })
      return choice !== null
    },
    { understanding: { screen: 'G0' } },
  )
  return (
    <>
      <main className="flex flex-1 flex-col overflow-y-auto">
        <div className="bg-action px-6 pt-14 pb-10 text-white">
          <p className="text-3xl font-bold tracking-tight">{th.g0.wordmark}</p>
          <h1 className="mt-8 animate-rise text-[2.25rem] leading-tight font-bold">
            {th.g0.headline}
            <br />
            {th.g0.headlineAccent}
          </h1>
        </div>
        <ul className="flex flex-col gap-3 px-6 pt-6">
          {th.g0.points.map((point, index) => {
            const Icon = POINT_ICONS[index]
            return (
              <li key={point} className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-ok-bg text-action">
                  <Icon className="size-5" aria-hidden />
                </span>
                {point}
              </li>
            )
          })}
        </ul>
      </main>
      <footer className="flex flex-col gap-3 px-4 pt-3 pb-4">
        <AiHelperBar text={th.g0.helper} intro={introduce ? INTRO : undefined} notice={notice} mic={mic} onAvatar={toggleMic} choices={choices} />
        <Button fullWidth onClick={() => dispatch({ type: 'GO', screen: 'S1_SERVICE' })}>
          {th.g0.register}
        </Button>
        <Button fullWidth variant="secondary" onClick={() => dispatch({ type: 'GO', screen: 'L1_LOGIN' })}>
          {th.g0.login}
        </Button>
      </footer>
    </>
  )
}
