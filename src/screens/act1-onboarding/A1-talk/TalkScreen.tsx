import { Keyboard } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { extractProfile } from '@/ai/onboarding/extractProfile.ts'
import { pickFollowUp } from '@/ai/onboarding/followUp.ts'
import { countHeard, isReadyForReview, PROFILE_FIELDS } from '@/ai/onboarding/profile.ts'
import { useJourney } from '@/app/journey/JourneyContext.ts'
import { MIC_LABELS } from '@/components/assistant/companionState.ts'
import { CompanionDock } from '@/components/assistant/CompanionDock.tsx'
import { TranscriptBubble } from '@/components/assistant/TranscriptBubble.tsx'
import { useVoiceInput } from '@/components/assistant/useVoiceInput.ts'
import { OnboardingShell } from '@/components/shell/OnboardingShell.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { Chip } from '@/components/ui/Chip.tsx'
import { th } from '@/copy/th.ts'
import { getAccount, getLandmarks } from '@/services/merchantApi.ts'
import type { FollowUpChip, ProfileUpdates } from '@/types/domain.ts'
import { LiveProfileChecklist } from './LiveProfileChecklist.tsx'
import { MenuItemList } from './MenuItemList.tsx'
import { TypeInstead } from './TypeInstead.tsx'

const DEVICE_LOCATION_CONFIDENCE = 0.7
const account = getAccount()
const landmarks = getLandmarks()

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

  const interpret = useCallback(
    (text: string) => {
      let updates = extractProfile(text, { expecting, landmarks })
      // Re-saying a dish after removing a wrong one (spec §7.2), whatever question is pending.
      if (Object.keys(updates).length === 0 && expecting !== 'menu' && menuHeard) {
        updates = extractProfile(text, { expecting: 'menu', landmarks })
      }
      record(updates)
      return Object.keys(updates).length > 0
    },
    [expecting, menuHeard, record],
  )
  const { mic, transcript, notice, setNotice, toggleMic, hear } = useVoiceInput(interpret)

  const onChip = (chip: FollowUpChip) => {
    switch (chip.kind) {
      case 'say':
        hear(chip.label)
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
      dock={
        <CompanionDock
          text={question ? question.text : th.onboarding.allHeard}
          notice={notice}
          hint={mic === 'error' ? undefined : MIC_LABELS[mic]}
          state={mic}
          onPress={toggleMic}
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
