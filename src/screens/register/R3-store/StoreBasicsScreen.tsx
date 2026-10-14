import { Sparkles } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { matchCommand } from '@/ai/commands/matchCommand.ts'
import { SAY } from '@/ai/commands/phrases.ts'
import { extractProfile } from '@/ai/onboarding/extractProfile.ts'
import { parseBuilding } from '@/ai/onboarding/parsers/building.ts'
import { locationPhrase } from '@/ai/onboarding/parsers/locationPhrase.ts'
import { useJourney } from '@/app/journey/JourneyContext.ts'
import { MIC_LABELS } from '@/components/assistant/companionState.ts'
import { CompanionDock } from '@/components/assistant/CompanionDock.tsx'
import { TranscriptBubble } from '@/components/assistant/TranscriptBubble.tsx'
import { useVoiceInput } from '@/components/assistant/useVoiceInput.ts'
import { OnboardingShell } from '@/components/shell/OnboardingShell.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { PlaceSuggestions } from '@/components/ui/PlaceSuggestions.tsx'
import { TextField } from '@/components/ui/TextField.tsx'
import { th } from '@/copy/th.ts'
import { getAccount, getLandmarks } from '@/services/merchantApi.ts'
import { getPlaces, type PlaceSuggestion } from '@/services/places/places.ts'
import type { ProfileUpdates } from '@/types/domain.ts'

// A typed address the map cannot place starts from the phone's position; the merchant fixes the pin in A2.
const UNPLACED_ADDRESS_CONFIDENCE = 0.5
const SUGGEST_AFTER_MS = 300
const account = getAccount()
const landmarks = getLandmarks()
const places = getPlaces()
const COMMANDS = [
  { id: 'next' as const, phrases: SAY.next },
  { id: 'back' as const, phrases: SAY.back },
]

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
  const [typedPlace, setTypedPlace] = useState('') // what to look up on the map; empty once a place is chosen
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([])
  const [saving, setSaving] = useState(false)

  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const missing: BasicsField | null = !storeName.trim() ? 'storeName' : !location.trim() ? 'location' : null
  // Once the companion has asked for one thing, a bare answer ("ครัวป้าแดง") is that thing.
  const expecting = asked && missing ? missing : undefined

  // Offer places from the map a moment after the merchant stops typing the address.
  useEffect(() => {
    let current = true
    const waiting = window.setTimeout(async () => {
      const found = typedPlace ? await places.suggest(typedPlace) : []
      if (current) setSuggestions(found)
    }, SUGGEST_AFTER_MS)
    return () => {
      current = false
      window.clearTimeout(waiting)
    }
  }, [typedPlace])

  const markFilled = (keys: BasicsField[]) => setFilled((before) => [...new Set([...before, ...keys])])

  const pickPlace = async (suggestion: PlaceSuggestion) => {
    setTypedPlace('')
    const match = await places.pick(suggestion)
    if (!match) return
    setLocation(match.value.text)
    setHeard((before) => ({ ...before, location: { ...match, heardFrom: th.places.picked } }))
    markFilled(['location'])
  }

  // true = some box was filled; false = nothing understood; a string = the companion's reply.
  const fill = async (text: string, isCurrent: () => boolean) => {
    setAsked(true)
    const heardBuilding = parseBuilding(text)
    let updates = extractProfile(text, { landmarks })
    if (Object.keys(updates).length === 0 && !heardBuilding && expecting) updates = extractProfile(text, { expecting, landmarks })

    // With Google Maps connected, the words about where the shop is are looked up there (Thailand only).
    const place = places.live ? locationPhrase(text, expecting === 'location') : null
    if (place) {
      const match = await places.find(place)
      if (!isCurrent()) return false // the screen was left or reset while the map was answering
      if (match) updates = { ...updates, location: { ...match, heardFrom: text } }
      else if (Object.keys(updates).length === 0 && !heardBuilding) return th.places.notFound
    }
    if (Object.keys(updates).length === 0 && !heardBuilding) return false

    const nowFilled: BasicsField[] = []
    if (updates.storeName) {
      setStoreName(updates.storeName.value)
      nowFilled.push('storeName')
    }
    if (updates.location) {
      setLocation(updates.location.value.text)
      setTypedPlace('')
      nowFilled.push('location')
    }
    if (heardBuilding) {
      setBuilding(heardBuilding.value)
      nowFilled.push('building')
    }
    setHeard((before) => ({ ...before, ...updates }))
    markFilled(nowFilled)
    return true
  }

  const { mic, transcript, notice, toggleMic, onSpoken } = useVoiceInput(
    async (text, isCurrent) => {
      const command = matchCommand(text, COMMANDS)
      if (command === 'back') {
        dispatch({ type: 'GO', screen: 'R2_ACCOUNT' })
        return true
      }
      if (command === 'next') {
        if (missing) return th.store.notYet
        await finish(isCurrent)
        return true
      }
      return fill(text, isCurrent)
    },
    { autoListen: state.method !== 'type' },
  )

  const type = (field: BasicsField, set: (value: string) => void) => (value: string) => {
    set(value)
    setFilled((before) => before.filter((key) => key !== field))
    if (field === 'location') setTypedPlace(value.trim())
  }

  // `isCurrent`: false once the screen is gone (or a newer spoken turn began), so nothing is dispatched late.
  async function finish(isCurrent: () => boolean = () => mounted.current) {
    const updates: ProfileUpdates = { ...heard }
    const name = storeName.trim()
    const place = location.trim()
    if (name !== (heard.storeName?.value ?? fields.storeName.value)) {
      updates.storeName = { value: name, confidence: 1, heardFrom: th.store.typed }
    }
    // An address typed without choosing from the list is looked up once more before moving on.
    if (place !== (heard.location?.value.text ?? fields.location.value?.text)) {
      setSaving(true)
      const found = await places.find(place)
      if (!isCurrent()) {
        setSaving(false)
        return
      }
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
    ? state.method === 'type'
      ? th.store.bubbleOpenTyping
      : th.store.bubbleOpen
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
          onSpoken={onSpoken}
          actions={
            <Button fullWidth disabled={missing !== null} loading={saving} onClick={() => finish()}>
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
        <div className="flex flex-col gap-2">
          <TextField
            id="store-location"
            label={th.store.location}
            hint={th.store.locationHint}
            autoComplete="off"
            value={location}
            onChange={(event) => type('location', setLocation)(event.target.value)}
            trailing={<FillMark filled={filled.includes('location')} />}
          />
          <PlaceSuggestions suggestions={suggestions} live={places.live} onPick={pickPlace} />
        </div>
        {transcript && <TranscriptBubble text={transcript.text} final={transcript.final} />}
      </div>
    </OnboardingShell>
  )
}
