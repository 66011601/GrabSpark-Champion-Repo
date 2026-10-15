import { describe, expect, it } from 'vitest'
import { parseClosedDays, parseOpeningHours, parseThaiTime } from './thaiTime.ts'

describe('parseThaiTime', () => {
  // Every row of spec §6.4, plus digit forms and half hours.
  it.each([
    ['เจ็ดโมงเช้า', '07:00'],
    ['เจ็ดโมง', '07:00'],
    ['สิบโมง', '10:00'],
    ['สิบโมงเช้า', '10:00'],
    ['เที่ยง', '12:00'],
    ['เที่ยงวัน', '12:00'],
    ['บ่ายโมง', '13:00'],
    ['บ่ายสาม', '15:00'],
    ['บ่ายสามโมง', '15:00'],
    ['ห้าโมงเย็น', '17:00'],
    ['หกโมงเย็น', '18:00'],
    ['ทุ่มนึง', '19:00'],
    ['หนึ่งทุ่ม', '19:00'],
    ['สองทุ่ม', '20:00'],
    ['สามทุ่ม', '21:00'],
    ['เที่ยงคืน', '00:00'],
    ['ตีหนึ่ง', '01:00'],
    ['ตีห้า', '05:00'],
    ['สองโมง', '14:00'],
    ['สิบโมงครึ่ง', '10:30'],
    ['สองทุ่มครึ่ง', '20:30'],
    ['10 โมง', '10:00'],
    ['20:00', '20:00'],
    ['20.00 น.', '20:00'],
  ])('%s → %s', (spoken, expected) => {
    expect(parseThaiTime(spoken)).toBe(expected)
  })

  it('returns null when there is no time', () => {
    expect(parseThaiTime('ขายน้ำพริกปลาทู')).toBeNull()
  })
})

