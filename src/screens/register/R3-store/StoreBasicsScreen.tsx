import { Sparkles } from 'lucide-react'
import { useCallback, useState } from 'react'
import { extractProfile } from '@/ai/onboarding/extractProfile.ts'
import { parseBuilding } from '@/ai/onboarding/parsers/building.ts'
import { parseLocation } from '@/ai/onboarding/parsers/location.ts'
import { useJourney } from '@/app/journey/JourneyContext.ts'
import { MIC_LABELS } from '@/components/assistant/companionState.ts'
import { CompanionDock } from '@/components/assistant/CompanionDock.tsx'
import { TranscriptBubble } from '@/components/assistant/TranscriptBubble.tsx'
import { useVoiceInput } from '@/components/assistant/useVoiceInput.ts'
import { OnboardingShell } from '@/components/shell/OnboardingShell.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { TextField } from '@/components/ui/TextField.tsx'
import { th } from '@/copy/th.ts'
import { getAccount, getLandmarks } from '@/services/merchantApi.ts'
import type { ProfileUpdates } from '@/types/domain.ts'

// A typed address we cannot place on the map starts from the phone's position; the merchant fixes the pin in A2.
const UNPLACED_ADDRESS_CONFIDENCE = 0.5
const account = getAccount()
const landmarks = getLandmarks()

type BasicsField = 'storeName' | 'building' | 'location'

/** The mark at the end of each box: grey while the companion can still fill it, green once it has. */
function FillMark({ filled }: { filled: boolean }) {
  return (
    <span
      key={String(filled)}
      className={`mr-1.5 flex size-9 items-center justify-center rounded-full ${filled ? 'animate-pop bg-action text-white' : 'text-field'}`}
    >
      <Sparkles className="size-5" aria-hidden />
      <span className="sr-only">{filled ? th.store.filledByCompanion : th.store.canSpeak}</span>
    </span>
  )
}

/** Store name, building and address: say them to the companion, or type them. Nothing is saved until "ต่อไป". */
export function StoreBasicsScreen() {
  const { state, dispatch } = useJourney()
  const { fields } = state.profile
  const [storeName, setStoreName] = useState(fields.storeName.value ?? '')
  const [building, setBuilding] = useState(state.building ?? '')
  const [location, setLocation] = useState(fields.location.value?.text ?? '')
  const [heard, setHeard] = useState<ProfileUpdates>({})
  const [filled, setFilled] = useState<BasicsField[]>([])
  const [asked, setAsked] = useState(false)

  const missing: BasicsField | null = !storeName.trim() ? 'storeName' : !location.trim() ? 'location' : null
  // Once the companion has asked for one thing, a bare answer ("ครัวป้าแดง") is that thing.
  const expecting = asked && missing ? missing : undefined

  const interpret = useCallback(
    (text: string) => {
      setAsked(true)
      const heardBuilding = parseBuilding(text)
      let updates = extractProfile(text, { landmarks })
      if (Object.keys(updates).length === 0 && !heardBuilding && expecting) updates = extractProfile(text, { expecting, landmarks })
      if (Object.keys(updates).length === 0 && !heardBuilding) return false

      const nowFilled: BasicsField[] = []
      if (updates.storeName) {
        setStoreName(updates.storeName.value)
        nowFilled.push('storeName')
      }
      if (updates.location) {
        setLocation(updates.location.value.text)
        nowFilled.push('location')
      }
      if (heardBuilding) {
        setBuilding(heardBuilding.value)
        nowFilled.push('building')
      }
      setHeard((before) => ({ ...before, ...updates }))
      setFilled((before) => [...new Set([...before, ...nowFilled])])
      return true
    },
    [expecting],
  )
  const { mic, transcript, notice, toggleMic } = useVoiceInput(interpret)

  const type = (field: BasicsField, set: (value: string) => void) => (value: string) => {
    set(value)
    setFilled((before) => before.filter((key) => key !== field))
  }

  const finish = () => {
    const updates: ProfileUpdates = { ...heard }
    const name = storeName.trim()
    const place = location.trim()
    if (name !== (heard.storeName?.value ?? fields.storeName.value)) {
      updates.storeName = { value: name, confidence: 1, heardFrom: th.store.typed }
    }
    if (place !== (heard.location?.value.text ?? fields.location.value?.text)) {
      const found = parseLocation(place, landmarks)
      updates.location = {
        value: { ...(found?.value ?? account.deviceLocation), text: place },
        confidence: found?.confidence ?? UNPLACED_ADDRESS_CONFIDENCE,
        heardFrom: th.store.typed,
      }
    }
    dispatch({ type: 'STORE_BASICS', updates, building: building.trim() || null, at: Date.now() })
  }

  const untouched = !asked && !storeName && !location
  const bubble = untouched
    ? th.store.bubbleOpen
    : missing === 'storeName'
      ? th.followUp.storeName
      : missing === 'location'
        ? th.followUp.location
        : th.store.bubbleDone

  return (
    <OnboardingShell
      title={th.store.title}
      progress={th.common.step(2, 2)}
      onBack={() => dispatch({ type: 'GO', screen: 'R2_ACCOUNT' })}
      dock={
        <CompanionDock
          text={bubble}
          notice={notice}
          hint={mic === 'error' ? undefined : mic === 'idle' && untouched ? th.store.example : MIC_LABELS[mic]}
          state={mic}
          onPress={toggleMic}
          actions={
            <Button fullWidth disabled={missing !== null} onClick={finish}>
              {th.common.next}
            </Button>
          }
        />
      }
    >
      <div className="flex flex-col gap-5">
        <TextField
          id="store-name"
          label={th.store.storeName}
          autoComplete="organization"
          value={storeName}
          onChange={(event) => type('storeName', setStoreName)(event.target.value)}
          trailing={<FillMark filled={filled.includes('storeName')} />}
        />
        <TextField
          id="store-building"
          label={th.store.building}
          optional={th.store.optional}
          autoComplete="off"
          value={building}
          onChange={(event) => type('building', setBuilding)(event.target.value)}
          trailing={<FillMark filled={filled.includes('building')} />}
        />
        <TextField
          id="store-location"
          label={th.store.location}
          hint={th.store.locationHint}
          autoComplete="street-address"
          value={location}
          onChange={(event) => type('location', setLocation)(event.target.value)}
          trailing={<FillMark filled={filled.includes('location')} />}
        />
        {transcript && <TranscriptBubble text={transcript.text} final={transcript.final} />}
      </div>
    </OnboardingShell>
  )
}
