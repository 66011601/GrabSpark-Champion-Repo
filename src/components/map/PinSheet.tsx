import type L from 'leaflet'
import { LocateFixed, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button.tsx'
import { th } from '@/copy/th.ts'
import { AREA_ZOOM, isInThailand, PIN_ZOOM, type MapView } from '@/services/places/bounds.ts'
import type { PlaceMatch } from '@/services/places/places.ts'
import { createLeafletMap, PIN_SVG } from './leafletMap.ts'

const DESCRIBE_AFTER_MS = 600
const keyOf = (lat: number, lng: number) => `${lat.toFixed(5)},${lng.toFixed(5)}`

interface PinSheetProps {
  open: boolean
  start: MapView
  describe: (lat: number, lng: number) => Promise<PlaceMatch | null> // the address under the pin
  onUse: (match: PlaceMatch) => void
  onLocate: () => Promise<{ lat: number; lng: number } | null> // the phone's location, to jump there
  onClose: () => void
}

/** Full screen: the pin stays in the middle and the merchant moves the map until it sits on the shop. */
export function PinSheet({ open, ...props }: PinSheetProps) {
  return open ? <PinSheetBody {...props} /> : null // mounted fresh each time, so it starts where it is told
}

function PinSheetBody({ start, describe, onUse, onLocate, onClose }: Omit<PinSheetProps, 'open'>) {
  const box = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const closeButton = useRef<HTMLButtonElement>(null)
  const latest = useRef({ describe })
  useEffect(() => {
    latest.current = { describe }
  })
  // Where the map is now: the centre is the pin, and the zoom says whether it can sit on one shop.
  const [view, setView] = useState({ lat: start.lat, lng: start.lng, zoom: start.zoom })
  const [found, setFound] = useState<{ at: string; match: PlaceMatch | null } | null>(null)
  const [failed, setFailed] = useState(false)

  // The map is made once; `start` only places it.
  useEffect(() => {
    if (!box.current) return
    const made = createLeafletMap(box.current, start, { still: false, onTilesFailed: () => setFailed(true) })
    map.current = made
    let alive = true
    let waiting: number | undefined
    let newest = 0 // only the latest lookup may answer; an older, slower one must not overwrite it
    const lookUp = (lat: number, lng: number, zoom: number) => {
      window.clearTimeout(waiting)
      const mine = ++newest
      // Nothing to find at country zoom or abroad, and no reason to send such a point to the map service.
      if (zoom < AREA_ZOOM || !isInThailand(lat, lng)) return
      waiting = window.setTimeout(async () => {
        let match: PlaceMatch | null = null
        try {
          match = await latest.current.describe(lat, lng)
        } catch {
          match = null // a failed lookup means no address, not "looking" forever
        }
        if (alive && mine === newest) setFound({ at: keyOf(lat, lng), match })
      }, DESCRIBE_AFTER_MS)
    }
    // A zoom ends with a moveend as well, so this one handler follows both the centre and the zoom.
    made.on('moveend', () => {
      const { lat, lng } = made.getCenter()
      const zoom = made.getZoom()
      setView({ lat, lng, zoom })
      lookUp(lat, lng, zoom)
    })
    lookUp(start.lat, start.lng, start.zoom)
    const sizing = requestAnimationFrame(() => made.invalidateSize())
    return () => {
      alive = false
      window.clearTimeout(waiting)
      cancelAnimationFrame(sizing)
      made.remove()
      map.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the map is made once; `start` only places it
  }, [])

  // Focus moves into the sheet when it opens and back to where it was when it closes (no trap, like BottomSheet).
  useEffect(() => {
    const before = document.activeElement
    closeButton.current?.focus()
    return () => {
      if (before instanceof HTMLElement) before.focus()
    }
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const here = found && found.at === keyOf(view.lat, view.lng) ? found : null
  const bare: PlaceMatch = { value: { text: th.places.pinnedHere, lat: view.lat, lng: view.lng }, confidence: 1 }
  // A pin abroad, or on a map still showing the whole country, cannot be the shop: it is not offered.
  const abroad = !isInThailand(view.lat, view.lng)
  const tooFar = view.zoom < AREA_ZOOM
  const line = abroad
    ? th.places.outsideThailand
    : tooFar
      ? th.places.pinZoomIn
      : here === null
        ? th.places.pinLooking
        : (here.match?.value.address ?? here.match?.value.text ?? th.places.pinNoAddress)

  const jumpToPhone = async () => {
    const fix = await onLocate()
    if (fix) map.current?.setView([fix.lat, fix.lng], PIN_ZOOM)
  }

  return (
    <div role="dialog" aria-modal="true" aria-label={th.places.pinTitle} className="absolute inset-0 z-30 flex flex-col bg-surface">
      <div className="flex items-center justify-between gap-2 px-4 pt-3">
        <h2 className="text-lg font-bold">{th.places.pinTitle}</h2>
        <button ref={closeButton} type="button" onClick={onClose} aria-label={th.grab.close} className="flex size-12 cursor-pointer items-center justify-center rounded-full active:bg-canvas">
          <X className="size-6" aria-hidden />
        </button>
      </div>
      <p className="px-4 pb-2 text-base text-ink-muted">{th.places.pinHint}</p>
      <div className="relative isolate min-h-0 flex-1">
        <div ref={box} className="absolute inset-0 bg-canvas" />
        <div className="pointer-events-none absolute top-1/2 left-1/2 z-[500] -translate-x-1/2 -translate-y-full text-action" dangerouslySetInnerHTML={{ __html: PIN_SVG }} />
        {failed && <p className="absolute inset-x-4 top-4 z-[500] rounded-xl bg-warn-bg p-3 text-base text-warn-ink">{th.places.mapFailed}</p>}
      </div>
      <div className="flex flex-col gap-3 px-4 pt-3 pb-6">
        <p aria-live="polite" className="min-h-14 text-base">
          {line}
        </p>
        <p className="-mt-2 text-sm text-ink-muted">{th.places.osmNotice}</p>
        <Button variant="secondary" icon={<LocateFixed className="size-5" aria-hidden />} onClick={() => void jumpToPhone()}>
          {th.places.pinLocate}
        </Button>
        <Button fullWidth disabled={abroad || tooFar} onClick={() => onUse(here?.match ? { ...here.match, value: { ...here.match.value, lat: view.lat, lng: view.lng } } : bare)}>
          {th.places.pinUse}
        </Button>
      </div>
    </div>
  )
}
