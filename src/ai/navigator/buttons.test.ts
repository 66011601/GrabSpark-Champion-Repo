import { describe, expect, it } from 'vitest'
import { matchCommand } from '@/ai/commands/matchCommand.ts'
import { th } from '@/copy/th.ts'
import { backScript, BUTTONS, matchButton, pressScript } from './buttons.ts'
import { CONTROLS } from './matchIntent.ts'
import { GRID } from './openPage.ts'
import { SCRIPTS } from './scripts.ts'
import { INITIAL_NAV, type NavState } from './types.ts'

const at = (patch: Partial<NavState>): NavState => ({ ...INITIAL_NAV, ...patch })
const targets = (id: string, nav: NavState = INITIAL_NAV) => pressScript(id, nav).steps.map((step) => step.target)

describe('BUTTONS', () => {
  it('has the buttons agreed for each page, in order', () => {
    const on = (page: string) => BUTTONS.filter((button) => button.page === page).map((button) => button.label)
    expect(on('orders')).toEqual(['รับคำสั่งซื้อ', 'ประวัติคำสั่งซื้อ'])
    expect(on('staff')).toEqual(['เพิ่มพนักงาน', 'ดูบัญชีพนักงาน'])
    expect(on('express')).toEqual(['ส่งของทันใจ', 'ส่งออเดอร์นอกระบบ', 'ส่งของข้ามสาขา'])
    expect(on('smartlink')).toEqual(['ดูลิงก์ร้าน', 'คัดลอกลิงก์', 'แชร์ลิงก์'])
    expect(BUTTONS.filter((button) => button.screen === 'BOOST').map((button) => button.label)).toEqual(['สร้างแคมเปญโฆษณา', 'ดูแคมเปญ', 'จัดโปรโมชัน'])
  })

  it('puts "ตอบโจทย์" and "บริการเรียกไรเดอร์" on the express page as headings, not buttons', () => {
    const express = BUTTONS.filter((button) => button.page === 'express')
    expect(express.map((button) => button.group)).toEqual(['บริการเรียกไรเดอร์', 'ตอบโจทย์', 'ตอบโจทย์'])
    expect(matchButton('ตอบโจทย์')).toBeNull()
  })

  it('gives every button its own id and its own names', () => {
    expect(new Set(BUTTONS.map((button) => button.id)).size).toBe(BUTTONS.length)
    const names = BUTTONS.flatMap((button) => button.names)
    expect(new Set(names).size).toBe(names.length)
  })

  // Trust: a button only shows something. Confirming stays a tap on the screen.
  it('never confirms, and never marks anything done', () => {
    for (const button of BUTTONS) {
      expect(button.set).not.toHaveProperty('done')
      expect(button.id).not.toMatch(/confirm/)
    }
  })
})

describe('matchButton', () => {
  for (const button of BUTTONS) {
    it.each([...button.names, `กด${button.names[0]}`, `ช่วยกด${button.names[0]}ให้หน่อยค่ะ`, `${button.names[0]} ครับ`])(`${button.id}: "%s"`, (said) => {
      expect(matchButton(said)).toBe(button.id)
    })
  }

  it.each([
    ['รับออเดอร์', 'orders-accept'],
    ['เพิ่มลูกจ้าง', 'staff-add'],
    ['เรียกไรเดอร์', 'express-instant'],
    ['ส่งข้ามสาขา', 'express-branch'],
    ['คัดลอกลิงค์', 'link-copy'],
    ['แชร์ลิงค์', 'link-share'],
    ['แท็บยอดขาย', 'tab-sales'],
    ['7 วัน', 'period-7'],
    ['อ่านให้ฟัง', 'lesson-read'],
    ['สร้างโปรโมชั่น', 'create-promo'],
  ])('hears "%s" as %s', (said, id) => {
    expect(matchButton(said)).toBe(id)
  })

  // The five scripts and the 13 home items keep their own words.
  it('leaves every script phrase and every home item to the other matchers', () => {
    for (const script of SCRIPTS) for (const phrase of script.phrases) expect(matchButton(phrase), phrase).toBeNull()
    for (const item of GRID) expect(matchButton(item.label), item.label).toBeNull()
  })

  it.each(['ยอดขาย', 'รีวิว', 'พรุ่งนี้ฝนตก', 'ยืนยัน', 'ยืนยันเรียกไรเดอร์', 'รับคำสั่งซื้อนี้', 'สวัสดีค่ะ', ''])('leaves "%s" alone', (said) => {
    expect(matchButton(said)).toBeNull()
  })

  it('cannot press any confirm button by voice', () => {
    for (const sub of Object.values(th.act2.subs)) if (sub.confirm) expect(matchButton(sub.confirm), sub.confirm).toBeNull()
  })
})