describe('parseClosedDays', () => {
  it('works out the closed days from the days the shop opens', () => {
    expect(parseClosedDays('ป้าน่าจะเปิดจันทร์ถึงศุกร์และที่เหลือหยุด')).toEqual(['sat', 'sun'])
    expect(parseClosedDays('เปิดแค่วันเสาร์อาทิตย์')).toEqual(['mon', 'tue', 'wed', 'thu', 'fri'])
    expect(parseClosedDays('เปิดวันธรรมดา')).toEqual(['sat', 'sun'])
    expect(parseClosedDays('ขายวันธรรมดา นอกนั้นไม่เปิด')).toEqual(['sat', 'sun'])
    expect(parseClosedDays('เปิดพุธถึงอาทิตย์')).toEqual(['mon', 'tue'])
    expect(parseClosedDays('เปิดศุกร์ถึงจันทร์')).toEqual(['tue', 'wed', 'thu'])
  })

  it('hears days the shop does not open', () => {
    expect(parseClosedDays('วันเสาร์อาทิตย์ไม่เปิด')).toEqual(['sat', 'sun'])
    expect(parseClosedDays('ไม่ได้เปิดวันพุธ')).toEqual(['wed'])
    expect(parseClosedDays('สุดสัปดาห์หยุด')).toEqual(['sat', 'sun'])
  })


  it('reads days after "หยุด"', () => {
    expect(parseClosedDays('หยุดวันเสาร์กับวันอาทิตย์')).toEqual(['sat', 'sun'])
  })

  it('is empty when open every day', () => {
    expect(parseClosedDays('เปิดทุกวัน')).toEqual([])
  })

  it('ignores days after "เปิด" in a closed-day phrase', () => {
    expect(parseClosedDays('หยุดวันอาทิตย์ เปิดจันทร์ถึงเสาร์')).toEqual(['sun'])
    expect(parseClosedDays('หยุดวันอาทิตย์ เปิดวันเสาร์')).toEqual(['sun'])
  })

  it('reads "ปิด" as a closed verb', () => {
    expect(parseClosedDays('ปิดวันอาทิตย์')).toEqual(['sun'])
    expect(parseClosedDays('ปิดทุกวันอาทิตย์')).toEqual(['sun'])
  })

  it('reads a day said before the closed verb', () => {
    expect(parseClosedDays('วันอาทิตย์หยุด')).toEqual(['sun'])
  })

  it('does not take a closing time for a closed day', () => {
    expect(parseClosedDays('ปิดสองทุ่ม')).toEqual([])
    expect(parseClosedDays('เปิดสิบโมงถึงสองทุ่ม เปิดทุกวัน')).toEqual([])
  })

  it('does not read the end of an open range as closed', () => {
    expect(parseClosedDays('เปิดจันทร์ถึงเสาร์หยุดวันอาทิตย์')).toEqual(['sun'])
    expect(parseClosedDays('เปิดจันทร์ถึงเสาร์ ปิดสองทุ่ม')).toEqual(['sun']) // open Monday to Saturday: Sunday is closed
  })

  it('reads a day said before the closed verb with a space', () => {
    expect(parseClosedDays('วันอาทิตย์ หยุด')).toEqual(['sun'])
    expect(parseClosedDays('ร้านเปิดสิบโมง วันจันทร์หยุด')).toEqual(['mon'])
  })

  it('reads a list of days before the closed verb', () => {
    expect(parseClosedDays('เสาร์อาทิตย์หยุด')).toEqual(['sat', 'sun'])
    expect(parseClosedDays('วันเสาร์กับวันอาทิตย์หยุด')).toEqual(['sat', 'sun'])
    expect(parseClosedDays('วันอาทิตย์และวันเสาร์หยุด')).toEqual(['sat', 'sun'])
  })

  it('does not read a day that opens the shop as closed', () => {
    expect(parseClosedDays('เปิด วันจันทร์ ปิดวันอาทิตย์')).toEqual(['sun'])
    expect(parseClosedDays('เปิดจันทร์ ถึง เสาร์หยุดวันอาทิตย์')).toEqual(['sun'])
  })

  it('reads a long day name', () => {
    expect(parseClosedDays('วันพฤหัสบดีหยุด')).toEqual(['thu'])
  })
})

describe('parseOpeningHours', () => {
  it('reads the demo script line', () => {
    expect(parseOpeningHours('สิบโมงเช้าถึงสองทุ่ม เปิดทุกวัน')).toEqual({ open: '10:00', close: '20:00', closedDays: [] })
  })

  it('reads afternoon close and a day off', () => {
    expect(parseOpeningHours('เจ็ดโมงเช้าถึงบ่ายสาม หยุดวันอาทิตย์')).toEqual({ open: '07:00', close: '15:00', closedDays: ['sun'] })
  })

  it('reads the tap-chip form', () => {
    expect(parseOpeningHours('10:00 – 20:00')).toEqual({ open: '10:00', close: '20:00', closedDays: [] })
  })

  it('reads days off said first', () => {
    expect(parseOpeningHours('หยุดวันเสาร์อาทิตย์ เปิดแปดโมงถึงห้าโมงเย็น')).toEqual({ open: '08:00', close: '17:00', closedDays: ['sat', 'sun'] })
  })

  it('reads a day closed with "ปิด" and open hours', () => {
    expect(parseOpeningHours('ร้านปิดวันอาทิตย์ เปิดสิบโมงถึงสองทุ่ม')).toEqual({ open: '10:00', close: '20:00', closedDays: ['sun'] })
  })

  it('reads a day said before "หยุด" and open hours', () => {
    expect(parseOpeningHours('อาทิตย์หยุด เปิดสิบโมงถึงสองทุ่ม')).toEqual({ open: '10:00', close: '20:00', closedDays: ['sun'] })
  })

  it('needs both an opening and a closing time', () => {
    expect(parseOpeningHours('เปิดสิบโมง')).toBeNull()
  })
})
