import { Camera, Upload } from 'lucide-react'
import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useSpokenLine } from '@/components/assistant/useSpokenLine.ts'
import { BottomSheet } from '@/components/grab/BottomSheet.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { th } from '@/copy/th.ts'
import { readDocument } from '@/services/ocr/mockOcr.ts'
import type { DocKind, ScanResult } from '@/types/domain.ts'
import { SampleDocument } from './SampleDocument.tsx'
import { scanLines, scanSummary } from './scanLines.ts'
import { ScanResults } from './ScanResults.tsx'
import { Viewfinder } from './Viewfinder.tsx'

type Phase = 'aim' | 'scanning' | 'read'

interface ScanSheetProps {
  open: boolean
  doc: DocKind
  onClose: () => void
  onUse: (scan: ScanResult, photo: string) => void // photo: 'sample' or a local object URL
}

/** Photograph one document. Reading only drafts: the values land in the form as "heard". */
export function ScanSheet({ open, doc, onClose, onUse }: ScanSheetProps) {
  const [phase, setPhase] = useState<Phase>('aim')
  const [result, setResult] = useState<ScanResult | null>(null)
  const [upload, setUpload] = useState<string | null>(null) // never leaves the browser
  const handedOver = useRef<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  // An uploaded photo that was not used is let go when it is replaced or the sheet goes away.
  useEffect(
    () => () => {
      if (upload && handedOver.current !== upload) URL.revokeObjectURL(upload)
    },
    [upload],
  )
  // Every time the sheet opens it starts from the viewfinder.
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setPhase('aim')
      setResult(null)
    }
  }

  const line = phase === 'aim' ? th.scan.aim[doc] : phase === 'scanning' ? th.scan.reading : result ? scanSummary(result) : th.scan.aim[doc]
  useSpokenLine(open ? line : '', { listening: false })

  const shoot = async () => {
    if (phase === 'scanning') return
    setPhase('scanning')
    setResult(null)
    const scan = await readDocument(doc)
    if (!mounted.current) return
    setResult(scan)
    setPhase('read')
  }
  const use = () => {
    if (!result) return
    const photo = upload ?? 'sample'
    handedOver.current = upload
    onUse(result, photo)
  }
  const onUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setUpload(URL.createObjectURL(file))
    void shoot()
  }

  return (
    <BottomSheet open={open} title={th.sheet.scanTitle(th.scan.docs[doc])} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <Viewfinder scanning={phase === 'scanning'}>
          {upload ? <img src={upload} alt={th.scan.uploadedAlt} className="max-h-48 rounded-xl object-contain" /> : <SampleDocument kind={doc} />}
        </Viewfinder>
        <p aria-live="polite" className="text-center text-base">
          {line}
        </p>
        {upload && <p className="rounded-2xl bg-warn-bg px-3 py-2 text-base text-warn-ink">{th.scan.demoUpload}</p>}
        {phase === 'read' && result && <ScanResults lines={scanLines(result)} />}
        {phase === 'read' ? (
          <div className="flex gap-2">
            <Button variant="secondary" className="px-4!" onClick={() => setPhase('aim')}>
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
        )}
        {phase !== 'scanning' && (
          <Button variant="ghost" className="self-start px-0!" icon={<Upload className="size-6" aria-hidden />} onClick={() => fileInput.current?.click()}>
            {th.scan.upload}
          </Button>
        )}
        <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={onUpload} />
      </div>
    </BottomSheet>
  )
}
