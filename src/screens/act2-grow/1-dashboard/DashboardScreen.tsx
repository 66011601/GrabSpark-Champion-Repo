import { SkipForward } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from 'react'
import { matchCommand } from '@/ai/commands/matchCommand.ts'
import { backScript, matchButton, pressScript } from '@/ai/navigator/buttons.ts'
import { BACK_TIMES, findItem } from '@/ai/navigator/drafts.ts'
import { asksWhatToDo, GUIDE_TOPICS } from '@/ai/navigator/guide.ts'
import { asksToConfirm, CONTROLS, matchIntent } from '@/ai/navigator/matchIntent.ts'
import { matchOpen, openScript } from '@/ai/navigator/openPage.ts'
import { runScript, stepsFromHere, type RunnerIO, type Slots } from '@/ai/navigator/runner.ts'
import { SCRIPTS } from '@/ai/navigator/scripts.ts'
import { freshNav, INITIAL_NAV, type NavScreen, type NavState, type Script, type ScriptId, type SoldOutUntil } from '@/ai/navigator/types.ts'
import { useVoiceInput, type Interpret } from '@/components/assistant/useVoiceInput.ts'
import { AiHelperBar } from '@/components/grab/AiHelperBar.tsx'
import { NavCursor } from '@/components/navigator/NavCursor.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { th } from '@/copy/th.ts'
import { getMerchant } from '@/services/merchantApi.ts'
import { stopSpeaking } from '@/services/speech/textToSpeech.ts'
import { Boost } from './Boost.tsx'
import { Feedback } from './Feedback.tsx'
import { HomeGrid } from './HomeGrid.tsx'
import { Insights } from './Insights.tsx'
import { ItemMenu } from './ItemMenu.tsx'
import { PageScreen } from './PageScreen.tsx'
import type { PanelProps } from './props.ts'

const PANELS: Record<NavScreen, ComponentType<PanelProps>> = { HOME: HomeGrid, INSIGHTS: Insights, BOOST: Boost, MENU: ItemMenu, FEEDBACK: Feedback, PAGE: PageScreen }
const WHERE: Record<NavScreen, string> = { HOME: th.act2.home, INSIGHTS: th.act2.grid[7], BOOST: th.act2.grid[3], MENU: th.act2.grid[1], FEEDBACK: th.act2.grid[8], PAGE: '' }
const script = (id: ScriptId) => SCRIPTS.find((entry) => entry.id === id) as Script

// How long the cursor takes to arrive, to tap, and to settle. "ข้าม" / the S key makes all of these zero.
const SETTLE_MS = 500
const TRAVEL_MS = 800
const TAP_MS = 250

/**
 * Act 2: the GrabMerchant home, driven by voice. The owner asks, the runner plays a script (screen, cursor, tap, one spoken line),
 * and anything that would change the shop stops at a confirm bar that only a tap can press.
 */
