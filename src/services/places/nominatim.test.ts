import { afterEach, describe, expect, it, vi } from 'vitest'
import { th } from '@/copy/th.ts'
import { BANGKOK } from '@/ai/onboarding/parsers/thaiAddress.ts'
import { createNominatim, toThaiParts } from './nominatim.ts'

const WAROROT = {
  lat: '18.7902357',
  lon: '99.0005350',
  name: 'ตลาดวโรรส',
  address: { amenity: 'ตลาดวโรรส', road: 'ถนนข่วงเมรุ', suburb: 'แขวงนครพิงค์', city_district: 'ตำบลช้างม่อย', city: 'เทศบาลนครเชียงใหม่', county: 'อำเภอเมืองเชียงใหม่', province: 'จังหวัดเชียงใหม่', postcode: '55520', country: 'ประเทศไทย', country_code: 'th' },
}
const KHON_KAEN = {
  lat: '16.4210595',
  lon: '102.8378045',
  name: 'อะเมซอน',
  address: { amenity: 'อะเมซอน', road: 'ถนนรอบบึง', city_district: 'ตำบลในเมือง', county: 'อำเภอเมืองขอนแก่น', province: 'จังหวัดขอนแก่น', postcode: '40000', country_code: 'th' },
}
const LAT_PHRAO = { lat: '13.8013650', lon: '100.6033158', name: '', address: { quarter: 'แขวงลาดพร้าว', suburb: 'เขตลาดพร้าว', city: 'กรุงเทพมหานคร', postcode: '10230', country_code: 'th' } }
const VIENTIANE = { lat: '17.9667', lon: '102.6', name: 'ตลาดเช้า', address: { country_code: 'la' } }

function answer(...bodies: { status?: number; body?: unknown; fail?: boolean }[]) {
  const fetchImpl = vi.fn(async () => {
    const next = bodies.shift() ?? { body: [] }
    if (next.fail) throw new Error('offline')
    return { ok: (next.status ?? 200) === 200, status: next.status ?? 200, json: async () => next.body } as Response
  })
  const sleep = vi.fn(async () => {})
  let clock = 1_000_000
  const now = () => clock
  const nominatim = createNominatim({ fetchImpl: fetchImpl as unknown as typeof fetch, now, sleep })
  return { nominatim, fetchImpl, sleep, tick: (ms: number) => (clock += ms), url: (call = 0) => String((fetchImpl.mock.calls[call] as unknown[])[0]) }
}

afterEach(() => vi.restoreAllMocks())

describe('toThaiParts', () => {
  it('reads ตำบล, อำเภอ and จังหวัด by their prefixes, preferring ตำบล over a city แขวง', () => {
    expect(toThaiParts(WAROROT.address)).toEqual({ road: 'ข่วงเมรุ', subdistrict: 'ช้างม่อย', district: 'เมืองเชียงใหม่', province: 'เชียงใหม่', postcode: '55520' })
  })

  it('reads Bangkok’s แขวง and เขต', () => {
    expect(toThaiParts(LAT_PHRAO.address)).toEqual({ subdistrict: 'ลาดพร้าว', district: 'ลาดพร้าว', province: BANGKOK, postcode: '10230' })
  })

  it('ignores a place name that mentions Bangkok, and reads admin names from admin keys only', () => {
    expect(
      toThaiParts({ amenity: 'ธนาคารกรุงเทพ', road: 'ถนนถลาง', city_district: 'ตำบลตลาดเหนือ', county: 'อำเภอเมืองภูเก็ต', province: 'จังหวัดภูเก็ต', postcode: '83000', 'ISO3166-2-lvl4': 'TH-83', country_code: 'th' }),
    ).toEqual({ road: 'ถลาง', subdistrict: 'ตลาดเหนือ', district: 'เมืองภูเก็ต', province: 'ภูเก็ต', postcode: '83000' })
  })

  it('keeps a soi out of the road', () => {
    expect(
      toThaiParts({ road: 'ซอยลาดพร้าว 71', quarter: 'แขวงลาดพร้าว', suburb: 'เขตลาดพร้าว', city: 'กรุงเทพมหานคร', postcode: '10230', 'ISO3166-2-lvl4': 'TH-10', country_code: 'th' }),
    ).toEqual({ soi: 'ลาดพร้าว 71', subdistrict: 'ลาดพร้าว', district: 'ลาดพร้าว', province: BANGKOK, postcode: '10230' })
  })
})

describe('createNominatim', () => {
  it('searches in Thai, in Thailand only, and names the place', async () => {
    const { nominatim, url } = answer({ body: [WAROROT] })
    const point = await nominatim.search('ตลาดวโรรส')
    expect(point).toMatchObject({ text: 'ตลาดวโรรส', lat: 18.7902357, lng: 99.000535, address: 'ถนนข่วงเมรุ ต.ช้างม่อย อ.เมืองเชียงใหม่ จ.เชียงใหม่ 55520' })
    expect(url()).toContain('https://nominatim.openstreetmap.org/search?')
    expect(url()).toContain('countrycodes=th')
    expect(url()).toContain('accept-language=th')
  })

  it('skips answers outside Thailand', async () => {
    const { nominatim } = answer({ body: [VIENTIANE] })
    expect(await nominatim.search('ตลาดเช้า')).toBeNull()
  })

  it('names a point by its street, keeping the exact point asked about', async () => {
    const { nominatim } = answer({ body: KHON_KAEN }, { body: LAT_PHRAO })
    expect(await nominatim.reverse(16.42106, 102.83781)).toMatchObject({ text: 'ถนนรอบบึง', lat: 16.42106, lng: 102.83781 })
    expect((await nominatim.reverse(13.8014, 100.6033))?.text).toBe('แขวงลาดพร้าว เขตลาดพร้าว กรุงเทพมหานคร')
  })

  it('waits a second between calls and remembers answers', async () => {
    const { nominatim, fetchImpl, sleep } = answer({ body: [WAROROT] }, { body: [KHON_KAEN] })
    await nominatim.search('ตลาดวโรรส')
    await nominatim.search('ตลาดวโรรส')
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    await nominatim.search('ขอนแก่น')
    expect(sleep).toHaveBeenCalledWith(1000)
  })

  it('stops asking for a minute after "too many requests"', async () => {
    const { nominatim, fetchImpl, tick } = answer({ status: 429 }, { body: [WAROROT] })
    expect(await nominatim.search('ก')).toBeNull()
    tick(30_000)
    expect(await nominatim.search('ข')).toBeNull()
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    tick(31_000)
    expect(await nominatim.search('ค')).not.toBeNull()
  })

  it('gives null when the network fails, and tries again next time', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { nominatim } = answer({ fail: true }, { body: [WAROROT] })
    expect(await nominatim.search('ตลาดวโรรส')).toBeNull()
    expect(await nominatim.search('ตลาดวโรรส')).not.toBeNull()
  })

  it('falls back to "pinned here" when a point has no address at all', async () => {
    const { nominatim } = answer({ body: { lat: '15', lon: '100', address: { country_code: 'th' } } })
    expect((await nominatim.reverse(15, 100))?.text).toBe(th.places.pinnedHere)
  })
})
