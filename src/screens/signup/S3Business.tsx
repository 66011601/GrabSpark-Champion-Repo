import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ComponentProps } from 'react'
import { matchCommand } from '@/ai/commands/matchCommand.ts'
import { SAY } from '@/ai/commands/phrases.ts'
import { DERIVED_CONFIDENCE, GPS_CONFIDENCE, LINK_CONFIDENCE, redraftAddress, withArea } from '@/ai/onboarding/addressFields.ts'
import { businessUpdates, STEP3_TALK } from '@/ai/onboarding/businessTalk.ts'
import { pickFollowUp } from '@/ai/onboarding/followUp.ts'
import { CATEGORY_LABELS } from '@/ai/onboarding/parsers/category.ts'
import { locationPhrase } from '@/ai/onboarding/parsers/locationPhrase.ts'
import { formatThaiAddress, parseThaiAddress } from '@/ai/onboarding/parsers/thaiAddress.ts'
import { stepStatus } from '@/ai/onboarding/steps.ts'
import { useJourney } from '@/app/journey/JourneyContext.ts'
import { TalkSheet } from '@/components/assistant/TalkSheet.tsx'
import { useVoiceInput } from '@/components/assistant/useVoiceInput.ts'
import { AiHelperBar } from '@/components/grab/AiHelperBar.tsx'
import { Field, Select } from '@/components/grab/Field.tsx'
import { fieldMark, needsAmber, TYPED } from '@/components/grab/fieldMarks.ts'
import { inputClass } from '@/components/grab/inputClass.ts'
import { problemText } from '@/components/grab/problemText.ts'
import { StepShell } from '@/components/grab/StepShell.tsx'
import type { PinSheet as PinSheetComponent } from '@/components/map/PinSheet.tsx' // type only: the code itself loads lazily
import { Button } from '@/components/ui/Button.tsx'
import { th } from '@/copy/th.ts'
import { getAccount, getLandmarks } from '@/services/merchantApi.ts'
import { COUNTRY_ZOOM, isInThailand, PIN_ZOOM, THAILAND_CENTER, type MapView } from '@/services/places/bounds.ts'
import { locateDevice, ROUGH_FIX_M } from '@/services/places/geolocation.ts'
import { readLink } from '@/services/places/linkCoords.ts'
import { getPlaces, type PlaceMatch, type PlaceSuggestion } from '@/services/places/places.ts'
import { loadAreas, loadedAreas, postcodeMismatch, type Area } from '@/services/places/thaiAddressDb.ts'
import type { ProfileFieldKey, ProfileUpdates, ThaiAddress } from '@/types/domain.ts'
import { AddressField } from './s3/AddressField.tsx'
import { LocationField } from './s3/LocationField.tsx'

type PinSheetProps = ComponentProps<typeof PinSheetComponent>

/** The pin sheet's code could not be fetched (offline, or a new version was deployed): say so and let the merchant close it. */
function PinSheetUnavailable({ onClose }: PinSheetProps) {
  return (
    <div role="dialog" aria-modal="true" aria-label={th.places.pinTitle} className="absolute inset-0 z-30 flex flex-col bg-surface">
      <div className="flex flex-col gap-4 p-4">
        <h2 className="text-lg font-bold">{th.places.pinTitle}</h2>
        <p className="rounded-xl bg-warn-bg p-3 text-base text-warn-ink">{th.places.mapFailed}</p>
        <Button fullWidth onClick={onClose}>
          {th.grab.close}
        </Button>
      </div>
    </div>
  )
}

const PinSheet = lazy(() =>
  import('@/components/map/PinSheet.tsx')
    .then((module) => ({ default: module.PinSheet }))
    .catch(() => ({ default: PinSheetUnavailable })),
)

const SUGGEST_AFTER_MS = 300
const account = getAccount()
const landmarks = getLandmarks()
const places = getPlaces()
const COMMANDS = [
  { id: 'next' as const, phrases: SAY.next },
  { id: 'back' as const, phrases: SAY.back },
  { id: 'typeInstead' as const, phrases: SAY.typeInstead },
  { id: 'here' as const, phrases: SAY.here },
  { id: 'pin' as const, phrases: SAY.pin },
]

/** The pin sheet while it is open: where it starts, and the sub-district the merchant picked to get there. */
type PinView = MapView & { area?: ThaiAddress }

const pointAt = (lat: number, lng: number) => ({ text: th.places.pinnedHere, lat, lng })

