import { MapPinned } from 'lucide-react'
import { formatThaiAddress } from '@/ai/onboarding/parsers/thaiAddress.ts'
import { Field } from '@/components/grab/Field.tsx'
import { fieldMark, TYPED } from '@/components/grab/fieldMarks.ts'
import { inputClass } from '@/components/grab/inputClass.ts'
import { th } from '@/copy/th.ts'
import { applyCompletion, areaCompletions, areaParts, type Area } from '@/services/places/thaiAddressDb.ts'
import type { ProfileFields } from '@/types/domain.ts'

interface AddressFieldProps {
  field: ProfileFields['address']
  areas: Area[] | null // null while the address data loads: no completions yet
  mismatch: string | null // what is wrong with the postcode, to show under the box
  onType: (value: string) => void
  onCheck: (() => void) | null
}

/** 3/7 "ที่อยู่ร้านค้า": one box as in GrabMerchant; typing a postcode or ตำบล offers the rest of the address. */
export function AddressField({ field, areas, mismatch, onType, onCheck }: AddressFieldProps) {
  const value = field.value ?? ''
  const typedHere = field.status !== 'empty' && field.heardFrom === TYPED
  const completions = areas && typedHere ? areaCompletions(areas, value) : []
  return (
    <Field id="s3-address" label={th.fields.address} required mark={fieldMark(field)} onCheck={onCheck} error={mismatch}>
      <textarea id="s3-address" rows={2} value={value} onChange={(event) => onType(event.target.value)} className={`${inputClass(mismatch !== null)} py-3`} />
      {completions.length > 0 && (
        <ul aria-label={th.places.areaChoices} className="mt-2 divide-y divide-line overflow-hidden rounded-2xl bg-surface ring-1 ring-line">
          {completions.map((area) => (
            <li key={`${area.subdistrict}|${area.district}|${area.postcode}`}>
              <button type="button" onClick={() => onType(applyCompletion(value, area))} className="flex min-h-12 w-full cursor-pointer items-center gap-3 px-4 py-2 text-left active:bg-ok-bg">
                <MapPinned className="size-5 shrink-0 text-action" aria-hidden />
                {formatThaiAddress(areaParts(area))}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Field>
  )
}
