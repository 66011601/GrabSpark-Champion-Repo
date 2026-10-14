import { describe, expect, it } from 'vitest'
import { th } from '@/copy/th.ts'
import { getAccount } from '@/services/merchantApi.ts'
import { pickFollowUp } from './followUp.ts'
import { applyUpdates, createEmptyProfile } from './profile.ts'

const account = getAccount()
const OLD_ORDER = ['storeName', 'category', 'location', 'hours', 'menu', 'phone'] as const

const afterLine1 = applyUpdates(createEmptyProfile(), {
  storeName: { value: 'ครัวป้าแดง', confidence: 0.93, heardFrom: 'x' },
  category: { value: 'อาหารไทย', confidence: 0.9, heardFrom: 'x' },
  location: { value: { text: 'ลาดพร้าว 71', lat: 13.8016, lng: 100.6033 }, confidence: 0.62, heardFrom: 'x' },
})
const afterHours = applyUpdates(afterLine1, {
  hours: { value: { open: '10:00', close: '20:00', closedDays: [] }, confidence: 0.95, heardFrom: 'x' },
})
const afterMenu = applyUpdates(afterHours, {
  menu: { value: [{ name: 'ชาไทยเย็น', priceTHB: 35 }], confidence: 0.9, heardFrom: 'x' },
})

describe('pickFollowUp', () => {
  it('opens with the free-talk prompt', () => {
    expect(pickFollowUp(createEmptyProfile(), [...OLD_ORDER], account)).toEqual({ field: null, text: th.followUp.open, chips: [] })
  })

  it('asks for opening hours after the opening sentence, with time chips', () => {
    const question = pickFollowUp(afterLine1, [...OLD_ORDER], account)
    expect(question?.field).toBe('hours')
    expect(question?.chips.map((chip) => chip.label)).toEqual([th.chips.hoursFullDay, th.chips.hoursMorning])
  })

  it('asks for the menu next, offering the photo scan', () => {
    const question = pickFollowUp(afterHours, [...OLD_ORDER], account)
    expect(question?.field).toBe('menu')
    expect(question?.chips).toEqual([{ label: th.chips.scanMenu, kind: 'scanMenu' }])
  })

  it('offers the logged-in phone number last', () => {
    const question = pickFollowUp(afterMenu, [...OLD_ORDER], account)
    expect(question?.field).toBe('phone')
    expect(question?.text).toContain('08x-xxx-4217')
    expect(question?.chips.map((chip) => chip.kind)).toEqual(['useAccountPhone', 'startMic'])
  })

  it('offers category chips when the category is missing', () => {
    const onlyName = applyUpdates(createEmptyProfile(), {
      storeName: { value: 'ครัวป้าแดง', confidence: 0.93, heardFrom: 'x' },
    })
    const question = pickFollowUp(onlyName, [...OLD_ORDER], account)
    expect(question?.field).toBe('category')
    expect(question?.chips).toHaveLength(4)
    expect(question?.chips.every((chip) => chip.kind === 'say')).toBe(true)
  })

  it('has nothing to ask once every field is heard', () => {
    const complete = applyUpdates(afterMenu, { phone: { value: account.phone, confidence: 1, heardFrom: 'x' } })
    expect(pickFollowUp(complete, [...OLD_ORDER], account)).toBeNull()
  })

  it('does not re-ask low-confidence fields (A2 flags them instead)', () => {
    expect(pickFollowUp(afterLine1, [...OLD_ORDER], account)?.field).not.toBe('location')
  })
})

describe('pickFollowUp with a step’s own fields', () => {
  it('asks only about the fields it is given', () => {
    const question = pickFollowUp(afterLine1, ['storeName', 'location', 'category', 'building'], account)
    expect(question).toEqual({ field: 'building', text: th.followUp.building, chips: [] })
  })

  it('is done when those fields are filled', () => {
    expect(pickFollowUp(afterLine1, ['storeName', 'category'], account)).toBeNull()
  })

  it('offers "use where I am" and "pin on the map" with the location question', () => {
    const afterName = applyUpdates(createEmptyProfile(), { storeName: { value: 'ครัวป้าแดง', confidence: 1, heardFrom: 'x' } })
    const question = pickFollowUp(afterName, ['storeName', 'location', 'category', 'building'], account)
    expect(question?.field).toBe('location')
    expect(question?.chips.map((chip) => chip.kind)).toEqual(['useDeviceLocation', 'pinOnMap'])
  })
})