describe('pressScript', () => {
  it('walks from home: tap the tile, then the button', () => {
    expect(targets('express-branch')).toEqual(['grid-express', 'express-branch'])
    expect(pressScript('express-branch', INITIAL_NAV).steps.at(-1)?.set).toEqual({ sub: 'express-branch' })
  })

  it('walks from another page through the home grid', () => {
    expect(targets('link-share', at({ screen: 'MENU', page: 'menu' }))).toEqual(['grid-smartlink', 'link-share'])
  })

  it('just taps when the button is already on screen', () => {
    expect(targets('express-branch', at({ screen: 'PAGE', page: 'express' }))).toEqual(['express-branch'])
    expect(targets('period-7', at({ screen: 'INSIGHTS', tab: 'sales' }))).toEqual(['period-7'])
  })

  it('goes back first when a sub-page of the same page is open', () => {
    expect(targets('express-branch', at({ screen: 'PAGE', page: 'express', sub: 'express-instant' }))).toEqual(['back', 'express-branch'])
  })

  it('opens the tab or filter a button sits under', () => {
    expect(targets('period-7')).toEqual(['grid-insights', 'tab-sales', 'period-7'])
    expect(targets('rain')).toEqual(['grid-insights', 'tab-trend', 'rain'])
    expect(targets('lesson-read')).toEqual(['grid-feedback', 'filter-negative', 'lesson-open', 'lesson-read'])
    expect(targets('filter-negative', at({ screen: 'FEEDBACK', reviewTab: 'reports' }))).toEqual(['review-reviews', 'filter-negative'])
  })

  it('goes home for a button on the home screen', () => {
    const steps = pressScript('see-insights', at({ screen: 'MENU', page: 'menu' })).steps
    expect(steps.map((step) => [step.screen, step.target])).toEqual([
      ['HOME', undefined],
      ['HOME', 'see-insights'],
    ])
  })

  it('names the button for the banner and never says the same line twice in a row', () => {
    for (const button of BUTTONS) {
      const script = pressScript(button.id, INITIAL_NAV)
      expect(script.title).toBe(button.label)
      script.steps.forEach((step, i) => {
        expect(step.say).not.toBe('')
        if (i > 0) expect(step.say).not.toBe(script.steps[i - 1].say)
      })
    }
  })
})

describe('backScript', () => {
  it('closes a sub-page first, then goes home', () => {
    expect(backScript(at({ screen: 'PAGE', page: 'orders', sub: 'orders-accept' }))?.steps[0]).toMatchObject({ target: 'back', set: { sub: null } })
    expect(backScript(at({ screen: 'PAGE', page: 'orders' }))?.steps[0]).toMatchObject({ target: 'back', set: { screen: 'HOME' } })
    expect(backScript(at({ screen: 'FEEDBACK', lesson: true }))?.steps[0].set).toEqual({ lesson: false })
    expect(backScript(INITIAL_NAV)).toBeNull()
  })

  it.each([
    ['กลับ', 'back'],
    ['ย้อนกลับ', 'back'],
    ['กลับไปค่ะ', 'back'],
    ['กลับหน้าหลัก', 'home'],
  ])('hears "%s" as %s', (said, id) => {
    expect(matchCommand(said, CONTROLS)).toBe(id)
  })
})
