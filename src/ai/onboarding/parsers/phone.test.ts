import { describe, expect, it } from 'vitest'
import { parsePhone } from './phone.ts'

describe('a number written the international way', () => {
  it('reads +66 as the first 0', () => {
    expect(parsePhone('+66 81 234 5678')).toBe('0812345678')
    expect(parsePhone('+66812345678')).toBe('0812345678')
  })
})

describe('parsePhone', () => {
  it('reads digit-by-digit Thai', () => {
    expect(parsePhone('ศูนย์แปดหนึ่ง สองสามสี่ สี่สองหนึ่งเจ็ด')).toBe('0812344217')
  })

  it('reads "โท" as 2 and ignores the word "โทร"', () => {
    expect(parsePhone('เบอร์โทร ศูนย์แปดโท สองสามสี่ ห้าหกเจ็ดแปด')).toBe('0822345678')
  })

  it('reads written numbers', () => {
    expect(parsePhone('081-234-4217')).toBe('0812344217')
    expect(parsePhone('๐๘๑๒๓๔๔๒๑๗')).toBe('0812344217')
  })

  it('rejects anything that is not a 10-digit Thai number', () => {
    expect(parsePhone('1234')).toBeNull()
  })
})
