import { Keyboard } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { matchCommand } from '@/ai/commands/matchCommand.ts'
import { SAY } from '@/ai/commands/phrases.ts'
import { extractProfile } from '@/ai/onboarding/extractProfile.ts'
import { locationPhrase } from '@/ai/onboarding/parsers/locationPhrase.ts'
import { pickFollowUp } from '@/ai/onboarding/followUp.ts'
import { countHeard, isReadyForReview, TALK_FIELDS } from '@/ai/onboarding/profile.ts'
import { useJourney } from '@/app/journey/JourneyContext.ts'
import { MIC_LABELS } from '@/components/assistant/companionState.ts'
import { CompanionDock } from '@/components/assistant/CompanionDock.tsx'
import { TranscriptBubble } from '@/components/assistant/TranscriptBubble.tsx'
import { useVoiceInput, type Reply } from '@/components/assistant/useVoiceInput.ts'
import { OnboardingShell } from '@/components/shell/OnboardingShell.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { Chip } from '@/components/ui/Chip.tsx'
import { th } from '@/copy/th.ts'
import { getAccount, getLandmarks } from '@/services/merchantApi.ts'
import { getPlaces } from '@/services/places/places.ts'
import type { FollowUpChip, ProfileUpdates } from '@/types/domain.ts'
import { LiveProfileChecklist } from './LiveProfileChecklist.tsx'
import { MenuItemList } from './MenuItemList.tsx'
import { TypeInstead } from './TypeInstead.tsx'

const DEVICE_LOCATION_CONFIDENCE = 0.7
const account = getAccount()
const landmarks = getLandmarks()
const places = getPlaces()
const COMMANDS = [
  { id: 'review' as const, phrases: SAY.review },
  { id: 'typeInstead' as const, phrases: SAY.typeInstead },
]

export function TalkScreen() {
  const { state, dispatch } = useJourney()
  const { profile } = state
  const question = useMemo(() => pickFollowUp(profile, account), [profile])
  const expecting = question?.field ?? undefined
  const [typing, setTyping] = useState(false)
  const menuHeard = profile.fields.menu.status !== 'empty'

  const record = useCallback(
    (updates: ProfileUpdates) => dispatch({ type: 'HEARD', updates, at: Date.now() }),
    [dispatch],
  )

  const ready = isReadyForReview(profile)
  const menu = profile.fields.menu.value

  const takeAccountPhone = () => record({ phone: { value: account.phone, confidence: 1, heardFrom: th.review.fromAccount } })
  const takeDeviceLocation = () =>
    record({ location: { value: account.deviceLocation, confidence: DEVICE_LOCATION_CONFIDENCE, heardFrom: th.chips.useDeviceLocation } })

  // Saying a chip's label, or a button's name, presses it. The reply is what the companion says back;
  // null means the words were not a command.
  const obey = (text: string): Reply | null => {
    const chips = (question?.chips ?? []).filter((chip) => chip.kind !== 'say')
    const chip = matchCommand(
      text,
      chips.map((option) => ({ id: option.kind, phrases: option.kind === 'useAccountPhone' ? [option.label, ...SAY.yes] : [option.label] })),
    )
    const command = chip ?? matchCommand(text, COMMANDS)
    switch (command) {
      case 'useAccountPhone':
        takeAccountPhone()
        return true
      case 'useDeviceLocation':
        takeDeviceLocation()
        return true
      case 'scanMenu':
        return th.onboarding.scanMenuToast
      case 'startMic':
        return th.followUp.sayPhone
      case 'typeInstead':
        setTyping(true)
        return true
      case 'review':
        if (!ready) return th.onboarding.notReady
        dispatch({ type: 'GO', screen: 'A2_REVIEW' })
        return true
      default:
        return null
    }
  }

  const { mic, transcript, notice, setNotice, toggleMic, hear, onSpoken } = useVoiceInput(
    async (text, isCurrent) => {
      const obeyed = obey(text)
      if (obeyed !== null) return obeyed
      let updates = extractProfile(text, { expecting, landmarks })
      // Re-saying a dish after removing a wrong one (spec §7.2), whatever question is pending.
      if (Object.keys(updates).length === 0 && expecting !== 'menu' && menuHeard) {
        updates = extractProfile(text, { expecting: 'menu', landmarks })
      }
      // With Google Maps connected, the words about where the shop is are looked up there (Thailand only).
      const wantsPlace = expecting === 'location' || (expecting === undefined && !updates.menu)
      const place = places.live && wantsPlace ? locationPhrase(text, expecting === 'location') : null
      if (place) {
        const match = await places.find(place)
        if (!isCurrent()) return false // the screen was left or reset while the map was answering
        if (match) updates = { ...updates, location: { ...match, heardFrom: text } }
        else if (Object.keys(updates).length === 0) return th.places.notFound
      }
      record(updates)
      return Object.keys(updates).length > 0
    },
    { autoListen: true },
  )

  const onChip = (chip: FollowUpChip) => {
    switch (chip.kind) {
      case 'say':
        hear(chip.label)
        break
      case 'startMic':
        toggleMic()
        break
      case 'useAccountPhone':
        takeAccountPhone()
        break
      case 'useDeviceLocation':
        takeDeviceLocation()
        break
      case 'scanMenu':
        setNotice(th.onboarding.scanMenuToast)
        break
    }
  }

  return (
    <OnboardingShell
      title={th.onboarding.title}
      progress={th.onboarding.progress(countHeard(profile), TALK_FIELDS.length)}
      dock={
        <CompanionDock
          text={question ? question.text : th.onboarding.allHeard}
          notice={notice}
          hint={mic === 'error' ? undefined : MIC_LABELS[mic]}
          state={mic}
          onPress={toggleMic}
          onSpoken={onSpoken}
          extras={
            question &&
            question.chips.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {question.chips.map((chip) => (
                  <Chip key={chip.label} onClick={() => onChip(chip)}>
                    {chip.label}
                  </Chip>
                ))}
              </div>
            )
          }
          actions={
            <div className="flex items-center gap-3">
              {!typing && (
                <Button
                  variant="ghost"
                  className={ready ? 'px-3!' : 'px-0!'}
                  aria-label={th.onboarding.typeInstead}
                  icon={<Keyboard className="size-6" aria-hidden />}
                  onClick={() => setTyping(true)}
                >
                  {!ready && th.onboarding.typeInstead}
                </Button>
              )}
              {ready && (
                <Button className="min-w-0 flex-1" onClick={() => dispatch({ type: 'GO', screen: 'A2_REVIEW' })}>
                  {th.onboarding.toReview}
                </Button>
              )}
            </div>
          }
        />
      }
    >
      <div className="flex flex-col gap-4">
        {question?.field === null && <p className="text-ink-muted">{th.onboarding.greeting}</p>}
        {typing && <TypeInstead onSend={hear} onClose={() => setTyping(false)} />}
        {transcript && <TranscriptBubble text={transcript.text} final={transcript.final} />}
        <LiveProfileChecklist profile={profile} />
        {menu && <MenuItemList items={menu} onRemove={(name) => dispatch({ type: 'REMOVE_MENU_ITEM', name })} />}
      </div>
    </OnboardingShell>
  )
}
