import { describe, expect, it } from 'vitest'
import { th } from '@/copy/th.ts'
import { addressFromLocation, DERIVED_CONFIDENCE, MAP_ADDRESS_CONFIDENCE, redraftAddress, withArea } from './addressFields.ts'
import { applyUpdates, confirmField, createEmptyProfile } from './profile.ts'

const BARE = { text: 'ลาดพร้าว 71', lat: 13.8, lng: 100.6 }
const WITH_PARTS = {
  text: 'ตลาดวโรรส เชียงใหม่',
  parts: { road: 'ข่วงเมรุ', subdistrict: 'ช้างม่อย', district: 'เมืองเชียงใหม่', province: 'เชียงใหม่', postcode: '50300' },
  address: 'ถนนข่วงเมรุ ต.ช้างม่อย อ.เมืองเชียงใหม่ จ.เชียงใหม่ 50300',
  lat: 18.79,
  lng: 99.0,
}

describe('addressFromLocation', () => {
  it('drafts both boxes from the place name when nothing more is known', () => {
    expect(addressFromLocation(BARE, 'x')).toEqual({
      building: { value: 'ลาดพร้าว 71', confidence: DERIVED_CONFIDENCE, heardFrom: 'x' },
      address: { value: 'ลาดพร้าว 71', confidence: DERIVED_CONFIDENCE, heardFrom: 'x' },
    })
  })

  it('uses the street for the building box and the full address, amber unless the merchant picked the place', () => {
    expect(addressFromLocation(WITH_PARTS, 'x')).toEqual({
      building: { value: 'ถนนข่วงเมรุ', confidence: DERIVED_CONFIDENCE, heardFrom: 'x' },
      address: { value: WITH_PARTS.address, confidence: DERIVED_CONFIDENCE, heardFrom: 'x' },
    })
    expect(addressFromLocation(WITH_PARTS, 'x', true).address?.confidence).toBe(MAP_ADDRESS_CONFIDENCE)
  })
})

describe('addressFromLocation for a dropped pin', () => {
  it('drafts nothing from the "pinned here" label', () => {
    expect(addressFromLocation({ text: th.places.pinnedHere, lat: 13.8, lng: 100.6 }, 'x')).toEqual({})
  })
})

describe('addressFromLocation for a pin with an area but no street', () => {
  it('drafts the address but never "pinned here" as the building', () => {
    const point = {
      text: th.places.pinnedHere,
      parts: { subdistrict: 'ดอนช้าง', district: 'เมืองขอนแก่น', province: 'ขอนแก่น', postcode: '40000' },
      address: 'ต.ดอนช้าง อ.เมืองขอนแก่น จ.ขอนแก่น 40000',
      lat: 16.4,
      lng: 102.8,
    }
    const drafts = addressFromLocation(point, 'x')
    expect(drafts.building).toBeUndefined()
    expect(drafts.address?.value).toBe(point.address)
  })
})

describe('withArea', () => {
  const AREA = { subdistrict: 'ดอนช้าง', district: 'เมืองขอนแก่น', province: 'ขอนแก่น', postcode: '40000' }
  const KHON_KAEN = 'ต.ดอนช้าง อ.เมืองขอนแก่น จ.ขอนแก่น 40000'

  it('adds the picked ตำบล and postcode to a map answer that lacks them', () => {
    const point = { text: 'x', parts: { district: 'เมืองขอนแก่น', province: 'ขอนแก่น' }, address: 'อ.เมืองขอนแก่น จ.ขอนแก่น', lat: 16.4, lng: 102.8 }
    const merged = withArea(point, AREA)
    expect(merged.parts).toEqual({ district: 'เมืองขอนแก่น', province: 'ขอนแก่น', subdistrict: 'ดอนช้าง', postcode: '40000' })
    expect(merged.address).toBe(KHON_KAEN)
    expect(merged.lat).toBe(16.4)
  })

  it('leaves a pin in another province or sub-district alone', () => {
    const elsewhere = { text: 'x', parts: { district: 'เมืองเชียงใหม่', province: 'เชียงใหม่' }, lat: 18.8, lng: 99 }
    expect(withArea(elsewhere, AREA)).toBe(elsewhere)
    const otherSub = { text: 'x', parts: { subdistrict: 'ในเมือง', district: 'เมืองขอนแก่น', province: 'ขอนแก่น' }, lat: 16.4, lng: 102.8 }
    expect(withArea(otherSub, AREA)).toBe(otherSub)
  })

  it('gives a pin with no parts the area as its address', () => {
    const merged = withArea({ text: th.places.pinnedHere, lat: 16.4, lng: 102.8 }, AREA)
    expect(merged.parts).toEqual(AREA)
    expect(merged.address).toBe(KHON_KAEN)
  })
})

describe('redraftAddress', () => {
  it('replaces drafts but keeps what the merchant typed or confirmed', () => {
    const drafted = applyUpdates(createEmptyProfile(), addressFromLocation(BARE, 'x'))
    expect(redraftAddress(drafted, WITH_PARTS, 'pin').address?.value).toBe(WITH_PARTS.address)

    const typed = applyUpdates(createEmptyProfile(), { address: { value: '99 ถนนลาดพร้าว', confidence: 1, heardFrom: th.sources.typed } })
    expect(redraftAddress(typed, WITH_PARTS, 'pin').address).toBeUndefined()

    const confirmed = confirmField(drafted, 'building')
    expect(redraftAddress(confirmed, WITH_PARTS, 'pin').building).toBeUndefined()
  })
})
