import { MapPin } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { matchCommand } from '@/ai/commands/matchCommand.ts'
import { SAY } from '@/ai/commands/phrases.ts'
import { addressFromLocation } from '@/ai/onboarding/addressFields.ts'
import { businessUpdates, STEP3_TALK } from '@/ai/onboarding/businessTalk.ts'
import { pickFollowUp } from '@/ai/onboarding/followUp.ts'
import { CATEGORY_LABELS } from '@/ai/onboarding/parsers/category.ts'
import { locationPhrase } from '@/ai/onboarding/parsers/locationPhrase.ts'
import { onlyEmptyFields } from '@/ai/onboarding/profile.ts'
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
import { Button } from '@/components/ui/Button.tsx'
import { MapPinConfirm } from '@/components/ui/MapPinConfirm.tsx'
import { PlaceSuggestions } from '@/components/ui/PlaceSuggestions.tsx'
import { th } from '@/copy/th.ts'
import { getAccount, getLandmarks } from '@/services/merchantApi.ts'
import { getPlaces, type PlaceSuggestion } from '@/services/places/places.ts'
import type { ProfileFieldKey, ProfileUpdates } from '@/types/domain.ts'

const SUGGEST_AFTER_MS = 300
const account = getAccount()
const landmarks = getLandmarks()
const places = getPlaces()
const COMMANDS = [
  { id: 'next' as const, phrases: SAY.next },
  { id: 'back' as const, phrases: SAY.back },
  { id: 'typeInstead' as const, phrases: SAY.typeInstead },
]

/** 3/7 ข้อมูลธุรกิจ: name, building/street, map pin, address and food type. Tell the companion, or type. */
export function S3Business() {
  const { state, dispatch } = useJourney()
  const { fields } = state.profile
  const [talking, setTalking] = useState(false)
  const [search, setSearch] = useState('')
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([])
  const question = useMemo(() => pickFollowUp(state.profile, STEP3_TALK, account), [state.profile])
  const status = stepStatus(state.profile, 3)

  // Close the talk sheet by itself once there is nothing left to ask (only on that change, so the merchant can reopen it).
  const [hadQuestion, setHadQuestion] = useState(question !== null)
  if (hadQuestion !== (question !== null)) {
    setHadQuestion(question !== null)
    if (question === null) setTalking(false)
  }

  const fill = (updates: ProfileUpdates) => {
    if (Object.keys(updates).length > 0) dispatch({ type: 'FILL', updates, at: Date.now() })
  }
  const type = (key: ProfileFieldKey) => (value: string) => {
    if (!value.trim()) return dispatch({ type: 'CLEAR_FIELD', field: key })
    fill({ [key]: { value, confidence: 1, heardFrom: TYPED } } as ProfileUpdates)
  }

  // Offer places a moment after the merchant stops typing in the location search.
  useEffect(() => {
    let current = true
    const waiting = window.setTimeout(async () => {
      const found = search.trim() ? await places.suggest(search.trim()) : []
      if (current) setSuggestions(found)
    }, SUGGEST_AFTER_MS)
    return () => {
      current = false
      window.clearTimeout(waiting)
    }
  }, [search])

  const pickPlace = async (suggestion: PlaceSuggestion) => {
    setSearch('')
    const match = await places.pick(suggestion)
    if (!match) return
    fill({ location: { ...match, heardFrom: th.sources.map }, ...onlyEmptyFields(state.profile, addressFromLocation(match.value, th.sources.map)) })
  }

  const { mic, transcript, notice, toggleMic, hear, onSpoken } = useVoiceInput(
    async (text, isCurrent) => {
      const command = matchCommand(text, COMMANDS)
      if (command === 'next') {
        dispatch({ type: 'NEXT' })
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
      const expecting = question?.field ?? undefined
      const wantsPlace = places.live && (expecting === 'location' || expecting === undefined)
      const phrase = wantsPlace ? locationPhrase(text, expecting === 'location') : null
      const place = phrase ? await places.find(phrase) : null
      if (!isCurrent()) return false // the screen was left or reset while the map was answering
      const updates = businessUpdates(text, { expecting, landmarks, profile: state.profile, place })
      if (phrase && !place && Object.keys(updates).length === 0) return th.places.notFound
      fill(updates)
      return Object.keys(updates).length > 0
    },
    { autoListen: talking },
  )

  const line = question ? (question.field === null ? th.s3.helperStart : question.text) : status.valid ? th.s3.helperDone : problemText(status.issues[0])
  const amber = (key: ProfileFieldKey) => (needsAmber(fields[key]) ? () => dispatch({ type: 'CONFIRM_FIELD', field: key }) : null)

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
            notice={notice}
            mic={mic}
            onAvatar={toggleMic}
            onSpoken={onSpoken}
            action={{ kind: 'mic', label: th.s3.talk, onPress: () => setTalking(true) }}
          />
          <Button fullWidth disabled={!status.valid} onClick={() => dispatch({ type: 'NEXT' })}>
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
      <Field id="s3-location" label={th.store.location} required mark={fieldMark(fields.location)} onCheck={amber('location')}>
        {fields.location.value ? (
          <div className="flex flex-col gap-2">
            <MapPinConfirm point={fields.location.value} />
            <div className="flex flex-wrap gap-2">
              {fields.location.needsPinCheck && (
                <Button variant="secondary" className="min-h-12!" icon={<MapPin className="size-5" aria-hidden />} onClick={() => dispatch({ type: 'CONFIRM_FIELD', field: 'location' })}>
                  {th.s3.pinConfirm}
                </Button>
              )}
              <Button variant="ghost" className="min-h-12! px-0!" onClick={() => dispatch({ type: 'CLEAR_FIELD', field: 'location' })}>
                {th.s3.pinChange}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="relative">
              <MapPin className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-action" aria-hidden />
              <input id="s3-location" autoComplete="off" placeholder={th.s3.locationPlaceholder} value={search} onChange={(event) => setSearch(event.target.value)} className={`${inputClass()} pl-11`} />
            </div>
            <PlaceSuggestions suggestions={suggestions} live={places.live} onPick={pickPlace} />
          </div>
        )}
      </Field>
      <Field id="s3-address" label={th.fields.address} required mark={fieldMark(fields.address)} onCheck={amber('address')}>
        <textarea id="s3-address" rows={2} value={fields.address.value ?? ''} onChange={(event) => type('address')(event.target.value)} className={`${inputClass()} py-3`} />
      </Field>
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
        question={line}
        chips={(question?.chips ?? []).filter((chip) => chip.kind === 'say').map((chip) => ({ label: chip.label, onPress: () => hear(chip.label) }))}
        transcript={transcript}
        mic={mic}
        onMic={toggleMic}
        onType={hear}
      />
    </StepShell>
  )
}
