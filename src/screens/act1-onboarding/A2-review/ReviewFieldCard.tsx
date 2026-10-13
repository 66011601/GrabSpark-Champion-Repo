import { AlertTriangle, Check, CheckCircle2, Pencil } from 'lucide-react'
import type { ReactNode } from 'react'
import { needsCheck } from '@/ai/onboarding/profile.ts'
import { Button } from '@/components/ui/Button.tsx'
import { Card } from '@/components/ui/Card.tsx'
import { th } from '@/copy/th.ts'
import type { FieldStatus } from '@/types/domain.ts'

// Values that came from a tap rather than speech get "ที่มา" instead of "ได้ยินว่า".
const NON_SPEECH_SOURCES = [th.review.fromAccount, th.chips.useDeviceLocation, th.store.typed, th.places.picked]

interface ReviewFieldCardProps {
  label: string
  field: { status: FieldStatus; confidence?: number; heardFrom?: string }
  onConfirm: () => void
  onEdit: () => void
  disabled?: boolean
  children: ReactNode
}

export function ReviewFieldCard({ label, field, onConfirm, onEdit, disabled, children }: ReviewFieldCardProps) {
  const confirmed = field.status === 'confirmed'
  const check = needsCheck(field)
  const spoken = field.heardFrom && !NON_SPEECH_SOURCES.includes(field.heardFrom)
  return (
    <Card tone={check ? 'warn' : 'default'}>
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-bold">{label}</h2>
        {confirmed && (
          <span className="flex items-center gap-1 text-action">
            <CheckCircle2 className="size-5" aria-hidden />
            {th.review.confirmed}
          </span>
        )}
      </div>
      {check && (
        <p className="mt-1 flex items-center gap-2 font-bold text-warn-ink">
          <AlertTriangle className="size-5 shrink-0" aria-hidden />
          {th.review.pleaseCheck}
        </p>
      )}
      <div className="mt-2 text-lg">{children}</div>
      {field.heardFrom && (
        <p className="mt-2 text-sm text-ink-muted">
          {spoken ? `${th.review.heardFrom}: “${field.heardFrom}”` : `${th.review.source}: ${field.heardFrom}`}
        </p>
      )}
      <div className="mt-4 flex gap-2">
        {!confirmed && (
          <Button variant="secondary" className="flex-1" icon={<Check className="size-5" aria-hidden />} disabled={disabled} onClick={onConfirm}>
            {th.review.confirm}
          </Button>
        )}
        <Button variant="ghost" icon={<Pencil className="size-5" aria-hidden />} disabled={disabled} onClick={onEdit}>
          {th.review.edit}
        </Button>
      </div>
    </Card>
  )
}
