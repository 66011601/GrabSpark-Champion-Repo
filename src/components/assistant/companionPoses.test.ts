import { describe, expect, it } from 'vitest'
import { th } from '@/copy/th.ts'
import { poseFor, POSES, type PoseMoment } from './companionPoses.ts'

const moment = (over: Partial<PoseMoment>): PoseMoment => ({ text: th.s3.helperStart, notice: null, asking: false, shop: false, ...over })

describe('poseFor', () => {
  it('waves hello on a new page', () => {
    expect(poseFor(moment({ text: th.s3.helperStart }))).toBe('wave')
    expect(poseFor(moment({ text: 'เคยสมัครรึยังคะ? บอกหนูว่า "สมัคร" หรือ "เข้าสู่ระบบ" ก็ได้' }))).toBe('wave')
  })

  it('makes a heart when only the merchant may tap, or to say thanks', () => {
    expect(poseFor(moment({ notice: th.s7.mustTap }))).toBe('heart')
    expect(poseFor(moment({ notice: th.h2.pressSave }))).toBe('heart')
    expect(poseFor(moment({ text: 'หนูช่วยกรอกให้ครบแล้วค่ะ ตรวจอีกครั้ง แล้วติ๊กยืนยันกับกดส่งเองนะคะ' }))).toBe('heart')
  })

  it('jumps for joy when something is done', () => {
    expect(poseFor(moment({ text: th.s3.helperDone }))).toBe('cheer')
    expect(poseFor(moment({ notice: th.act2.addMenu.done(2) }))).toBe('cheer')
    expect(poseFor(moment({ text: 'สมัครเสร็จแล้วค่ะ! ระหว่างรอ มาเพิ่มเมนูกันไหมคะ', shop: false }))).toBe('cheer')
  })

  it('winks with a peace sign when she asks or offers buttons', () => {
    expect(poseFor(moment({ notice: th.understanding.ask('ไปหน้าต่อไป') }))).toBe('peace')
    expect(poseFor(moment({ notice: th.understanding.unsure, asking: true }))).toBe('peace')
  })

  it('puts her hands on her hips to explain something to fix', () => {
    expect(poseFor(moment({ notice: th.onboarding.notUnderstood }))).toBe('hips')
    expect(poseFor(moment({ notice: th.grab.notYet, shop: true }))).toBe('hips')
  })

  it('carries the delivery bag in the shop', () => {
    expect(poseFor(moment({ text: th.act2.helper, shop: true }))).toBe('bag')
  })

  it('shows each pose to about her hips, the rest behind the phone edge', () => {
    for (const { width, height, show } of Object.values(POSES)) {
      expect(width).toBeGreaterThan(0)
      expect(height).toBeGreaterThan(width)
      expect(show).toBeGreaterThan(0.5)
      expect(show).toBeLessThan(0.8)
    }
  })
})
