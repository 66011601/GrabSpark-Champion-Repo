import { Keyboard } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { extractProfile } from '@/ai/onboarding/extractProfile.ts'
import { pickFollowUp } from '@/ai/onboarding/followUp.ts'
import { countHeard, isReadyForReview, PROFILE_FIELDS } from '@/ai/onboarding/profile.ts'
import { demoBus } from '@/app/demo/demoBus.ts'
import { useJourney } from '@/app/journey/JourneyContext.ts'
import { CompanionBubble } from '@/components/assistant/CompanionBubble.tsx'
import { MicButton, type MicState } from '@/components/assistant/MicButton.tsx'
import { TranscriptBubble } from '@/components/assistant/TranscriptBubble.tsx'
import { OnboardingShell } from '@/components/shell/OnboardingShell.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { Chip } from '@/components/ui/Chip.tsx'
import { th } from '@/copy/th.ts'
import { getAccount, getLandmarks } from '@/services/merchantApi.ts'
import { playScripted } from '@/services/speech/scripted.ts'
import { startListening, type ListenSession } from '@/services/speech/speechToText.ts'
import type { FollowUpChip, ProfileUpdates } from '@/types/domain.ts'
import { LiveProfileChecklist } from './LiveProfileChecklist.tsx'
import { MenuItemList } from './MenuItemList.tsx'
import { TypeInstead } from './TypeInstead.tsx'

const THINKING_MS = 500
const DEVICE_LOCATION_CONFIDENCE = 0.7
const account = getAccount()
const landmarks = getLandmarks()

export function TalkScreen() {
  const { state, dispatch } = useJourney()
  const { profile } = state
  const question = useMemo(() => pickFollowUp(profile, account), [profile])
  const expecting = question?.field ?? undefined
  const [mic, setMic] = useState<MicState>('idle')
  const [transcript, setTranscript] = useState<{ text: string; final: boolean } | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [typing, setTyping] = useState(false)
  const session = useRef<ListenSession | null>(null)
  const mounted = useRef(true)
  const thinking = useRef<number | undefined>(undefined)
  const cancelScript = useRef<(() => void) | null>(null)
  const menuHeard = profile.fields.menu.status !== 'empty'

  // Anything still in flight (thinking timer, scripted line, mic) must not touch the journey after we leave.
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      window.clearTimeout(thinking.current)
      cancelScript.current?.()
      session.current?.stop()
    }
  }, [])

  const record = useCallback(
    (updates: ProfileUpdates) => dispatch({ type: 'HEARD', updates, at: Date.now() }),
    [dispatch],
  )

  // Every input path (mic, scripted demo line, chip, keyboard) ends here.
  const handleUtterance = useCallback(
    (text: string) => {
      if (!mounted.current) return
      setTranscript({ text, final: true })
      setMic('processing')
      window.clearTimeout(thinking.current)
      thinking.current = window.setTimeout(() => {
        if (!mounted.current) return
        let updates = extractProfile(text, { expecting, landmarks })
        // Re-saying a dish after removing a wrong one (spec §7.2), whatever question is pending.
        if (Object.keys(updates).length === 0 && expecting !== 'menu' && menuHeard) {
          updates = extractProfile(text, { expecting: 'menu', landmarks })
        }
        record(updates)
        setNotice(Object.keys(updates).length === 0 ? th.onboarding.notUnderstood : null)
        setMic('idle')
      }, THINKING_MS)
    },
    [expecting, menuHeard, record],
  )

  const toggleMic = () => {
    if (mic === 'listening') {
      session.current?.stop()
      return
    }
    setNotice(null)
    setTranscript(null)
    setMic('listening')
    session.current = startListening({
      onInterim: (text) => setTranscript({ text, final: false }),
      onFinal: handleUtterance,
      onError: (kind) => {
        if (kind === 'no-speech') {
          setMic('idle')
          setNotice(th.onboarding.notHeard)
          return
        }
        setMic('error')
        setNotice(kind === 'unsupported' ? th.mic.unsupported : th.mic.error)
      },
      onEnd: () => setMic((current) => (current === 'listening' ? 'idle' : current)),
    })
  }

  useEffect(
    () =>
      demoBus.onSay((text) => {
        setNotice(null)
        setMic('listening')
        cancelScript.current?.()
        cancelScript.current = playScripted(text, (partial) => setTranscript({ text: partial, final: false }), handleUtterance)
      }),
    [handleUtterance],
  )

  const onChip = (chip: FollowUpChip) => {
    switch (chip.kind) {
      case 'say':
        handleUtterance(chip.label)
        break
      case 'startMic':
        toggleMic()
        break
      case 'useAccountPhone':
        record({ phone: { value: account.phone, confidence: 1, heardFrom: th.review.fromAccount } })
        break
      case 'useDeviceLocation':
        record({ location: { value: account.deviceLocation, confidence: DEVICE_LOCATION_CONFIDENCE, heardFrom: th.chips.useDeviceLocation } })
        break
      case 'scanMenu':
        setNotice(th.onboarding.scanMenuToast)
        break
    }
  }

  const ready = isReadyForReview(profile)
  const menu = profile.fields.menu.value

  return (
    <OnboardingShell
      title={th.onboarding.title}
      progress={th.onboarding.progress(countHeard(profile), PROFILE_FIELDS.length)}
      footer={
        <div className="flex flex-col items-center gap-2">
          {ready && (
            <Button fullWidth onClick={() => dispatch({ type: 'GO', screen: 'A2_REVIEW' })}>
              {th.onboarding.toReview}
            </Button>
          )}
          <MicButton state={mic} onPress={toggleMic} compact={ready} />
          {!typing && (
            <Button variant="ghost" icon={<Keyboard className="size-5" aria-hidden />} onClick={() => setTyping(true)}>
              {th.onboarding.typeInstead}
            </Button>
          )}
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {question?.field === null && <CompanionBubble text={th.onboarding.greeting} />}
        <CompanionBubble text={question ? question.text : th.onboarding.allHeard} />
        {question && question.chips.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {question.chips.map((chip) => (
              <Chip key={chip.label} onClick={() => onChip(chip)}>
                {chip.label}
              </Chip>
            ))}
          </div>
        )}
        {transcript && <TranscriptBubble text={transcript.text} final={transcript.final} />}
        {notice && (
          <p role="status" className="rounded-2xl bg-warn-bg px-4 py-3 text-warn-ink">
            {notice}
          </p>
        )}
        {typing && <TypeInstead onSend={handleUtterance} onClose={() => setTyping(false)} />}
        <LiveProfileChecklist profile={profile} />
        {menu && <MenuItemList items={menu} onRemove={(name) => dispatch({ type: 'REMOVE_MENU_ITEM', name })} />}
      </div>
    </OnboardingShell>
  )
}
