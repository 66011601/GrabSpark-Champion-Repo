import { Camera, CheckCircle2, Upload } from 'lucide-react'
import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { matchCommand } from '@/ai/commands/matchCommand.ts'
import { SAY } from '@/ai/commands/phrases.ts'
import { scanToUpdates } from '@/ai/onboarding/documents/scanToUpdates.ts'
import { useJourney } from '@/app/journey/JourneyContext.ts'
import { CompanionDock } from '@/components/assistant/CompanionDock.tsx'
import { MIC_LABELS } from '@/components/assistant/companionState.ts'
import { useVoiceInput } from '@/components/assistant/useVoiceInput.ts'
import { OnboardingShell } from '@/components/shell/OnboardingShell.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { th } from '@/copy/th.ts'
import { readDocument } from '@/services/ocr/mockOcr.ts'
import type { ScanResult } from '@/types/domain.ts'
import { SampleDocument } from './SampleDocument.tsx'
import { scanLines, scanSummary } from './scanLines.ts'
import { ScanResults } from './ScanResults.tsx'
import { Viewfinder } from './Viewfinder.tsx'

type Phase = 'aim' | 'scanning' | 'read'

const COMMANDS = [
  { id: 'retake' as const, phrases: SAY.retake },
  { id: 'shoot' as const, phrases: SAY.shoot },
  { id: 'use' as const, phrases: SAY.useScan },
  { id: 'skip' as const, phrases: SAY.skip },
]

/**
 * One document at a time from the journey's scan queue (App keys this screen per document).
 * Reading only drafts: the values go to A2 as "heard" and the merchant confirms them there.
 */
export function ScanScreen() {
  const { state, dispatch } = useJourney()
  const plan = state.scan
  const doc = plan?.queue[0] ?? null
  const [phase, setPhase] = useState<Phase>('aim')
  const [result, setResult] = useState<ScanResult | null>(null)
  const [upload, setUpload] = useState<string | null>(null) // a local object URL; the file never leaves the browser
  const fileInput = useRef<HTMLInputElement>(null)

  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  useEffect(() => () => {
    if (upload) URL.revokeObjectURL(upload)
  }, [upload])

  const shoot = async () => {
    if (!doc || phase === 'scanning') return
    setPhase('scanning')
    setResult(null)
    const scan = await readDocument(doc)
    if (!mounted.current) return // the screen moved on (skip, demo jump or reset) while reading
    setResult(scan)
    setPhase('read')
  }
  const use = () => {
    if (doc && result) dispatch({ type: 'SCANNED', doc, updates: scanToUpdates(result), at: Date.now() })
  }
  const retake = () => {
    setResult(null)
    setPhase('aim')
  }
  const skip = () => {
    if (doc) dispatch({ type: 'SKIP_DOC', doc })
  }
  const onUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setUpload(URL.createObjectURL(file))
    void shoot()
  }

  // By voice: shoot, retake, use or skip. Numbers are never taken by ear.
  const { mic, transcript, notice, toggleMic, onSpoken } = useVoiceInput(
    (text) => {
      switch (matchCommand(text, COMMANDS)) {
        case 'shoot':
          if (phase !== 'aim') return false
          void shoot()
          return true
        case 'retake':
          if (phase === 'aim') return th.scan.shootFirst
          if (phase !== 'read') return false
          retake()
          return true
        case 'use':
          if (phase === 'aim') return th.scan.shootFirst
          if (phase !== 'read') return false
          use()
          return true
        case 'skip':
          skip()
          return true
        default:
          return false
      }
    },
    { autoListen: state.method === 'voice' },
  )

  if (!plan || !doc) return null

  const step = plan.docs.length - plan.queue.length + 1
  const bubble = phase === 'aim' ? th.scan.aim[doc] : phase === 'scanning' ? th.scan.reading : result ? scanSummary(result) : th.scan.aim[doc]

  return (
    <OnboardingShell
      title={th.scan.title}
      progress={th.common.step(step, plan.docs.length)}
      dock={
        <CompanionDock
          text={bubble}
          notice={notice}
          hint={phase === 'read' ? th.scan.checkHint : mic === 'error' ? undefined : MIC_LABELS[mic]}
          heard={transcript}
          state={mic}
          onPress={toggleMic}
          onSpoken={onSpoken}
          actions={
            phase === 'read' ? (
              <div className="flex gap-2">
                <Button variant="secondary" className="px-4!" onClick={retake}>
                  {th.scan.retake}
                </Button>
                <Button className="min-w-0 flex-1" onClick={use}>
                  {th.scan.use}
                </Button>
              </div>
            ) : (
              <Button fullWidth loading={phase === 'scanning'} icon={<Camera className="size-6" aria-hidden />} onClick={() => void shoot()}>
                {phase === 'scanning' ? th.scan.reading : th.scan.shoot}
              </Button>
            )
          }
        />
      }
    >
      <div className="flex flex-col gap-4">
        <ol className="flex flex-wrap gap-2" aria-label={th.scan.title}>
          {plan.docs.map((kind) => {
            const done = !plan.queue.includes(kind)
            const current = kind === doc
            return (
              <li
                key={kind}
                aria-current={current ? 'step' : undefined}
                className={`flex min-h-10 items-center gap-1.5 rounded-full px-3 text-base ${current ? 'bg-action font-bold text-white' : done ? 'bg-ok-bg text-action' : 'bg-canvas text-ink-muted'}`}
              >
                {done && <CheckCircle2 className="size-5" aria-hidden />}
                {th.scan.docs[kind]}
              </li>
            )
          })}
        </ol>

        <Viewfinder scanning={phase === 'scanning'}>
          {upload ? <img src={upload} alt={th.scan.uploadedAlt} className="max-h-56 rounded-xl object-contain" /> : <SampleDocument kind={doc} />}
        </Viewfinder>
        <p className="text-center text-ink-muted">{th.scan.guide[doc]}</p>
        {upload && <p className="rounded-2xl bg-warn-bg px-3 py-2 text-base text-warn-ink">{th.scan.demoUpload}</p>}

        {phase === 'read' && result && <ScanResults lines={scanLines(result)} />}

        {phase !== 'scanning' && (
          <div className="flex flex-wrap gap-x-6">
            <Button variant="ghost" className="px-0!" icon={<Upload className="size-6" aria-hidden />} onClick={() => fileInput.current?.click()}>
              {th.scan.upload}
            </Button>
            <Button variant="ghost" className="px-0!" onClick={skip}>
              {th.scan.skip}
            </Button>
          </div>
        )}
        <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={onUpload} />
      </div>
    </OnboardingShell>
  )
}
