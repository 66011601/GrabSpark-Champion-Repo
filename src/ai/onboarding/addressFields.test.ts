import { describe, expect, it } from 'vitest'
import { addressFromLocation, DERIVED_CONFIDENCE, MAP_ADDRESS_CONFIDENCE } from './addressFields.ts'

describe('addressFromLocation', () => {
  it('drafts the building/street and the address from a sample place, asking for a check', () => {
    expect(addressFromLocation({ text: 'ลาดพร้าว 71', lat: 13.8, lng: 100.6 }, 'x')).toEqual({
      building: { value: 'ลาดพร้าว 71', confidence: DERIVED_CONFIDENCE, heardFrom: 'x' },
      address: { value: 'ลาดพร้าว 71', confidence: DERIVED_CONFIDENCE, heardFrom: 'x' },
    })
  })

  it('uses the map’s full address when Google Maps gave one', () => {
    const point = { text: 'ลาดพร้าว 71', address: '71 ซ. ลาดพร้าว 71 แขวงสะพานสอง เขตวังทองหลาง กรุงเทพมหานคร 10310', lat: 13.8, lng: 100.6 }
    expect(addressFromLocation(point, 'x').address).toEqual({ value: point.address, confidence: MAP_ADDRESS_CONFIDENCE, heardFrom: 'x' })
  })
})
