import { describe, expect, it, vi } from 'vitest'
import raw from '@/data/thai-address.json'
import type { GeoPoint } from '@/types/domain.ts'
import { AREA_ZOOM } from './bounds.ts'
import type { Nominatim } from './nominatim.ts'
import { AREA_CONFIDENCE, createPlaces, REVERSE_CONFIDENCE, SEARCH_CONFIDENCE, type PlaceSource, type Places } from './places.ts'
import { decodeAreas, type Area, type CompactDb } from './thaiAddressDb.ts'

const areas = decodeAreas(raw as unknown as CompactDb)
const WAROROT: GeoPoint = {
  text: 'ตลาดวโรรส',
  parts: { road: 'ข่วงเมรุ', subdistrict: 'ช้างม่อย', district: 'เมืองเชียงใหม่', province: 'เชียงใหม่', postcode: '55520' },
  address: 'ถนนข่วงเมรุ ต.ช้างม่อย อ.เมืองเชียงใหม่ จ.เชียงใหม่ 55520',
  lat: 18.79,
  lng: 99.0,
}
const HERE = { value: { text: 'ลาดพร้าว 71', lat: 13.8, lng: 100.6 }, confidence: 0.62 }
const CHANG_MOI: Area = { subdistrict: 'ช้างม่อย', district: 'เมืองเชียงใหม่', province: 'เชียงใหม่', postcode: '50300' }

function setUp({ ownFind = null, mapFind = null, osm = null }: { ownFind?: typeof HERE | null; mapFind?: typeof HERE | null; osm?: GeoPoint | null } = {}) {
  const local: Places = {
    live: false,
    suggest: vi.fn(async () => [{ id: 'local:x', kind: 'place' as const, title: 'x', subtitle: '' }]),
    pick: vi.fn(async () => HERE),
    find: vi.fn(async () => ownFind),
    reverse: vi.fn(async (lat: number, lng: number) => ({ value: { text: 'near', lat, lng }, confidence: 0.5 })),
  }
  const nominatim: Nominatim = { search: vi.fn(async () => osm), reverse: vi.fn(async () => osm) }
  const google: PlaceSource = { suggest: vi.fn(async () => []), pick: vi.fn(async () => null), find: vi.fn(async () => mapFind) }
  return { local, nominatim, google, places: createPlaces({ local, nominatim, google, areas: () => areas }) }
}

describe('createPlaces', () => {
  it('finds with the sample places first, then Google, then OpenStreetMap', async () => {
    const own = setUp({ ownFind: HERE })
    expect(await own.places.find('ลาดพร้าว 71')).toBe(HERE)
    expect(own.nominatim.search).not.toHaveBeenCalled()

    const map = setUp({ mapFind: HERE })
    expect(await map.places.find('x')).toBe(HERE)

    const osm = setUp({ osm: WAROROT })
    const found = await osm.places.find('ตลาดวโรรส')
    expect(found?.confidence).toBe(SEARCH_CONFIDENCE)
    expect(found?.value.parts?.postcode).toBe('50300') // corrected from the Thai address data
    expect(found?.value.address).toBe('ถนนข่วงเมรุ ต.ช้างม่อย อ.เมืองเชียงใหม่ จ.เชียงใหม่ 50300')
  })

  it('adds a "search the map" row from three letters, without calling OpenStreetMap', async () => {
    const { places, nominatim } = setUp()
    const rows = await places.suggest('ตลาดต้นพยอม')
    expect(rows.at(-1)).toMatchObject({ kind: 'search', query: 'ตลาดต้นพยอม' })
    expect(nominatim.search).not.toHaveBeenCalled()
    expect((await places.suggest('ตล')).some((row) => row.kind === 'search')).toBe(false)
  })

  it('searches when the search row is picked', async () => {
    const { places } = setUp({ osm: WAROROT })
    expect((await places.pick({ id: 'search:ตลาดวโรรส', kind: 'search', title: '', subtitle: '', query: 'ตลาดวโรรส' }))?.value.text).toBe('ตลาดวโรรส')
  })

  it('centres a picked area on OpenStreetMap’s answer, or the offline guess', async () => {
    const row = { id: 'area:x', kind: 'area' as const, title: '', subtitle: '', area: CHANG_MOI }
    const online = setUp({ osm: WAROROT })
    expect(await online.places.pick(row)).toMatchObject({ value: { lat: 18.79, lng: 99.0, parts: CHANG_MOI }, confidence: AREA_CONFIDENCE, zoom: AREA_ZOOM })
    expect(online.nominatim.search).toHaveBeenCalledWith('ช้างม่อย เมืองเชียงใหม่ เชียงใหม่')
    const offline = setUp()
    await offline.places.pick(row)
    expect(offline.local.pick).toHaveBeenCalledWith(row)
  })

  it('names a point with OpenStreetMap, else with the nearest sample place', async () => {
    const online = setUp({ osm: WAROROT })
    expect(await online.places.reverse(18.79, 99.0)).toMatchObject({ confidence: REVERSE_CONFIDENCE, value: { parts: { postcode: '50300' } } })
    const offline = setUp()
    expect((await offline.places.reverse(15, 100))?.value.text).toBe('near')
  })

  it('is live only with Google', () => {
    expect(setUp().places.live).toBe(true)
    const { local, nominatim } = setUp()
    expect(createPlaces({ local, nominatim, areas: () => null }).live).toBe(false)
  })
})
