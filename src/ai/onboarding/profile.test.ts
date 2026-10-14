import { describe, expect, it } from 'vitest'
import {
  applyUpdates,
  confirmField,
  countHeard,
  createEmptyProfile,
  DOC_FIELDS,
  isReadyForReview,
  missingDocs,
  needsCheck,
  onlyEmptyFields,
  reaskField,
  removeMenuItem,
  REVIEW_FIELDS,
  TALK_FIELDS,
} from './profile.ts'

const PIN = { text: 'ลาดพร้าว 71', lat: 13.8016, lng: 100.6033 }

describe('createEmptyProfile', () => {
  it('starts every field empty and offers the account phone', () => {
    const profile = createEmptyProfile()
    expect(REVIEW_FIELDS.every((key) => profile.fields[key].status === 'empty')).toBe(true)
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

const OWNER = { value: { title: 'นาง', name: 'แดง ใจดี', idNumber: '1234567890121' }, confidence: 0.97, heardFrom: 'รูปบัตรประชาชน' }
const PAYOUT = {
  value: { bankName: 'ธนาคารกสิกรไทย', accountNumber: '1234567890', accountName: 'นาง แดง ใจดี' },
  confidence: 0.95,
  heardFrom: 'รูปสมุดบัญชี',
}

describe('field groups', () => {
  it('talks about six fields and scans two', () => {
    expect(TALK_FIELDS).toEqual(['storeName', 'category', 'location', 'hours', 'menu', 'phone'])
    expect(DOC_FIELDS).toEqual(['owner', 'payout'])
    expect(REVIEW_FIELDS).toEqual([...TALK_FIELDS, ...DOC_FIELDS])
  })

  it('applies scanned document values as drafts', () => {
    const profile = applyUpdates(createEmptyProfile(), { owner: OWNER })
    expect(profile.fields.owner).toEqual({ ...OWNER, status: 'heard' })
  })

  it('does not wait for documents before review is possible from A1', () => {
    const talked = applyUpdates(createEmptyProfile(), {
      storeName: { value: 'ครัวป้าแดง', confidence: 0.93, heardFrom: 'x' },
      category: { value: 'อาหารไทย', confidence: 0.9, heardFrom: 'x' },
      location: { value: PIN, confidence: 0.62, heardFrom: 'x' },
      hours: { value: { open: '10:00', close: '20:00', closedDays: [] }, confidence: 0.95, heardFrom: 'x' },
      menu: { value: [{ name: 'ชาไทยเย็น', priceTHB: 35 }], confidence: 0.9, heardFrom: 'x' },
      phone: { value: '0812344217', confidence: 1, heardFrom: 'x' },
    })
    expect(isReadyForReview(talked)).toBe(true)
    expect(countHeard(talked)).toBe(6)
  })
})

describe('missingDocs', () => {
  it('asks for the ID card and the bank book until both are scanned', () => {
    const empty = createEmptyProfile()
    expect(missingDocs(empty)).toEqual(['idCard', 'bankBook'])
    expect(missingDocs(applyUpdates(empty, { owner: OWNER }))).toEqual(['bankBook'])
    expect(missingDocs(applyUpdates(empty, { owner: OWNER, payout: PAYOUT }))).toEqual([])
  })
})

describe('onlyEmptyFields', () => {
  it('drops updates for heard and confirmed fields and keeps them for empty ones', () => {
    const heard = applyUpdates(createEmptyProfile(), { storeName: { value: 'ร้านของฉัน', confidence: 0.9, heardFrom: 'x' } })
    const profile = confirmField(
      applyUpdates(heard, { category: { value: 'อาหารไทย', confidence: 0.9, heardFrom: 'x' } }),
      'category',
    )
    const incoming = {
      storeName: { value: 'ครัวป้าแดง', confidence: 0.93, heardFrom: 'menu' },
      category: { value: 'ก๋วยเตี๋ยว', confidence: 0.9, heardFrom: 'menu' },
      menu: { value: [{ name: 'ชาไทยเย็น', priceTHB: 35 }], confidence: 0.9, heardFrom: 'menu' },
    }
    expect(onlyEmptyFields(profile, incoming)).toEqual({ menu: incoming.menu })
  })
})