/** 3/7 ข้อมูลธุรกิจ: name, building/street, map pin, address and food type. Tell the companion, or type. */
export function S3Business() {
  const { state, dispatch } = useJourney()
  const { fields } = state.profile
  const [talking, setTalking] = useState(false)
  const [search, setSearch] = useState('')
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([])
  const [areas, setAreas] = useState<Area[] | null>(loadedAreas)
  const [placeNotice, setPlaceNotice] = useState<string | null>(null)
  const [pinView, setPinView] = useState<PinView | null>(null) // the pin sheet is open while set
  const [locating, setLocating] = useState(false)
  // Answers from the map and the phone arrive late: they read the newest profile, and only the newest action may apply.
  const latestProfile = useRef(state.profile)
  useEffect(() => {
    latestProfile.current = state.profile
  })
  const mounted = useRef(false)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  // The voice hook is declared below; its voice-turn closure reaches openPinAt, so it is read through a ref.
  const micStop = useRef<() => void>(() => {})
  const newest = useRef(0)
  const locatingNow = useRef(false)
  /** Starts a location action; the returned check says whether it is still the newest and the screen is still here. */
  const begin = () => {
    newest.current += 1
    const mine = newest.current
    return () => mounted.current && newest.current === mine
  }
  const question = useMemo(() => pickFollowUp(state.profile, STEP3_TALK, account), [state.profile])
  const status = stepStatus(state.profile, 3)

  // Close the talk sheet by itself once there is nothing left to ask (only on that change, so the merchant can reopen it).
  const [hadQuestion, setHadQuestion] = useState(question !== null)
  if (hadQuestion !== (question !== null)) {
    setHadQuestion(question !== null)
    if (question === null) setTalking(false)
  }

  // The Thai address data (sub-districts and postcodes) loads in the background the first time 3/7 opens.
  useEffect(() => {
    let current = true
    loadAreas()
      .then((loaded) => {
        if (current) setAreas(loaded)
      })
      .catch((problem: unknown) => console.warn('Thai address data did not load:', problem))
    return () => {
      current = false
    }
  }, [])

  const fill = (updates: ProfileUpdates) => {
    if (Object.keys(updates).length > 0) dispatch({ type: 'FILL', updates, at: Date.now() })
  }
  const type = (key: ProfileFieldKey) => (value: string) => {
    if (!value.trim()) return dispatch({ type: 'CLEAR_FIELD', field: key })
    fill({ [key]: { value, confidence: 1, heardFrom: TYPED } } as ProfileUpdates)
  }

  /** A new location from anywhere: the box drafts follow it unless the merchant wrote them. */
  const placeAt = (match: PlaceMatch, heardFrom: string, { sure = false, placedByMerchant = false } = {}) => {
    setPlaceNotice(null)
    fill({ location: { ...match, heardFrom }, ...redraftAddress(latestProfile.current, match.value, heardFrom, sure) })
    if (placedByMerchant) dispatch({ type: 'CONFIRM_FIELD', field: 'location' })
  }

  // The one way to open the pin sheet: the mic and the talk sheet step aside so nothing speaks over the map.
  const openPinAt = (view: PinView) => {
    micStop.current()
    setTalking(false)
    setPlaceNotice(null)
    setPinView(view)
  }
  const openPin = () => {
    const point = fields.location.value
    openPinAt(point ? { lat: point.lat, lng: point.lng, zoom: PIN_ZOOM } : { ...THAILAND_CENTER, zoom: COUNTRY_ZOOM })
  }

  const locateHere = async () => {
    if (locatingNow.current) return
    locatingNow.current = true
    setPlaceNotice(null)
    setLocating(true)
    const current = begin()
    try {
      const fix = await locateDevice()
      if (!current()) return
      if (typeof fix === 'string') return setPlaceNotice(th.places.gpsFailed)
      if (!isInThailand(fix.lat, fix.lng)) return setPlaceNotice(th.places.outsideThailand)
      const found = await places.reverse(fix.lat, fix.lng)
      if (!current()) return
      placeAt({ value: found?.value ?? pointAt(fix.lat, fix.lng), confidence: GPS_CONFIDENCE }, th.sources.gps)
      if (fix.accuracy > ROUGH_FIX_M) openPinAt({ lat: fix.lat, lng: fix.lng, zoom: PIN_ZOOM })
    } finally {
      locatingNow.current = false
      if (mounted.current) setLocating(false)
    }
  }

  /** A pasted or said map link (or "lat, lng"). False when the text is not one. */
  const takeLink = (text: string): boolean => {
    const link = readLink(text)
    if (!link) return false
    setSearch('')
    setPlaceNotice(null)
    const current = begin()
    if (link.kind === 'unreadable') {
      setPlaceNotice(th.places.linkUnreadable)
      return true
    }
    if (!isInThailand(link.lat, link.lng)) {
      setPlaceNotice(th.places.outsideThailand)
      return true
    }
    void places.reverse(link.lat, link.lng).then((found) => {
      if (current()) placeAt({ value: found?.value ?? pointAt(link.lat, link.lng), confidence: LINK_CONFIDENCE }, th.sources.link)
    })
    return true
  }

  // Offer places a moment after the merchant stops typing in the location search (never for a link).
  useEffect(() => {
    let current = true
    const waiting = window.setTimeout(async () => {
      const typed = search.trim()
      const found = typed && !readLink(typed) ? await places.suggest(typed) : []
      if (current) setSuggestions(found)
    }, SUGGEST_AFTER_MS)
    return () => {
      current = false
      window.clearTimeout(waiting)
    }
  }, [search, areas]) // `areas`: the sub-district rows appear as soon as the address data has loaded

  const pickPlace = async (suggestion: PlaceSuggestion) => {
    setSearch('')
    setSuggestions([])
    setPlaceNotice(null)
    const current = begin()
    const match = await places.pick(suggestion)
    if (!current()) return
    if (!match) return setPlaceNotice(th.places.notFound)
    if (suggestion.kind === 'area') {
      // A sub-district is not a shop: draft the address, then let the merchant place the pin.
      if (latestProfile.current.fields.address.status === 'empty') fill({ address: { value: match.value.address ?? match.value.text, confidence: DERIVED_CONFIDENCE, heardFrom: th.sources.map } })
      openPinAt({ lat: match.value.lat, lng: match.value.lng, zoom: match.zoom ?? PIN_ZOOM, area: suggestion.area })
      return
    }
    placeAt(match, th.sources.map, { sure: suggestion.kind === 'place' })
  }

  const searchNow = () => {
    const typed = search.trim()
    if (!typed || takeLink(typed)) return
    void pickPlace({ id: `search:${typed}`, kind: 'search', title: typed, subtitle: '', query: typed })
  }

  // A postcode from another province stops ต่อไป until the merchant fixes or confirms the address.
  const address = fields.address.value
  const wrongPostcode = areas && address && fields.address.status !== 'confirmed' ? postcodeMismatch(areas, address) : null
  const mismatch = wrongPostcode ? th.places.postcodeMismatch(wrongPostcode.postcode, wrongPostcode.actual, wrongPostcode.said) : null
  const canGoOn = status.valid && mismatch === null

  const { mic, transcript, notice, choices, toggleMic, stop, hear, onSpoken } = useVoiceInput(
    async (text, isCurrent) => {
      setPlaceNotice(null) // a new turn: an old map notice must not hide what the companion says now
      const command = matchCommand(text, COMMANDS)
      if (command === 'next') {
        if (canGoOn) dispatch({ type: 'NEXT' })
        else if (mismatch) return mismatch
        return true
      }
      if (command === 'back') {
        dispatch({ type: 'BACK' })
        return true
      }
      if (command === 'typeInstead') {
        setTalking(true)
        return true
      }
      if (command === 'here') {
        void locateHere()
        return true
      }
      if (command === 'pin') {
        openPin()
        return true
      }
      if (takeLink(text)) return true
      const expecting = question?.field ?? undefined
      const spoken = parseThaiAddress(text)
      const wantsPlace = expecting === 'location' || expecting === undefined || spoken !== null
      // OpenStreetMap does not understand house numbers or ต./อ./จ.: look a spoken address up by its plain area words.
      const areaWords = spoken ? [spoken.subdistrict, spoken.district, spoken.province].filter(Boolean).join(' ') : ''
      const phrase = spoken ? areaWords || formatThaiAddress(spoken) : wantsPlace ? locationPhrase(text, expecting === 'location') : null
      const found = phrase ? await places.find(phrase) : null
      if (!isCurrent()) return false // the screen was left or reset while the map was answering
      // The pin's own address gains the ตำบล and postcode that were said, when it is in the same district.
      const place = found && spoken ? { ...found, value: withArea(found.value, spoken) } : found
      const updates = businessUpdates(text, { expecting, landmarks, profile: latestProfile.current, place })
      if (phrase && !place && Object.keys(updates).length === 0) return th.places.notFound
      fill(updates)
      return Object.keys(updates).length > 0
    },
    { autoListen: talking && pinView === null, understanding: { screen: 'S3' } },
  )

  useEffect(() => {
    micStop.current = stop
  })
  const pressMic = () => {
    setPlaceNotice(null)
    toggleMic()
  }
  const line = question
    ? question.field === null
      ? th.s3.helperStart
      : question.text
    : (mismatch ?? (status.valid ? th.s3.helperDone : problemText(status.issues[0])))
  const amber = (key: ProfileFieldKey) => (needsAmber(fields[key]) ? () => dispatch({ type: 'CONFIRM_FIELD', field: key }) : null)
  // The sheet covers the helper bar, so the companion's yes / no and best-guess buttons ride along with the chips.
  const chips = (question?.chips ?? []).flatMap((chip) => {
    if (chip.kind === 'say') return [{ label: chip.label, onPress: () => hear(chip.label) }]
    if (chip.kind === 'useDeviceLocation') return [{ label: chip.label, onPress: () => void locateHere() }]
    if (chip.kind === 'pinOnMap') return [{ label: chip.label, onPress: openPin }]
    return []
  })
  const sheetChips = [...chips, ...choices.filter((choice) => !chips.some((chip) => chip.label === choice.label))]

  return (
    <StepShell
      step={3}
      title={th.s3.title}
      subtitle={th.s3.subtitle}
      onBack={() => dispatch({ type: 'BACK' })}
      footer={
        <>
          <AiHelperBar
            text={line}
            notice={placeNotice ?? notice}
            mic={mic}
            onAvatar={pressMic}
            onSpoken={onSpoken}
            choices={choices}
            action={{ kind: 'mic', label: th.s3.talk, onPress: () => setTalking(true) }}
          />
          <Button fullWidth disabled={!canGoOn} onClick={() => dispatch({ type: 'NEXT' })}>
            {th.common.next}
          </Button>
        </>
      }
    >
      <h2 className="text-lg font-bold">{th.s3.section}</h2>
      <Field id="s3-name" label={th.s3.storeName} required mark={fieldMark(fields.storeName)} onCheck={amber('storeName')}>
        <input id="s3-name" autoComplete="organization" value={fields.storeName.value ?? ''} onChange={(event) => type('storeName')(event.target.value)} className={inputClass()} />
      </Field>
      <Field id="s3-building" label={th.fields.building} required mark={fieldMark(fields.building)} onCheck={amber('building')}>
        <input id="s3-building" autoComplete="address-line1" value={fields.building.value ?? ''} onChange={(event) => type('building')(event.target.value)} className={inputClass()} />
      </Field>
      <LocationField
        field={fields.location}
        search={search}
        onSearch={(text) => {
          setPlaceNotice(null)
          setSearch(text)
        }}
        onPasteText={takeLink}
        onEnter={searchNow}
        suggestions={suggestions}
        live={places.live}
        locating={locating}
        onPick={(suggestion) => void pickPlace(suggestion)}
        onHere={() => void locateHere()}
        onPin={openPin}
        onConfirmPin={() => dispatch({ type: 'CONFIRM_FIELD', field: 'location' })}
        onClear={() => dispatch({ type: 'CLEAR_FIELD', field: 'location' })}
      />
      <AddressField field={fields.address} areas={areas} mismatch={mismatch} onType={type('address')} onCheck={mismatch ? () => dispatch({ type: 'CONFIRM_FIELD', field: 'address' }) : amber('address')} />
      <Field id="s3-category" label={th.fields.category} required mark={fieldMark(fields.category)} onCheck={amber('category')}>
        <Select
          id="s3-category"
          value={fields.category.value ?? ''}
          placeholder={th.s3.categoryPlaceholder}
          options={[...new Set([...CATEGORY_LABELS, ...(fields.category.value ? [fields.category.value] : [])])].map((label) => ({ value: label, label }))}
          onChange={type('category')}
        />
      </Field>

      <TalkSheet
        open={talking}
        onClose={() => setTalking(false)}
        question={placeNotice ?? notice ?? line}
        chips={sheetChips}
        transcript={transcript}
        mic={mic}
        onMic={pressMic}
        onType={hear}
      />
      {pinView && (
        <Suspense fallback={null}>
          <PinSheet
            open
            start={pinView}
            describe={(lat, lng) => places.reverse(lat, lng)}
            onLocate={async () => {
              const fix = await locateDevice()
              if (typeof fix === 'string') return null
              if (!isInThailand(fix.lat, fix.lng)) {
                setPlaceNotice(th.places.outsideThailand) // the sheet stays where it is rather than jump abroad
                return null
              }
              return fix
            }}
            onUse={(match) => {
              const { area } = pinView
              setPinView(null)
              begin() // the merchant's own pin beats any answer still on its way
              placeAt({ ...match, value: area ? withArea(match.value, area) : match.value }, th.sources.pin, { placedByMerchant: true })
            }}
            onClose={() => setPinView(null)}
          />
        </Suspense>
      )}
    </StepShell>
  )
}
