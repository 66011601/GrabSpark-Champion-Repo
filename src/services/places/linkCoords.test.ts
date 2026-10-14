import { describe, expect, it } from 'vitest'
import { readLink } from './linkCoords.ts'

describe('readLink', () => {
  it('reads a Google Maps place link', () => {
    expect(readLink('https://www.google.com/maps/place/ตลาดวโรรส/@18.7902357,99.000535,17z/data=!3m1!4b1')).toEqual({ kind: 'point', lat: 18.7902357, lng: 99.000535 })
  })

  it('reads the !3d…!4d… form', () => {
    expect(readLink('https://www.google.com/maps/place/X/data=!4m6!3m5!1s0x0:0x0!8m2!3d18.79!4d99.0005')).toEqual({ kind: 'point', lat: 18.79, lng: 99.0005 })
  })

  it('reads ?q= and ?query= links, as LINE and map apps share them', () => {
    expect(readLink('https://maps.google.com/?q=13.8016,100.6033')).toEqual({ kind: 'point', lat: 13.8016, lng: 100.6033 })
    expect(readLink('https://www.google.com/maps/search/?api=1&query=7.0084%2C100.47')).toEqual({ kind: 'point', lat: 7.0084, lng: 100.47 })
    expect(readLink('ร้านอยู่นี่ค่ะ https://maps.google.com/maps?q=16.4183,102.8184&z=17')).toEqual({ kind: 'point', lat: 16.4183, lng: 102.8184 })
  })

  it('reads coordinates copied from a map', () => {
    expect(readLink('13.8016, 100.6033')).toEqual({ kind: 'point', lat: 13.8016, lng: 100.6033 })
  })

  it('reads the point from a later link when an earlier one has none', () => {
    expect(readLink('https://www.facebook.com/shop https://maps.google.com/?q=13.8016,100.6033')).toEqual({ kind: 'point', lat: 13.8016, lng: 100.6033 })
  })

  it('reads a coordinate pair inside a sentence', () => {
    expect(readLink('หมุดอยู่ที่ 13.8016, 100.6033 ค่ะ')).toEqual({ kind: 'point', lat: 13.8016, lng: 100.6033 })
  })

  it('says a short link or another link cannot be read', () => {
    expect(readLink('https://maps.app.goo.gl/AbCdEf123')).toEqual({ kind: 'unreadable' })
    expect(readLink('https://www.facebook.com/kruapadaeng')).toEqual({ kind: 'unreadable' })
  })

  it('returns null for ordinary words and numbers', () => {
    expect(readLink('ร้านอยู่ลาดพร้าว 71')).toBeNull()
    expect(readLink('12.5')).toBeNull()
  })
})
