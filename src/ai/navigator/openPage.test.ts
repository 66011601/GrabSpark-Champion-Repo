import { describe, expect, it } from 'vitest'
import { th } from '@/copy/th.ts'
import { GRID, matchOpen, openScript } from './openPage.ts'

describe('matchOpen', () => {
  it('knows all 13 items on the GrabMerchant home, in order', () => {
    expect(GRID.map((item) => item.label)).toEqual(th.act2.grid)
  })

  // Every item on the home grid, said the ways an owner would: "เปิด…", "ไปที่…", or just the name.
  for (const item of GRID) {
    it.each([item.label, `เปิด${item.label}`, `ไปที่${item.label}`, `ไปหน้า${item.label}`, `ช่วยเปิด${item.label}ให้หน่อยค่ะ`, `เปิด ${item.label} ครับ`])(`${item.id}: "%s"`, (said) => {
      expect(matchOpen(said)).toBe(item.id)
    })
  }

  it.each([
    ['เปิดออเดอร์', 'orders'],
    ['ไปที่ร้านค้า', 'shop'],
    ['เปิดอินไซต์', 'insights'],
    ['เปิดฟีดแบ็ก', 'feedback'],
    ['ไปที่สมาร์ทลิงก์', 'smartlink'],
    ['เปิดผู้ช่วยเอไอ', 'ai'],
    ['ไปศูนย์ช่วยเหลือ', 'help'],
    ['เปิดแกร็บชอป', 'grabshop'],
  ])('hears "%s" (another name, or how the recogniser spells it) as %s', (said, id) => {
    expect(matchOpen(said)).toBe(id)
  })

  // Questions belong to the five scripts; opening a page only answers a plain "open X".
  it.each(['ขอดูยอดขายหน่อย', 'ขอดูฟีดแบ็กหน่อย', 'หมูกรอบหมดแล้ว', 'ลูกค้าบ่นอะไรบ้าง', 'ทำโปรวันฝนตกให้หน่อย', 'ยืนยัน', 'สวัสดีค่ะ', ''])('leaves "%s" to the other matchers', (said) => {
    expect(matchOpen(said)).toBeNull()
  })
})

describe('openScript', () => {
  it('taps the tile on the home grid, then opens its screen', () => {
    const steps = openScript('menu').steps
    expect(steps.map((step) => [step.screen, step.target])).toEqual([
      ['HOME', 'grid-menu'],
      ['MENU', undefined],
    ])
  })

  it('opens a described page for items the demo does not build', () => {
    const steps = openScript('help').steps
    // The tap on the tile picks the page, so it is already right when the screen switches.
    expect(steps[0].set).toEqual({ page: 'help' })
    expect(steps[1].screen).toBe('PAGE')
    expect(steps[1].set).toBeUndefined()
    expect(steps[1].say).toContain(th.act2.pages.help)
  })

  it('never says the same line twice in a row', () => {
    for (const item of GRID) {
      const [first, second] = openScript(item.id).steps
      expect(second.say).not.toBe(first.say)
    }
  })
})