export function DashboardScreen() {
  const shop = getMerchant()
  const [nav, setNav] = useState<NavState>(INITIAL_NAV)
  const [line, setLine] = useState<string>(th.act2.helper)
  const [highlight, setHighlight] = useState<string | null>(null)
  const [cursor, setCursor] = useState<{ target: string | null; taps: number }>({ target: null, taps: 0 })
  const [running, setRunning] = useState(false)
  const [heading, setHeading] = useState('') // where the current run ends up, for the banner
  const run = useRef<AbortController | null>(null)
  const fast = useRef(false)
  const wake = useRef<(() => void) | null>(null) // ends the wait in progress
  const lineDone = useRef<(() => void) | null>(null) // the helper bar finished saying the line
  const skipLine = useRef<(() => void) | null>(null)
  const askedWhich = useRef(false) // "เมนูไหนหมดคะ" is waiting for a dish name
  const [guide, setGuide] = useState<string | null>(null) // the tour: 'topics', or the id of the topic being told
  const navNow = useRef(nav)
  useEffect(() => {
    navNow.current = nav
  })

  const change = useCallback((patch: Partial<NavState>) => setNav((state) => ({ ...state, ...patch })), [])

  const wait = useCallback(
    (ms: number) =>
      new Promise<void>((resolve) => {
        if (fast.current) return resolve()
        const timer = setTimeout(resolve, ms)
        wake.current = () => {
          clearTimeout(timer)
          resolve()
        }
      }),
    [],
  )

  const io = useMemo<RunnerIO>(
    () => ({
      async go(step) {
        setLine('') // so the next line is spoken even when it is the same words
        setHighlight(null)
        setCursor((now) => ({ ...now, target: null }))
        change({ screen: step.screen })
        await wait(SETTLE_MS)
        if (step.target) {
          setCursor((now) => ({ ...now, target: step.target ?? null }))
          await wait(TRAVEL_MS)
          setCursor((now) => ({ ...now, taps: now.taps + 1 }))
          await wait(TAP_MS)
        }
        if (step.set) change(step.set)
        setHighlight(step.highlight ?? null)
      },
      say(text) {
        return new Promise<void>((resolve) => {
          // A line stays up long enough to read, even when the device cannot speak it.
          const readable = new Promise<void>((done) => setTimeout(done, fast.current ? 0 : Math.min(4000, 1200 + text.length * 35)))
          const finish = () => {
            lineDone.current = null
            skipLine.current = null
            resolve()
          }
          lineDone.current = () => void readable.then(finish)
          skipLine.current = finish
          setLine(text)
          if (fast.current) finish()
        })
      },
    }),
    [change, wait],
  )

  const stopRun = useCallback(() => {
    run.current?.abort()
    run.current = null
    stopSpeaking()
    setRunning(false)
    setCursor((now) => ({ ...now, target: null }))
  }, [])

  const start = useCallback(
    async (chosen: Script, slots: Slots = {}, fromHere = false) => {
      run.current?.abort()
      const mine = new AbortController()
      run.current = mine
      fast.current = false
      // A script starts from the home screen, unless the owner is already on the page it leads to; a button press
      // always starts from where the owner is.
      const steps = fromHere ? chosen.steps : stepsFromHere(chosen.steps, navNow.current)
      if (!fromHere && steps === chosen.steps) setNav(freshNav)
      setGuide(null)
      setHeading(chosen.title ?? WHERE[chosen.steps[chosen.steps.length - 1].screen])
      setRunning(true)
      await runScript({ ...chosen, steps }, io, mine.signal, slots)
      if (run.current !== mine) return // a newer run took over
      run.current = null
      setRunning(false)
      setCursor((now) => ({ ...now, target: null }))
    },
    [io],
  )

  const skip = useCallback(() => {
    if (!run.current) return
    fast.current = true
    stopSpeaking()
    wake.current?.()
    skipLine.current?.()
  }, [])

  const goHome = useCallback(() => {
    stopRun()
    setNav(freshNav)
    setHighlight(null)
    setLine(th.act2.helper)
  }, [stopRun])

  const pick = (until: SoldOutUntil) => {
    setNav((state) => (state.soldOut ? { ...state, soldOut: { ...state.soldOut, until } } : state))
    setLine(th.act2.soldOut.picked(BACK_TIMES.find((time) => time.id === until)?.label ?? ''))
  }

  const interpret: Interpret = (text) => {
    if (asksToConfirm(text)) return th.act2.confirm.byTap // only a tap on the confirm bar does that
    if (asksWhatToDo(text)) {
      setGuide('topics')
      setLine(th.act2.guide.ask)
      return true
    }
    setGuide(null)
    const control = matchCommand(text, CONTROLS)
    if (control === 'stop') {
      stopRun()
      return th.act2.stopped
    }
    if (control === 'home') {
      goHome()
      return true
    }
    if (control === 'back') {
      const back = backScript(nav)
      if (back) void start(back, {}, true)
      return true
    }
    const until = nav.soldOut && !nav.soldOut.until && nav.done !== 'soldOut' ? matchCommand(text, BACK_TIMES) : null
    if (until) {
      pick(until)
      return true
    }
    // "เปิดเมนู", "ไปที่ส่งด่วน": a plain open command for any of the 13 home items.
    const page = matchOpen(text)
    if (page) {
      askedWhich.current = false
      void start(openScript(page))
      return true
    }
    // "ส่งของข้ามสาขา", "แท็บรีวิว", "7 วัน": any button, pressed from wherever the owner is.
    const button = matchButton(text)
    if (button) {
      askedWhich.current = false
      void start(pressScript(button, nav), {}, true)
      return true
    }
    const id = matchIntent(text, SCRIPTS)
    if (id === 'soldOut' || (askedWhich.current && !id)) {
      const item = findItem(text, shop)
      if (!item) {
        askedWhich.current = true
        return th.act2.soldOut.which
      }
      askedWhich.current = false
      void start(script('soldOut'), { item: item.name, itemId: item.id })
      return true
    }
    if (!id) return false
    askedWhich.current = false
    void start(script(id))
    return true
  }

  const voice = useVoiceInput(interpret, { understanding: { screen: 'ACT2' } })

  // The merchant's confirm tap went through: say so, and drop any older notice.
  const { setNotice } = voice
  const announce = (said: string) => {
    setNotice(null)
    setLine(said)
  }

  // Pressing the mic while the AI is working means the owner wants to say something: stop and listen.
  useEffect(() => {
    if (voice.mic === 'listening' && run.current) stopRun()
  }, [voice.mic, stopRun])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement).tagName
      if (event.key.toLowerCase() === 's' && !event.ctrlKey && !event.metaKey && tag !== 'INPUT' && tag !== 'TEXTAREA') skip()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [skip])

  useEffect(
    () => () => {
      run.current?.abort()
    },
    [],
  )

  // The tour's buttons: first its topics, then one or two things to try for the topic picked.
  const told = GUIDE_TOPICS.find((topic) => topic.id === guide)
  const guideChoices =
    guide === 'topics'
      ? GUIDE_TOPICS.map((topic) => ({
          id: `guide:${topic.id}`,
          label: topic.label,
          onPress: () => {
            setGuide(topic.id)
            setLine(topic.intro)
          },
        }))
      : told
        ? [
            ...told.tries.map((phrase) => ({ id: `try:${phrase}`, label: th.act2.guide.tryIt(phrase), onPress: () => voice.hear(phrase) })),
            {
              id: 'guide:more',
              label: th.act2.guide.more,
              onPress: () => {
                setGuide('topics')
                setLine(th.act2.guide.ask)
              },
            },
          ]
        : []

  const Panel = PANELS[nav.screen]
  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <Panel nav={nav} highlight={highlight} change={change} ask={voice.hear} pick={pick} announce={announce} home={goHome} />
      {running && (
        <div className="flex items-center gap-3 px-4 pt-2">
          <p aria-live="polite" className="flex-1 font-bold text-action">
            {th.act2.banner(heading)}
          </p>
          <Button variant="secondary" aria-label={th.act2.skipHelp} icon={<SkipForward className="size-5" aria-hidden />} onClick={skip}>
            {th.act2.skip}
          </Button>
        </div>
      )}
      <div className="px-4 pt-2 pb-2">
        <AiHelperBar text={line} notice={voice.notice} mic={voice.mic} onAvatar={voice.toggleMic} onSpoken={() => lineDone.current?.()} choices={[...guideChoices, ...voice.choices]} />
      </div>
      <NavCursor target={cursor.target} taps={cursor.taps} />
    </div>
  )
}
