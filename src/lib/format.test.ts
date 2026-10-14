import { describe, expect, it } from 'vitest'
import { formatAccount, formatDuration, formatHours, formatIdNumber, formatPhone, formatTHB, formatTime, lastFour, maskAccount, maskIdNumber } from './format.ts'

describe('formatTHB', () => {
  it('adds the baht sign and a thousands separator', () => {
    expect(formatTHB(1025)).toBe('฿1,025')
  })

  it('rounds down so money is never overstated', () => {
    expect(formatTHB(1025.9)).toBe('฿1,025')
  })
})

describe('formatTime', () => {
  it('adds the Thai "น." suffix', () => {
    expect(formatTime('14:00')).toBe('14:00 น.')
  })
})

describe('formatHours', () => {
  it('says "เปิดทุกวัน" when there are no days off', () => {
    expect(formatHours({ open: '10:00', close: '20:00', closedDays: [] })).toBe('10:00 – 20:00 น. · เปิดทุกวัน')
  })

  it('lists days off in Thai', () => {
    expect(formatHours({ open: '07:00', close: '15:00', closedDays: ['sat', 'sun'] })).toBe('07:00 – 15:00 น. · หยุดวันเสาร์ อาทิตย์')
  })
})

describe('formatPhone', () => {
  it('groups a 10-digit Thai number', () => {
    expect(formatPhone('0812344217')).toBe('081-234-4217')
  })

  it('leaves other lengths unchanged', () => {
    expect(formatPhone('12345')).toBe('12345')
  })
})

describe('formatDuration', () => {
  it('shows minutes and seconds', () => {
    expect(formatDuration(160_000)).toBe('2 นาที 40 วินาที')
  })

  it('drops zero seconds', () => {
    expect(formatDuration(120_000)).toBe('2 นาที')
  })

  it('shows only seconds under a minute', () => {
    expect(formatDuration(45_000)).toBe('45 วินาที')
  })
})

describe('ID and account numbers', () => {
  it('groups a full ID number the way the card prints it', () => {
    expect(formatIdNumber('1234567890121')).toBe('1-2345-67890-12-1')
  })

  it('masks an ID number except the last four digits', () => {
    expect(maskIdNumber('1234567890121')).toBe('x-xxxx-xxxx0-12-1')
  })

  it('groups and masks a 10-digit account number', () => {
    expect(formatAccount('1234567890')).toBe('123-4-56789-0')
    expect(maskAccount('1234567890')).toBe('xxx-x-xx789-0')
  })

  it('leaves out the dashes when the length is unexpected', () => {
    expect(maskAccount('123456789012')).toBe('xxxxxxxx9012')
  })

  it('gives the last four digits for spoken lines', () => {
    expect(lastFour('1234567890')).toBe('7890')
  })
})
