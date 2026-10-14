import { describe, expect, it } from 'vitest'
import script from '@/data/onboarding-script.json'
import { getLandmarks } from '@/services/merchantApi.ts'
import { DERIVED_CONFIDENCE } from './addressFields.ts'
import { businessUpdates, STEP3_TALK } from './businessTalk.ts'
import { applyUpdates, createEmptyProfile } from './profile.ts'

const landmarks = getLandmarks()
const line1 = script.lines[0].say

describe('businessUpdates', () => {
  it('asks about the 3/7 fields a merchant can say', () => {
    expect(STEP3_TALK).toEqual(['storeName', 'location', 'category', 'building'])
  })

  it('fills name, food type and location from the demo sentence, and drafts building and address', () => {
    const updates = businessUpdates(line1, { landmarks, profile: createEmptyProfile() })
    expect(updates.storeName?.value).toBe('ครัวป้าแดง')
    expect(updates.category?.value).toBe('อาหารไทย')
    expect(updates.location?.value.text).toBe('ลาดพร้าว 71 ตรงข้ามเซเว่น')
    expect(updates.building).toEqual({ value: 'ซอยลาดพร้าว 71 ถนนลาดพร้าว', confidence: DERIVED_CONFIDENCE, heardFrom: line1 })
    expect(updates.address?.value).toBe('ซอยลาดพร้าว 71 ถนนลาดพร้าว แขวงลาดพร้าว เขตลาดพร้าว กรุงเทพมหานคร 10230')
  })

  it('never fills hours or menu on this step', () => {
    const updates = businessUpdates('ร้านชื่อครัวป้าแดง เปิดสิบโมงถึงสองทุ่ม เมนูชาไทยสามสิบห้าบาท', { landmarks, profile: createEmptyProfile() })
    expect(updates.hours).toBeUndefined()
    expect(updates.menu).toBeUndefined()
  })

  it('keeps a building the merchant named over the drafted one', () => {
    const updates = businessUpdates('อยู่ตึกชินวัตร ลาดพร้าวซอยเจ็ดสิบเอ็ด', { landmarks, profile: createEmptyProfile() })
    expect(updates.building?.value).toBe('ตึกชินวัตร')
  })

  it('takes a bare answer when the companion asked for the building', () => {
    const updates = businessUpdates('ถนนลาดพร้าวค่ะ', { expecting: 'building', landmarks, profile: createEmptyProfile() })
    expect(updates.building?.value).toBe('ถนนลาดพร้าว')
  })

  it('never replaces an address the merchant already gave', () => {
    const typed = applyUpdates(createEmptyProfile(), { address: { value: '99 ถนนลาดพร้าว', confidence: 1, heardFrom: 'พิมพ์เอง' } })
    expect(businessUpdates(line1, { landmarks, profile: typed }).address).toBeUndefined()
  })

  it('uses a Google Maps match instead of the sample table when one is given', () => {
    const place = { value: { text: 'ตลาดโชคชัย 4', lat: 13.8, lng: 100.6 }, confidence: 0.9 }
    expect(businessUpdates('อยู่ตลาดโชคชัยสี่', { landmarks, profile: createEmptyProfile(), place }).location).toEqual({ ...place, heardFrom: 'อยู่ตลาดโชคชัยสี่' })
  })
})
