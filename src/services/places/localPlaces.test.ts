import { describe, expect, it } from 'vitest'
import { th } from '@/copy/th.ts'
import raw from '@/data/thai-address.json'
import landmarks from '@/data/landmarks.json'
import { COUNTRY_ZOOM, AREA_ZOOM, THAILAND_CENTER } from './bounds.ts'
import { createLocalPlaces, NEAREST_CONFIDENCE, PICKED_CONFIDENCE } from './localPlaces.ts'
import { decodeAreas, type CompactDb } from './thaiAddressDb.ts'

const areas = decodeAreas(raw as unknown as CompactDb)
const local = createLocalPlaces(landmarks, () => areas)

describe('createLocalPlaces', () => {
  it('suggests sample places with their district and province', async () => {
    const [first] = await local.suggest('วโรรส')
    expect(first).toMatchObject({ kind: 'place', title: 'ตลาดวโรรส เชียงใหม่', subtitle: 'อ.เมืองเชียงใหม่ จ.เชียงใหม่' })
  })

  it('suggests sub-districts once the address data is loaded, and only places before', async () => {
    const rows = await local.suggest('ช้างม่อย')
    expect(rows).toContainEqual(expect.objectContaining({ kind: 'area', title: 'ต.ช้างม่อย อ.เมืองเชียงใหม่ จ.เชียงใหม่ 50300' }))
    const early = createLocalPlaces(landmarks, () => null)
    expect((await early.suggest('ช้างม่อย')).every((row) => row.kind === 'place')).toBe(true)
  })

  it('turns a picked place into a point with its address', async () => {
    const [row] = await local.suggest('วโรรส')
    const match = await local.pick(row)
    expect(match?.confidence).toBe(PICKED_CONFIDENCE)
    expect(match?.value.address).toBe('ถนนข่วงเมรุ ต.ช้างม่อย อ.เมืองเชียงใหม่ จ.เชียงใหม่ 50300')
  })

  it('opens a picked area near a sample place in the same province, else over all of Thailand', async () => {
    const [chiangMai] = (await local.suggest('ช้างม่อย')).filter((row) => row.kind === 'area')
    expect(await local.pick(chiangMai)).toMatchObject({ value: { lat: 18.7902, lng: 99.0005 }, zoom: AREA_ZOOM })
    const [pai] = (await local.suggest('เวียงใต้ ปาย')).filter((row) => row.kind === 'area')
    expect(await local.pick(pai)).toMatchObject({ value: { lat: THAILAND_CENTER.lat, lng: THAILAND_CENTER.lng }, zoom: COUNTRY_ZOOM })
  })

  it('finds a spoken sample place', async () => {
    expect((await local.find('อยู่ตรงข้ามตลาดวโรรส เชียงใหม่'))?.value.text.startsWith('ตลาดวโรรส')).toBe(true)
  })

  it('names a point by the sample place next to it, keeping the exact point', async () => {
    const match = await local.reverse(18.7905, 99.001)
    expect(match).toMatchObject({ value: { text: 'ตลาดวโรรส เชียงใหม่', lat: 18.7905, lng: 99.001 }, confidence: NEAREST_CONFIDENCE })
  })

  it('still gives a point far from every sample place, without an address', async () => {
    const match = await local.reverse(15, 100)
    expect(match?.value).toEqual({ text: th.places.pinnedHere, lat: 15, lng: 100 })
  })
})
