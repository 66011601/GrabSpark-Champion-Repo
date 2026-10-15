import { useCallback, useEffect, useRef, useState } from 'react'
import { cutAtEndWord } from '@/ai/commands/endWord.ts'
import { greetingFor, holdGreeting, takeGreeting } from '@/ai/language/greeting.ts'
import { noteRegion } from '@/ai/language/region.ts'
import { maskRude, understandThai } from '@/ai/language/understand.ts'
import type { ScreenId } from '@/ai/understanding/bank/types.ts'
import { labelName } from '@/ai/understanding/labelNames.ts'
import { blockedReply, canonicalPhrase, topicQuestion } from '@/ai/understanding/labels.ts'
import { matchOn } from '@/ai/understanding/load.ts'
import { demoBus } from '@/app/demo/demoBus.ts'
import { th } from '@/copy/th.ts'
import { earcon } from '@/services/speech/earcon.ts'
import { playScripted } from '@/services/speech/scripted.ts'
import { startListening, type ListenSession } from '@/services/speech/speechToText.ts'
import { isSpeaking, stopSpeaking } from '@/services/speech/textToSpeech.ts'
import type { Choice, MicState } from './companionState.ts'
import { createTurnGuard } from './turnGuard.ts'
import { noticeFor, type Reply } from './turnReply.ts'
import { answerPending, takeTurn, type Pending, type Turn } from './understandingStep.ts'

const THINKING_MS = 500
const RESUME_MS = 800

export type { Reply }

// The merchant's last turn was spoken, so the companion listens again once it has answered.
// Shared by every screen: a conversation carries on across them.
let handsFree = false

/**
 * One merchant turn at a time, from the mic or a scripted demo line.
 * `interpret` gets the final words and says whether it understood them. It also gets `isCurrent`:
 * after any `await` it must check that, and stop without touching the journey when it is false
 * (the screen was left, the demo was reset, or the merchant has said something newer).
 * With `autoListen`, the screen keeps the conversation going without another tap.
 */
export type Interpret = (text: string, isCurrent: () => boolean) => Reply | Promise<Reply>

export interface VoiceOptions {
  autoListen?: boolean
  /**
   * When the screen's rules do not understand a sentence, the matcher guesses what it meant on this screen.
   * `act` performs a label the screen's own way; without it the label's canonical phrase goes through `interpret`.
   */
  understanding?: { screen: ScreenId; act?: (label: string) => Reply | Promise<Reply> }
}

