import { describe, expect, it } from 'vitest'
import { addMenuChecks } from '@/ai/guardrail/checks.ts'
import { getMerchant } from '@/services/merchantApi.ts'
import { addMenuScript, dishesIn, wantsToAddMenu } from './addMenu.ts'
import { stepsFromHere } from './runner.ts'
import { INITIAL_NAV } from './types.ts'

describe('adding dishes in Act 2', () => {
  it('hears a request to add dishes', () => {
    for (const said of ['เพิ่มเมนู', 'เพิ่มเมนูน้ำส้มแก้วละ 20 บาท', 'ช่วยใส่เมนูใหม่ให้หน่อย', 'อยากลงรายการอาหารเพิ่ม']) expect(wantsToAddMenu(said), said).toBe(true)
    for (const said of ['เปิดเมนู', 'หมูกรอบหมดแล้ว', 'ขอดูยอดขายหน่อย']) expect(wantsToAddMenu(said), said).toBe(false)
  })

  it('drafts the dishes said, without the add words or the units', () => {
    expect(dishesIn('เพิ่มเมนู น้ำส้มแก้วละ 20 บาท ชาเย็น 1 แก้ว 25 บาท')).toEqual([
      { name: 'น้ำส้ม', priceTHB: 20 },
      { name: 'ชาเย็น', priceTHB: 25 },
    ])
    expect(dishesIn('เพิ่มเมนู')).toEqual([])
  })

  it('opens the add sheet on the menu, from the menu itself without going home', () => {
    const steps = addMenuScript([{ name: 'น้ำส้ม', priceTHB: 20 }]).steps
    expect(steps.at(-1)?.set?.adding?.items).toEqual([{ name: 'น้ำส้ม', priceTHB: 20 }])
    expect(stepsFromHere(steps, { ...INITIAL_NAV, screen: 'MENU' })).toEqual(steps.slice(1))
  })

  it('lets only a named, sensibly priced, new dish through', () => {
    const shop = getMerchant()
    const pass = (items: { name: string; priceTHB: number }[]) => addMenuChecks({ kind: 'addMenu', items }, shop).every((check) => check.pass)
    expect(pass([{ name: 'น้ำส้ม', priceTHB: 20 }])).toBe(true)
    expect(pass([])).toBe(false)
    expect(pass([{ name: '', priceTHB: 20 }])).toBe(false)
    expect(pass([{ name: 'น้ำส้ม', priceTHB: 0 }])).toBe(false)
    expect(pass([{ name: shop.menu[0].name, priceTHB: 50 }])).toBe(false)
  })
})
