import { th } from '@/copy/th.ts'
import { GOOGLE_MAPS_KEY } from '@/services/places/places.ts'
import type { GeoPoint } from '@/types/domain.ts'

const ZOOM = 17

/** Google's embedded map with a pin at the point (Maps Embed API). */
function googleMapUrl(point: GeoPoint): string {
  const query = new URLSearchParams({ key: GOOGLE_MAPS_KEY, q: `${point.lat},${point.lng}`, zoom: String(ZOOM), language: 'th', region: 'TH' })
  return `https://www.google.com/maps/embed/v1/place?${query}`
}

/** The shop pin on a map: Google Maps when a key is set, otherwise a drawn stand-in. */
export function MapPinConfirm({ point }: { point: GeoPoint }) {
  return (
    <figure className="overflow-hidden rounded-2xl ring-1 ring-line">
      {GOOGLE_MAPS_KEY ? (
        <iframe
          src={googleMapUrl(point)}
          title={th.places.mapTitle(point.text)}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="block h-48 w-full border-0 bg-canvas"
        />
      ) : (
        <svg viewBox="0 0 320 160" role="img" aria-label={th.review.mapAlt(point.text)} className="block h-40 w-full bg-canvas">
          <path d="M0 60 H320 M0 120 H320 M110 0 V160 M230 0 V160" className="stroke-line" strokeWidth="14" fill="none" />
          <path d="M110 60 L230 120" className="stroke-line" strokeWidth="8" fill="none" />
          <rect x="248" y="18" width="48" height="30" rx="6" className="fill-grab/30" />
          <g transform="translate(160 86)">
            <path d="M0 -40 C-15 -40 -24 -29 -24 -17 C-24 0 0 22 0 22 C0 22 24 0 24 -17 C24 -29 15 -40 0 -40 Z" className="fill-action" />
            <circle cx="0" cy="-17" r="8" className="fill-surface" />
          </g>
        </svg>
      )}
      <figcaption className="px-4 py-2 text-base">
        {point.text}
        {point.address && <span className="block text-ink-muted">{point.address}</span>}
      </figcaption>
    </figure>
  )
}
