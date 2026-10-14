import { describe, expect, it } from 'vitest'
import raw from '@/data/thai-address.json'
import {
  applyCompletion,
  areaCompletions,
  decodeAreas,
  fixPostcode,
  loadAreas,
  postcodeMismatch,
  searchAreas,
  type CompactDb,
} from './thaiAddressDb.ts'

const areas = decodeAreas(raw as unknown as CompactDb)
const CHANG_MOI = { subdistrict: 'ช้างม่อย', district: 'เมืองเชียงใหม่', province: 'เชียงใหม่', postcode: '50300' }

describe('decodeAreas', () => {
  it('unpacks every sub-district of Thailand with its postcode', () => {
    expect(areas).toHaveLength(7438)
    expect(areas).toContainEqual(CHANG_MOI)
    expect(areas).toContainEqual({ subdistrict: 'ลาดพร้าว', district: 'ลาดพร้าว', province: 'กรุงเทพมหานคร', postcode: '10230' })
  })

  it('loads the same data on first use', async () => {
    expect(await loadAreas()).toHaveLength(7438)
  })
})

describe('searchAreas', () => {
  it('finds areas by the start of a postcode', () => {
    const found = searchAreas(areas, '40000', 50)
    expect(found.every((area) => area.postcode === '40000')).toBe(true)
    expect(found).toContainEqual({ subdistrict: 'ในเมือง', district: 'เมืองขอนแก่น', province: 'ขอนแก่น', postcode: '40000' })
  })

  it('finds a sub-district by name, with or without ต.', () => {
    expect(searchAreas(areas, 'ช้างม่อย')[0]).toEqual(CHANG_MOI)
    expect(searchAreas(areas, 'ต.ช้างม่อย')[0]).toEqual(CHANG_MOI)
  })

  it('narrows a common name with the district or province after it', () => {
    const found = searchAreas(areas, 'ในเมือง ขอนแก่น', 10)
    expect(found.length).toBeGreaterThan(0)
    expect(found.every((area) => area.province === 'ขอนแก่น')).toBe(true)
  })

  it('needs at least two letters or three digits', () => {
    expect(searchAreas(areas, 'ก')).toEqual([])
    expect(searchAreas(areas, '40')).toEqual([])
  })
})

describe('fixPostcode', () => {
  it('replaces a postcode that does not belong to the sub-district', () => {
    expect(fixPostcode(areas, { ...CHANG_MOI, postcode: '55520' }).postcode).toBe('50300')
  })

  it('returns the same parts when they are right or unknown', () => {
    const parts = { ...CHANG_MOI }
    expect(fixPostcode(areas, parts)).toBe(parts)
    const unknown = { road: 'ไม่มีจริง' }
    expect(fixPostcode(areas, unknown)).toBe(unknown)
  })
})

describe('postcodeMismatch', () => {
  it('notices a postcode from another province', () => {
    expect(postcodeMismatch(areas, '12 ต.ช้างม่อย อ.เมืองเชียงใหม่ จ.เชียงใหม่ 40000')).toEqual({ postcode: '40000', said: 'เชียงใหม่', actual: 'ขอนแก่น' })
  })

  it('is quiet when the postcode fits, or when there is nothing to compare', () => {
    expect(postcodeMismatch(areas, '12 ต.ช้างม่อย อ.เมืองเชียงใหม่ จ.เชียงใหม่ 50300')).toBeNull()
    expect(postcodeMismatch(areas, '12 ถนนลาดพร้าว')).toBeNull()
  })
})

describe('areaCompletions and applyCompletion', () => {
  it('offers areas for the last word typed', () => {
    expect(areaCompletions(areas, '12/3 หมู่ 4 ช้างม่')[0]).toEqual(CHANG_MOI)
  })

  it('offers nothing once the address already has its area and postcode', () => {
    expect(areaCompletions(areas, '12 ต.ช้างม่อย อ.เมืองเชียงใหม่ จ.เชียงใหม่ 50300')).toEqual([])
  })

  it('replaces the last word, and a ต. typed before it, with the whole area', () => {
    expect(applyCompletion('12/3 หมู่ 4 ต. ช้างม่', CHANG_MOI)).toBe('12/3 หมู่ 4 ต.ช้างม่อย อ.เมืองเชียงใหม่ จ.เชียงใหม่ 50300')
  })
})
