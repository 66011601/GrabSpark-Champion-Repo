import { describe, expect, it } from 'vitest'
import {
  applyUpdates,
  confirmField,
  countHeard,
  createEmptyProfile,
  isReadyForReview,
  needsCheck,
  PROFILE_FIELDS,
  reaskField,
  removeMenuItem,
} from './profile.ts'

const PIN = { text: 'ลาดพร้าว 71', lat: 13.8016, lng: 100.6033 }

describe('createEmptyProfile', () => {
  it('starts every field empty and offers the account phone', () => {
    const profile = createEmptyProfile()
    expect(PROFILE_FIELDS.every((key) => profile.fields[key].status === 'empty')).toBe(true)
    expect(profile.fields.phone.suggestFromAccount).toBe(true)
  })
})

describe('applyUpdates', () => {
  it('marks fields heard with confidence and source words', () => {
    const profile = applyUpdates(createEmptyProfile(), {
      storeName: { value: 'ครัวป้าแดง', confidence: 0.93, heardFrom: 'ร้านชื่อครัวป้าแดงค่ะ' },
    })
    expect(profile.fields.storeName).toEqual({ value: 'ครัวป้าแดง', status: 'heard', confidence: 0.93, heardFrom: 'ร้านชื่อครัวป้าแดงค่ะ' })
  })

  it('always asks for a pin check on a new location', () => {
    const profile = applyUpdates(createEmptyProfile(), { location: { value: PIN, confidence: 0.62, heardFrom: 'x' } })
    expect(profile.fields.location.needsPinCheck).toBe(true)
  })

  it('merges menus: same name is replaced, new names are appended', () => {
    const first = applyUpdates(createEmptyProfile(), {
      menu: { value: [{ name: 'ชาไทยเย็น', priceTHB: 30 }], confidence: 0.9, heardFrom: 'a' },
    })
    const second = applyUpdates(first, {
      menu: { value: [{ name: 'ชาไทยเย็น', priceTHB: 35 }, { name: 'น้ำกระเจี๊ยบ', priceTHB: 30 }], confidence: 0.9, heardFrom: 'b' },
    })
    expect(second.fields.menu.value).toEqual([
      { name: 'ชาไทยเย็น', priceTHB: 35 },
      { name: 'น้ำกระเจี๊ยบ', priceTHB: 30 },
    ])
  })

  it('does not change the profile it was given', () => {
    const profile = createEmptyProfile()
    applyUpdates(profile, { category: { value: 'อาหารไทย', confidence: 0.9, heardFrom: 'x' } })
    expect(profile.fields.category.status).toBe('empty')
  })
})

describe('confirmField', () => {
  it('confirms a heard field', () => {
    const heard = applyUpdates(createEmptyProfile(), { category: { value: 'อาหารไทย', confidence: 0.9, heardFrom: 'x' } })
    expect(confirmField(heard, 'category').fields.category.status).toBe('confirmed')
  })

  it('clears the pin check when the location is confirmed', () => {
    const heard = applyUpdates(createEmptyProfile(), { location: { value: PIN, confidence: 0.62, heardFrom: 'x' } })
    const confirmed = confirmField(heard, 'location')
    expect(confirmed.fields.location.status).toBe('confirmed')
    expect(confirmed.fields.location.needsPinCheck).toBe(false)
  })

  it('cannot confirm an empty field', () => {
    const profile = createEmptyProfile()
    expect(confirmField(profile, 'hours')).toBe(profile)
  })
})

describe('reaskField', () => {
  it('empties the field so the companion asks again', () => {
    const heard = applyUpdates(createEmptyProfile(), { storeName: { value: 'ครัว', confidence: 0.85, heardFrom: 'ครัว' } })
    expect(reaskField(heard, 'storeName').fields.storeName).toEqual({ value: null, status: 'empty', confidence: undefined, heardFrom: undefined })
  })
})

describe('removeMenuItem', () => {
  const withMenu = applyUpdates(createEmptyProfile(), {
    menu: { value: [{ name: 'ก', priceTHB: 10 }, { name: 'ข', priceTHB: 20 }], confidence: 0.9, heardFrom: 'x' },
  })

  it('removes one item', () => {
    expect(removeMenuItem(withMenu, 'ก').fields.menu.value).toEqual([{ name: 'ข', priceTHB: 20 }])
  })

  it('empties the field when the last item goes', () => {
    const none = removeMenuItem(removeMenuItem(withMenu, 'ก'), 'ข')
    expect(none.fields.menu.status).toBe('empty')
  })
})

describe('needsCheck', () => {
  it('flags heard fields below 0.8', () => {
    expect(needsCheck({ status: 'heard', confidence: 0.62 })).toBe(true)
    expect(needsCheck({ status: 'heard', confidence: 0.9 })).toBe(false)
  })

  it('never flags confirmed fields', () => {
    expect(needsCheck({ status: 'confirmed', confidence: 0.62 })).toBe(false)
  })
})

describe('progress', () => {
  it('counts heard fields and knows when review can start', () => {
    let profile = createEmptyProfile()
    expect(countHeard(profile)).toBe(0)
    expect(isReadyForReview(profile)).toBe(false)
    profile = applyUpdates(profile, {
      storeName: { value: 'ครัวป้าแดง', confidence: 0.93, heardFrom: 'x' },
      category: { value: 'อาหารไทย', confidence: 0.9, heardFrom: 'x' },
      location: { value: PIN, confidence: 0.62, heardFrom: 'x' },
      hours: { value: { open: '10:00', close: '20:00', closedDays: [] }, confidence: 0.95, heardFrom: 'x' },
      menu: { value: [{ name: 'ชาไทยเย็น', priceTHB: 35 }], confidence: 0.9, heardFrom: 'x' },
      phone: { value: '0812344217', confidence: 1, heardFrom: 'x' },
    })
    expect(countHeard(profile)).toBe(6)
    expect(isReadyForReview(profile)).toBe(true)
  })
})