export function useVoiceInput(interpret: Interpret, { autoListen = false, understanding }: VoiceOptions = {}) {
  const [mic, setMicState] = useState<MicState>('idle')
  const [transcript, setTranscript] = useState<{ text: string; final: boolean } | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [choices, setChoices] = useState<Choice[]>([])
  const pending = useRef<Pending | null>(null)
  const micNow = useRef<MicState>('idle')
  const session = useRef<ListenSession | null>(null)
  const guard = useRef(createTurnGuard())
  const thinking = useRef<number | undefined>(undefined)
  const resuming = useRef<number | undefined>(undefined)
  const cancelScript = useRef<(() => void) | null>(null)
  const resume = useRef<() => void>(() => {})
  // Buttons call back into the hook; this ref lets `show` build them before those callbacks exist.
  const taps = useRef<{ answer: (answer: 'yes' | 'no') => void; run: (label: string) => void }>({ answer: () => {}, run: () => {} })
  // Screens pass a fresh `interpret` and options every render; always use the newest ones.
  const latestInterpret = useRef(interpret)
  const latestOptions = useRef(understanding)
  useEffect(() => {
    latestInterpret.current = interpret
    latestOptions.current = understanding
  })

  const setMic = useCallback((next: MicState) => {
    micNow.current = next
    setMicState(next)
  }, [])

  // Anything still in flight (thinking timer, scripted line, mic) must not touch the journey after we leave.
  useEffect(() => {
    const turns = guard.current
    turns.mount()
    return () => {
      turns.unmount()
      window.clearTimeout(thinking.current)
      window.clearTimeout(resuming.current)
      cancelScript.current?.()
      session.current?.stop()
    }
  }, [])

  // Performs a label: blocked ones get the tap-only line, topics ask their question, the rest replay their
  // canonical phrase through the screen's own rules (or the screen's own act, when it has one).
  const perform = useCallback(async (label: string, isCurrent: () => boolean): Promise<Reply> => {
    try {
      const blocked = blockedReply(label)
      if (blocked) return blocked
      const own = latestOptions.current?.act
      if (own) return await own(label)
      const question = topicQuestion(label)
      if (question) return question
      const phrase = canonicalPhrase(label)
      return phrase ? await latestInterpret.current(understandThai(phrase).text, isCurrent) : false
    } catch {
      return false
    }
  }, [])

  // The end of a turn: remember the question that is waiting, show its buttons, and say the reply.
  // The greeting is taken only here, where a notice is surely shown; a turn that left the screen keeps it waiting.
  const show = useCallback((turn: Turn) => {
    pending.current = turn.pending
    setChoices(
      turn.pending
        ? [
            { id: 'answer:yes', label: th.understanding.yes, onPress: () => taps.current.answer('yes') },
            { id: 'answer:no', label: th.understanding.no, onPress: () => taps.current.answer('no') },
          ]
        : turn.offers.map((label) => ({ id: label, label: labelName(label), onPress: () => taps.current.run(label) })),
    )
    setNotice(noticeFor(turn.reply, takeGreeting()))
  }, [])

  // A tap on a button is a turn of its own: it wins over anything still in flight.
  const tap = useCallback(
    async (work: (isCurrent: () => boolean) => Promise<Turn>) => {
      if (!guard.current.mounted()) return
      window.clearTimeout(resuming.current)
      stopSpeaking()
      const isCurrent = guard.current.begin()
      pending.current = null
      setChoices([])
      const turn = await work(isCurrent)
      if (isCurrent()) show(turn)
    },
    [show],
  )

  useEffect(() => {
    taps.current = {
      answer: (answer) => {
        const waiting = pending.current
        if (waiting) void tap((isCurrent) => answerPending(waiting, answer, (label) => perform(label, isCurrent)))
      },
      run: (label) => void tap(async (isCurrent) => ({ reply: await perform(label, isCurrent), pending: null, offers: [] })),
    }
  })

  // Every input path (mic, scripted demo line, chip, keyboard) ends here. The language layer comes first:
  // rude words out, dialect into central Thai, so every screen reads the same plain sentence.
  const hear = useCallback(
    (words: string) => {
      if (!guard.current.mounted()) return
      // A scripted or typed line may close with "จ้า" too, just like a spoken one.
      const said = cutAtEndWord(words).text || words
      const heard = understandThai(said)
      holdGreeting(greetingFor(noteRegion(heard.regionWords)))
      const isCurrent = guard.current.begin()
      setTranscript({ text: heard.shown, final: true })
      setMic('processing')
      window.clearTimeout(thinking.current)
      thinking.current = window.setTimeout(async () => {
        if (!isCurrent()) return
        // Interpreting may take a moment (looking a place up on the map, loading the bank); a newer turn wins.
        // In order: a question that is waiting, the screen's own rules, and only then the matcher's guess.
        const turn = await takeTurn({
          heard,
          pending: pending.current,
          screen: latestOptions.current?.screen ?? null,
          rules: (text) => latestInterpret.current(text, isCurrent),
          perform: (label) => perform(label, isCurrent),
          matchOn,
          isCurrent,
        })
        if (!isCurrent()) return
        show(turn)
        setMic('idle')
        // When the answer changed nothing the companion has nothing to say, so it just listens again.
        resuming.current = window.setTimeout(() => {
          if (!isSpeaking()) resume.current()
        }, RESUME_MS)
      }, THINKING_MS)
    },
    [perform, setMic, show],
  )

  // `auto`: the companion opened the mic itself, so silence is not worth a complaint.
  // A waiting question and its buttons stay through a mic turn: the merchant may be about to answer it.
  const listen = useCallback(
    (auto: boolean) => {
      stopSpeaking()
      window.clearTimeout(resuming.current)
      if (!auto) setNotice(null)
      setTranscript(null)
      setMic('listening')
      earcon('listen')
      session.current = startListening({
        onInterim: (text) => setTranscript({ text: maskRude(text), final: false }),
        onFinal: (text) => {
          handsFree = true
          earcon('heard')
          hear(text)
        },
        onError: (kind) => {
          handsFree = false
          if (kind === 'no-speech') {
            setMic('idle')
            if (!auto) setNotice(th.onboarding.notHeard)
            return
          }
          setMic('error')
          setNotice(kind === 'unsupported' ? th.mic.unsupported : th.mic.error)
        },
        onEnd: () => {
          if (micNow.current === 'listening') setMic('idle')
        },
      })
    },
    [hear, setMic],
  )

  useEffect(() => {
    resume.current = () => {
      if (autoListen && handsFree && guard.current.mounted() && micNow.current === 'idle') listen(true)
    }
  })

  /** Closes an open mic and ends the hands-free conversation (a sheet is about to speak over it). */
  const stop = useCallback(() => {
    if (micNow.current !== 'listening') return
    handsFree = false
    session.current?.stop()
  }, [])

  /** Press to talk (this also cuts the companion off mid-sentence); press again to stop. */
  const toggleMic = () => {
    if (micNow.current === 'listening') return stop()
    listen(false)
  }

  /** The companion finished saying its line. */
  const onSpoken = useCallback(() => resume.current(), [])

  useEffect(
    () =>
      demoBus.onSay((text) => {
        stopSpeaking()
        setNotice(null)
        setMic('listening')
        cancelScript.current?.()
        cancelScript.current = playScripted(text, (partial) => setTranscript({ text: maskRude(partial), final: false }), hear)
      }),
    [hear, setMic],
  )

  return { mic, transcript, notice, setNotice, choices, toggleMic, stop, hear, onSpoken }
}
