import { describe, expect, it } from 'vitest'
import { parseMenuItems } from './menuItems.ts'

describe('parseMenuItems', () => {
  it('reads the five-item demo script line', () => {
    const line = 'น้ำพริกกะปิปลาทูแปดสิบเก้า กะเพราหมูสับหกสิบห้า แกงเขียวหวานเจ็ดสิบห้า ชาไทยเย็นสามสิบห้า น้ำกระเจี๊ยบสามสิบบาท'
    expect(parseMenuItems(line)).toEqual([
      { name: 'น้ำพริกกะปิปลาทู', priceTHB: 89 },
      { name: 'กะเพราหมูสับ', priceTHB: 65 },
      { name: 'แกงเขียวหวาน', priceTHB: 75 },
      { name: 'ชาไทยเย็น', priceTHB: 35 },
      { name: 'น้ำกระเจี๊ยบ', priceTHB: 30 },
    ])
  })

  it('reads digit prices', () => {
    expect(parseMenuItems('ข้าวมันไก่ 50 ต้มเลือดหมู 40 บาท')).toEqual([
      { name: 'ข้าวมันไก่', priceTHB: 50 },
      { name: 'ต้มเลือดหมู', priceTHB: 40 },
    ])
  })

  it('drops filler words around names', () => {
    expect(parseMenuItems('มีข้าวมันไก่ห้าสิบบาท แล้วก็ต้มเลือดหมูสี่สิบบาทค่ะ')).toEqual([
      { name: 'ข้าวมันไก่', priceTHB: 50 },
      { name: 'ต้มเลือดหมู', priceTHB: 40 },
    ])
  })

  it('does not read number words inside other words as prices', () => {
    expect(parseMenuItems('ข้าวหอมมะลิพันธุ์ดี 60 บาท')).toEqual([{ name: 'ข้าวหอมมะลิพันธุ์ดี', priceTHB: 60 }])
  })

  it('accepts a ฿5 item and ignores amounts below that', () => {
    expect(parseMenuItems('ลูกชิ้น 5 บาท')).toEqual([{ name: 'ลูกชิ้น', priceTHB: 5 }])
    expect(parseMenuItems('น้ำแข็ง 3 บาท')).toEqual([])
  })

  it('returns nothing without prices', () => {
    expect(parseMenuItems('ยังไม่แน่ใจค่ะ')).toEqual([])
  })

  it('keeps dish names that start like a filler word', () => {
    expect(parseMenuItems('คะน้าหมูกรอบ 60 บาท')).toEqual([{ name: 'คะน้าหมูกรอบ', priceTHB: 60 }])
    expect(parseMenuItems('กับแกล้มหมูทอด 80 บาท')).toEqual([{ name: 'กับแกล้มหมูทอด', priceTHB: 80 }])
  })

  it('keeps the particle after a price out of the next name', () => {
    expect(parseMenuItems('ข้าวมันไก่ห้าสิบบาทนะคะ ต้มเลือดหมูสี่สิบบาท')).toEqual([
      { name: 'ข้าวมันไก่', priceTHB: 50 },
      { name: 'ต้มเลือดหมู', priceTHB: 40 },
    ])
  })

  it('needs a pause or บาท after a price', () => {
    expect(parseMenuItems('ปลาแปดริ้ว 80 บาท')).toEqual([{ name: 'ปลาแปดริ้ว', priceTHB: 80 }])
  })

  it('only takes a bare particle after a price when a pause follows', () => {
    expect(parseMenuItems('ข้าวมันไก่ 50 คะน้าหมูกรอบ 60 บาท')).toEqual([
      { name: 'ข้าวมันไก่', priceTHB: 50 },
      { name: 'คะน้าหมูกรอบ', priceTHB: 60 },
    ])
    expect(parseMenuItems('ผัดไทยห้าสิบ คะน้าหมูกรอบหกสิบ')).toEqual([
      { name: 'ผัดไทย', priceTHB: 50 },
      { name: 'คะน้าหมูกรอบ', priceTHB: 60 },
    ])
    expect(parseMenuItems('ข้าวมันไก่ห้าสิบบาทครับต้มเลือดหมูสี่สิบบาท')).toEqual([
      { name: 'ข้าวมันไก่', priceTHB: 50 },
      { name: 'ต้มเลือดหมู', priceTHB: 40 },
    ])
  })

  it('never reads a soi or house number as a price', () => {
    expect(parseMenuItems('ลาดพร้าวซอย 71 ตรงข้ามเซเว่น')).toEqual([])
    expect(parseMenuItems('อยู่ซอยเจ็ดสิบเอ็ด ')).toEqual([])
  })
})
