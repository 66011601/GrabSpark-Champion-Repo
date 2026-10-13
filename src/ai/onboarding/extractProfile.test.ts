import { describe, expect, it } from 'vitest'
import landmarks from '@/data/landmarks.json'
import { extractProfile, HOURS_CONFIDENCE, MENU_CONFIDENCE } from './extractProfile.ts'

const LINE_1 = 'ร้านชื่อครัวป้าแดงค่ะ ขายน้ำพริกปลาทู อาหารไทยบ้านๆ อยู่ลาดพร้าวซอยเจ็ดสิบเอ็ด ตรงข้ามเซเว่น'
const LINE_2 = 'สิบโมงเช้าถึงสองทุ่ม เปิดทุกวัน'
const LINE_3 = 'น้ำพริกกะปิปลาทูแปดสิบเก้า กะเพราหมูสับหกสิบห้า แกงเขียวหวานเจ็ดสิบห้า ชาไทยเย็นสามสิบห้า น้ำกระเจี๊ยบสามสิบบาท'

describe('extractProfile: open talk', () => {
  it('fills name, category and location from the opening sentence', () => {
    const updates = extractProfile(LINE_1, { landmarks })
    expect(Object.keys(updates).sort()).toEqual(['category', 'location', 'storeName'])
    expect(updates.storeName).toEqual({ value: 'ครัวป้าแดง', confidence: 0.93, heardFrom: LINE_1 })
    expect(updates.category?.value).toBe('อาหารไทย')
    expect(updates.location?.value.text).toBe('ลาดพร้าว 71 ตรงข้ามเซเว่น')
  })

  it('does not read the soi number as a dish price', () => {
    expect(extractProfile(LINE_1, { landmarks }).menu).toBeUndefined()
  })

  it('reads a menu in open talk when the merchant talks about prices', () => {
    expect(extractProfile('มีเมนูข้าวมันไก่ห้าสิบบาท', { landmarks }).menu?.value).toEqual([{ name: 'ข้าวมันไก่', priceTHB: 50 }])
  })

  it('returns nothing for silence', () => {
    expect(extractProfile('   ', { landmarks })).toEqual({})
  })
})

describe('extractProfile: answering a question', () => {
  it('reads opening hours', () => {
    expect(extractProfile(LINE_2, { expecting: 'hours', landmarks }).hours).toEqual({
      value: { open: '10:00', close: '20:00', closedDays: [] },
      confidence: HOURS_CONFIDENCE,
      heardFrom: LINE_2,
    })
  })

  it('reads the full menu', () => {
    const menu = extractProfile(LINE_3, { expecting: 'menu', landmarks }).menu
    expect(menu?.value).toHaveLength(5)
    expect(menu?.confidence).toBe(MENU_CONFIDENCE)
  })

  it('takes a bare answer as the store name', () => {
    expect(extractProfile('ครัวป้าแดงค่ะ', { expecting: 'storeName', landmarks }).storeName?.value).toBe('ครัวป้าแดง')
  })

  it('reads a spoken phone number', () => {
    expect(extractProfile('ศูนย์แปดหนึ่ง สองสามสี่ สี่สองหนึ่งเจ็ด', { expecting: 'phone', landmarks }).phone?.value).toBe('0812344217')
  })

  it('only looks for the field that was asked about', () => {
    expect(Object.keys(extractProfile(LINE_1, { expecting: 'hours', landmarks }))).toEqual([])
  })

  it('returns nothing when the answer cannot be understood', () => {
    expect(extractProfile('ไม่แน่ใจค่ะ', { expecting: 'hours', landmarks })).toEqual({})
  })
})
