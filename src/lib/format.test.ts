import { describe, expect, it } from 'vitest'
import { formatDuration, formatHours, formatPhone, formatTHB, formatTime } from './format.ts'

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
