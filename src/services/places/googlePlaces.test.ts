import { afterEach, describe, expect, it, vi } from 'vitest'
import { createGooglePlaces, FOUND_CONFIDENCE, isInThailand, PICKED_CONFIDENCE, toGeoPoint, type GooglePlace } from './googlePlaces.ts'
import type { Places } from './places.ts'

const THAI = { shortText: 'TH', types: ['country', 'political'] }
const SOI: GooglePlace = {
  id: 'soi71',
  displayName: { text: 'ซอย ลาดพร้าว 71' },
  formattedAddress: 'ซอย ลาดพร้าว 71 แขวงสะพานสอง เขตวังทองหลาง กรุงเทพมหานคร 10310 ประเทศไทย',
  location: { latitude: 13.8016, longitude: 100.6033 },
  addressComponents: [THAI],
}
const VIENTIANE: GooglePlace = { ...SOI, id: 'laos', displayName: { text: 'ตลาดเช้า' }, addressComponents: [{ shortText: 'LA', types: ['country'] }] }

const offline: Places = { live: false, suggest: vi.fn(async () => []), pick: vi.fn(async () => null), find: vi.fn(async () => null), reverse: vi.fn(async () => null) }

/** Answers the next request with `body`, and remembers what was asked. */
function answer(body: unknown, ok = true) {
  const fetchMock = vi.fn(async (_url: string, _init: RequestInit) => ({ ok, status: ok ? 200 : 403, json: async () => body }))
  vi.stubGlobal('fetch', fetchMock)
  const asked = () => {
    const [url, init] = fetchMock.mock.calls[0]
    return { url, headers: init.headers as Record<string, string>, body: init.body ? JSON.parse(init.body as string) : undefined }
  }
  return { fetchMock, asked }
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('toGeoPoint', () => {
  it('keeps a place in Thailand, without repeating the country', () => {
    expect(toGeoPoint(SOI)).toEqual({
      text: 'ซอย ลาดพร้าว 71',
      address: 'ซอย ลาดพร้าว 71 แขวงสะพานสอง เขตวังทองหลาง กรุงเทพมหานคร 10310',
      lat: 13.8016,
      lng: 100.6033,
    })
  })

  it('refuses a place outside Thailand, or one with no country at all', () => {
    expect(isInThailand(VIENTIANE)).toBe(false)
    expect(toGeoPoint(VIENTIANE)).toBeNull()
    expect(toGeoPoint({ ...SOI, addressComponents: undefined })).toBeNull()
  })
})

describe('createGooglePlaces', () => {
  it('asks for suggestions in Thailand only, in Thai', async () => {
    const { asked } = answer({
      suggestions: [
        {
          placePrediction: {
            placeId: 'soi71',
            structuredFormat: { mainText: { text: 'ซอย ลาดพร้าว 71' }, secondaryText: { text: 'เขตวังทองหลาง กรุงเทพมหานคร ประเทศไทย' } },
          },
        },
      ],
    })
    const suggestions = await createGooglePlaces('test-key', offline).suggest('ลาดพร้าว 71')
    expect(suggestions).toEqual([{ id: 'soi71', kind: 'place', title: 'ซอย ลาดพร้าว 71', subtitle: 'เขตวังทองหลาง กรุงเทพมหานคร' }])
    expect(asked().url).toBe('https://places.googleapis.com/v1/places:autocomplete')
    expect(asked().headers['X-Goog-Api-Key']).toBe('test-key')
    expect(asked().body).toMatchObject({ input: 'ลาดพร้าว 71', includedRegionCodes: ['th'], languageCode: 'th' })
  })

  it('does not ask about one or two letters', async () => {
    const { fetchMock } = answer({})
    expect(await createGooglePlaces('test-key', offline).suggest('ลา')).toEqual([])
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('turns the chosen suggestion into a pin', async () => {
    const { asked } = answer(SOI)
    const match = await createGooglePlaces('test-key', offline).pick({ id: 'soi71', kind: 'place', title: 'ซอย ลาดพร้าว 71', subtitle: '' })
    expect(match?.confidence).toBe(PICKED_CONFIDENCE)
    expect(match?.value.lat).toBe(13.8016)
    expect(asked().url).toContain('/places/soi71?')
    expect(asked().headers['X-Goog-FieldMask']).toContain('location')
  })

  it('searches spoken words inside the Thailand box and skips results across the border', async () => {
    const { asked } = answer({ places: [VIENTIANE, SOI] })
    const match = await createGooglePlaces('test-key', offline).find('ลาดพร้าวซอย71 ตรงข้ามเซเว่น')
    expect(match).toEqual({ value: toGeoPoint(SOI), confidence: FOUND_CONFIDENCE })
    expect(asked().body).toMatchObject({ textQuery: 'ลาดพร้าวซอย71 ตรงข้ามเซเว่น', regionCode: 'TH', languageCode: 'th' })
    expect(asked().body.locationRestriction.rectangle.low.latitude).toBeGreaterThan(5)
  })

  it('finds nothing when every result is outside Thailand', async () => {
    answer({ places: [VIENTIANE] })
    expect(await createGooglePlaces('test-key', offline).find('ตลาดเช้า เวียงจันทน์')).toBeNull()
  })

  it('falls back to the sample places when Google refuses the request', async () => {
    answer({}, false)
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    await createGooglePlaces('test-key', offline).find('ลาดพร้าว 71')
    expect(offline.find).toHaveBeenCalledWith('ลาดพร้าว 71')
  })
})
