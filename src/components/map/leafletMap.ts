import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { MapView } from '@/services/places/bounds.ts'
import { OSM_CREDIT, OSM_MAX_ZOOM, OSM_TILES } from '@/services/places/tiles.ts'

// A few failed pictures can be a blip; this many means the map is not loading (offline, blocked).
const FAILED_TILES = 3

/** An OpenStreetMap map in `element`. A `still` map cannot be moved (the filled field); the pin sheet's can. */
export function createLeafletMap(element: HTMLElement, view: MapView, { still, onTilesFailed }: { still: boolean; onTilesFailed: () => void }): L.Map {
  const map = L.map(element, {
    center: [view.lat, view.lng],
    zoom: view.zoom,
    zoomControl: !still,
    dragging: !still,
    touchZoom: !still,
    scrollWheelZoom: !still,
    doubleClickZoom: !still,
    boxZoom: false,
    keyboard: !still,
  })
  map.attributionControl.setPrefix(false)
  const tiles = L.tileLayer(OSM_TILES, { maxZoom: OSM_MAX_ZOOM, attribution: OSM_CREDIT })
  let failed = 0
  tiles.on('tileerror', () => {
    failed += 1
    if (failed === FAILED_TILES) onTilesFailed()
  })
  tiles.addTo(map)
  return map
}

/** The shop pin as SVG (Leaflet's own marker images break when bundled). Its tip is at the bottom centre. */
export const PIN_SVG =
  '<svg viewBox="-24 -42 48 66" width="48" height="66" aria-hidden="true"><path d="M0 -40 C-15 -40 -24 -29 -24 -17 C-24 0 0 22 0 22 C0 22 24 0 24 -17 C24 -29 15 -40 0 -40 Z" fill="currentColor"/><circle cx="0" cy="-17" r="8" fill="white"/></svg>'
