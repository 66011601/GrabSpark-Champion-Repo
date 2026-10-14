import { describe, expect, it } from 'vitest'
import { BANGKOK, findProvince, formatThaiAddress, parseThaiAddress, PROVINCES, streetLine } from './thaiAddress.ts'

describe('findProvince', () => {
  it('knows all 77 provinces and the names people say', () => {
    expect(PROVINCES).toHaveLength(77)
    expect(findProvince('ขอนแก่น')).toBe('ขอนแก่น')
    expect(findProvince('จ.เชียงใหม่')).toBe('เชียงใหม่')
    expect(findProvince('กทม.')).toBe(BANGKOK)
    expect(findProvince('โคราช')).toBe('นครราชสีมา')
    expect(findProvince('ลาดพร้าว')).toBeNull()
  })
})

describe('parseThaiAddress', () => {
  it('reads a spoken address with spoken numbers and a province without its label', () => {
    expect(parseThaiAddress('สิบสองทับสาม หมู่สี่ ตำบลในเมือง อำเภอเมือง ขอนแก่น')).toEqual({
      houseNo: '12/3',
      moo: '4',
      subdistrict: 'ในเมือง',
      district: 'เมืองขอนแก่น',
      province: 'ขอนแก่น',
    })
  })

  it('reads a written address with abbreviations and a postcode', () => {
    expect(parseThaiAddress('99 ม.5 ถ.มิตรภาพ ต.ช้างม่อย อ.เมืองเชียงใหม่ จ.เชียงใหม่ 50300')).toEqual({
      houseNo: '99',
      moo: '5',
      road: 'มิตรภาพ',
      subdistrict: 'ช้างม่อย',
      district: 'เมืองเชียงใหม่',
      province: 'เชียงใหม่',
      postcode: '50300',
    })
  })

  it('reads a Bangkok address, a soi with a spoken number and a postcode said digit by digit', () => {
    expect(parseThaiAddress('บ้านเลขที่ 45 ซอยลาดพร้าวเจ็ดสิบเอ็ด แขวงลาดพร้าว เขตลาดพร้าว กทม หนึ่งศูนย์สองสามศูนย์ค่ะ')).toEqual({
      houseNo: '45',
      soi: 'ลาดพร้าว71',
      subdistrict: 'ลาดพร้าว',
      district: 'ลาดพร้าว',
      province: BANGKOK,
      postcode: '10230',
    })
  })

  it('takes แขวง and เขต as Bangkok when no province is said', () => {
    expect(parseThaiAddress('แขวงสามเสนใน เขตพญาไท')).toEqual({ subdistrict: 'สามเสนใน', district: 'พญาไท', province: BANGKOK })
  })

  it('reads Thai digits and a house number after อยู่', () => {
    expect(parseThaiAddress('อยู่ ๑๒/๓ ต.ในเมือง อ.เมืองขอนแก่น จ.ขอนแก่น')?.houseNo).toBe('12/3')
  })

  it('accepts a province and a postcode on their own', () => {
    expect(parseThaiAddress('ขอนแก่น 40000')).toEqual({ province: 'ขอนแก่น', postcode: '40000' })
  })

  it('does not take หมู่บ้าน (a village name) for หมู่', () => {
    expect(parseThaiAddress('หมู่บ้านสุขใจ ต.ในเมือง อ.เมืองขอนแก่น')?.moo).toBeUndefined()
  })

  it('returns null for talk that is not an address', () => {
    expect(parseThaiAddress('ร้านชื่อครัวป้าแดงค่ะ ขายน้ำพริกปลาทู อาหารไทยบ้านๆ อยู่ลาดพร้าวซอยเจ็ดสิบเอ็ด ตรงข้ามเซเว่น')).toBeNull()
    expect(parseThaiAddress('อยู่เชียงใหม่')).toBeNull()
    expect(parseThaiAddress('ถนนลาดพร้าวค่ะ')).toBeNull()
  })
})

describe('formatThaiAddress', () => {
  const khonKaen = { houseNo: '12/3', moo: '4', road: 'มิตรภาพ', subdistrict: 'ในเมือง', district: 'เมืองขอนแก่น', province: 'ขอนแก่น', postcode: '40000' }
  const latPhrao = { soi: 'ลาดพร้าว 71', road: 'ลาดพร้าว', subdistrict: 'ลาดพร้าว', district: 'ลาดพร้าว', province: BANGKOK, postcode: '10230' }

  it('writes ต. อ. จ. outside Bangkok', () => {
    expect(formatThaiAddress(khonKaen)).toBe('12/3 หมู่ 4 ถนนมิตรภาพ ต.ในเมือง อ.เมืองขอนแก่น จ.ขอนแก่น 40000')
  })

  it('writes แขวง and เขต in Bangkok, with no จ.', () => {
    expect(formatThaiAddress(latPhrao)).toBe('ซอยลาดพร้าว 71 ถนนลาดพร้าว แขวงลาดพร้าว เขตลาดพร้าว กรุงเทพมหานคร 10230')
  })

  it('never doubles ซอย or ถนน', () => {
    expect(streetLine({ soi: 'ซอย 7', road: 'ถนนนิมมานเหมินท์' })).toBe('ซอย 7 ถนนนิมมานเหมินท์')
  })

  it('reads back what it writes', () => {
    expect(parseThaiAddress(formatThaiAddress(khonKaen))).toEqual(khonKaen)
    expect(parseThaiAddress(formatThaiAddress(latPhrao))).toEqual(latPhrao)
  })
})
