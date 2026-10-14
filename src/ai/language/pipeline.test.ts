import { describe, expect, it } from 'vitest'
import { businessUpdates } from '@/ai/onboarding/businessTalk.ts'
import { extractProfile } from '@/ai/onboarding/extractProfile.ts'
import { createEmptyProfile } from '@/ai/onboarding/profile.ts'
import { getLandmarks } from '@/services/merchantApi.ts'
import { understandThai } from './understand.ts'

const landmarks = getLandmarks()

describe('language layer → parsers', () => {
  it('reads an Isan price with ซาว', () => {
    const menu = extractProfile(understandThai('ข้าวเหนียวมะม่วงซาวห้าบาทเด้อ').text, { expecting: 'menu', landmarks }).menu?.value
    expect(menu).toEqual([{ name: 'ข้าวเหนียวมะม่วง', priceTHB: 25 }])
  })

  it('finds กาดหลวง said in คำเมือง', () => {
    const updates = businessUpdates(understandThai('ร้านอยู่กาดหลวงเจ้า').text, { expecting: 'location', landmarks, profile: createEmptyProfile() })
    expect(updates.location?.value.text.startsWith('ตลาดวโรรส')).toBe(true)
  })

  it('reads Southern opening hours', () => {
    const hours = extractProfile(understandThai('เปิดเจ็ดโมงเช้าถึงห้าโมงเย็นทุกหวันแหละ').text, { expecting: 'hours', landmarks }).hours?.value
    expect(hours?.open).toBe('07:00')
    expect(hours?.close).toBe('17:00')
  })
})
