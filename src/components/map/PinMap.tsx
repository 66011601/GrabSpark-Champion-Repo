import L from 'leaflet'
import { useEffect, useRef, useState } from 'react'
import { th } from '@/copy/th.ts'
import { PIN_ZOOM } from '@/services/places/bounds.ts'
import type { GeoPoint } from '@/types/domain.ts'
import { DrawnMap } from './DrawnMap.tsx'
import { createLeafletMap, PIN_SVG } from './leafletMap.ts'

/** The shop pin on OpenStreetMap, with the place under it. A drawn map stands in when the pictures cannot load. */
export function PinMap({ point }: { point: GeoPoint }) {
  const box = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const pin = useRef<L.Marker | null>(null)
  const [failed, setFailed] = useState(false)

  // Made once (again only if the pictures fail); the effect below moves it when the point changes.
  useEffect(() => {
    if (!box.current || failed) return
    const made = createLeafletMap(box.current, { lat: point.lat, lng: point.lng, zoom: PIN_ZOOM }, { still: true, onTilesFailed: () => setFailed(true) })
    const icon = L.divIcon({ html: PIN_SVG, className: 'text-action', iconSize: [48, 66], iconAnchor: [24, 64] })
    pin.current = L.marker([point.lat, point.lng], { icon, interactive: false, keyboard: false }).addTo(made)
    map.current = made
    return () => {
      made.remove()
      map.current = null
      pin.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the point is followed by the next effect
  }, [failed])

  useEffect(() => {
    map.current?.setView([point.lat, point.lng], PIN_ZOOM)
    pin.current?.setLatLng([point.lat, point.lng])
  }, [point.lat, point.lng])

  return (
    <figure className="relative isolate overflow-hidden rounded-2xl ring-1 ring-line">
      {failed ? <DrawnMap label={point.text} /> : <div ref={box} role="img" aria-label={th.review.mapAlt(point.text)} className="h-48 w-full bg-canvas" />}
      <figcaption className="px-4 py-2 text-base">
        {point.text}
        {point.address && point.address !== point.text && <span className="block text-ink-muted">{point.address}</span>}
      </figcaption>
    </figure>
  )
}
