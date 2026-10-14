import { describe, expect, it } from 'vitest'
import { th } from '@/copy/th.ts'
import { addressFromLocation, DERIVED_CONFIDENCE, MAP_ADDRESS_CONFIDENCE, redraftAddress } from './addressFields.ts'
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
