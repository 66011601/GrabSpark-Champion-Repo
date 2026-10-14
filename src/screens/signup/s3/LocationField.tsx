import { LocateFixed, MapPin, MapPinned } from 'lucide-react'
import { lazy, Suspense, type ClipboardEvent, type KeyboardEvent } from 'react'
import { Field } from '@/components/grab/Field.tsx'
import { fieldMark } from '@/components/grab/fieldMarks.ts'
import { inputClass } from '@/components/grab/inputClass.ts'
import { DrawnMap } from '@/components/map/DrawnMap.tsx'
import { Button } from '@/components/ui/Button.tsx'
import { PlaceSuggestions } from '@/components/ui/PlaceSuggestions.tsx'
import { th } from '@/copy/th.ts'
import type { PlaceSuggestion } from '@/services/places/places.ts'
import type { ProfileFields } from '@/types/domain.ts'

const PinMap = lazy(() => import('@/components/map/PinMap.tsx').then((module) => ({ default: module.PinMap })))

interface LocationFieldProps {
  field: ProfileFields['location']
  search: string
  onSearch: (text: string) => void
  onPasteText: (text: string) => boolean // true when the text was a map link or coordinates (then it is handled)
  onEnter: () => void
  suggestions: PlaceSuggestion[]
  live: boolean
  locating: boolean
  onPick: (suggestion: PlaceSuggestion) => void
  onHere: () => void
  onPin: () => void
  onConfirmPin: () => void
  onClear: () => void
}

/** 3/7 "ที่ตั้ง": search, paste a link, use the phone's location or pin it; once filled, the map with its checks. */
export function LocationField(props: LocationFieldProps) {
  const { field } = props
  const point = field.value
  const paste = (event: ClipboardEvent<HTMLInputElement>) => {
    if (props.onPasteText(event.clipboardData.getData('text'))) event.preventDefault()
  }
  const enter = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') props.onEnter()
  }
  return (
    <Field id="s3-location" label={th.store.location} required mark={fieldMark(field)} onCheck={null}>
      {point ? (
        <div className="flex flex-col gap-2">
          <Suspense fallback={<DrawnMap label={point.text} />}>
            <PinMap point={point} />
          </Suspense>
          <div className="flex flex-wrap gap-2">
            {field.needsPinCheck && (
              <Button variant="secondary" className="min-h-12!" icon={<MapPin className="size-5" aria-hidden />} onClick={props.onConfirmPin}>
                {th.s3.pinConfirm}
              </Button>
            )}
            <Button variant="ghost" className="min-h-12!" icon={<MapPinned className="size-5" aria-hidden />} onClick={props.onPin}>
              {th.s3.pinChange}
            </Button>
            <Button variant="ghost" className="min-h-12! px-0!" onClick={props.onClear}>
              {th.s3.pinSearchAgain}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="relative">
            <MapPin className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-action" aria-hidden />
            <input
              id="s3-location"
              autoComplete="off"
              enterKeyHint="search"
              placeholder={th.s3.locationPlaceholder}
              value={props.search}
              onChange={(event) => props.onSearch(event.target.value)}
              onPaste={paste}
              onKeyDown={enter}
              className={`${inputClass()} pl-11`}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" className="min-h-12!" disabled={props.locating} icon={<LocateFixed className="size-5" aria-hidden />} onClick={props.onHere}>
              {props.locating ? th.places.locating : th.places.useHere}
            </Button>
            <Button variant="secondary" className="min-h-12!" icon={<MapPinned className="size-5" aria-hidden />} onClick={props.onPin}>
              {th.places.pinOnMap}
            </Button>
          </div>
          <PlaceSuggestions suggestions={props.suggestions} live={props.live} onPick={props.onPick} />
        </div>
      )}
    </Field>
  )
}
