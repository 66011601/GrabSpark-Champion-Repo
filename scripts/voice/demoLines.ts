// Lines the companion builds from the demo's own data (the sample shop, its menu, the Act 2 pages and buttons),
// for scripts/voice/build.mjs to record. Each is made the way the app makes it, so the text matches exactly.
import { addMenuScript, dishesIn } from '@/ai/navigator/addMenu.ts'
import { BUTTONS, backScript, pressScript } from '@/ai/navigator/buttons.ts'
import { BACK_TIMES } from '@/ai/navigator/drafts.ts'
import { fillSlots } from '@/ai/navigator/runner.ts'
import { GRID, openScript } from '@/ai/navigator/openPage.ts'
import { SCRIPTS } from '@/ai/navigator/scripts.ts'
import { INITIAL_NAV, type NavState, type Script } from '@/ai/navigator/types.ts'
import { CATEGORY_LABELS } from '@/ai/onboarding/parsers/category.ts'
import { BANK } from '@/ai/understanding/bank/index.ts'
import { labelName } from '@/ai/understanding/labelNames.ts'
import { scanSummary } from '@/components/scan/scanLines.ts'
import { th } from '@/copy/th.ts'
import { getMerchant } from '@/services/merchantApi.ts'
import { sampleScan } from '@/services/ocr/mockOcr.ts'
import type { DocKind } from '@/types/domain.ts'

const said = (script: Script | null) => script?.steps.map((step) => step.say) ?? []
// Where the owner is after a script ran: each step's screen and settings, in order.
const after = (script: Script, from: NavState): NavState => script.steps.reduce((nav, step) => ({ ...nav, screen: step.screen, ...step.set }), from)

export function demoLines(): string[] {
  const t = th.act2
  const shop = getMerchant()
  const lines: string[] = []

  // The five Act 2 scripts; "หมูกรอบหมดแล้ว" for every dish on the menu.
  for (const script of SCRIPTS) {
    const slots = script.id === 'soldOut' ? shop.menu.map((item) => ({ item: item.name, itemId: item.id })) : [{}]
    for (const slot of slots) lines.push(...script.steps.map((step) => fillSlots(step, slot).say))
  }
  for (const item of shop.menu) lines.push(t.soldOut.done(item.name))
  for (const time of BACK_TIMES) lines.push(t.soldOut.picked(time.label))

  // Every home tile, and every button pressed from home or from wherever another button left the owner.
  for (const item of GRID) lines.push(...said(openScript(item.id)))
  const places = [INITIAL_NAV, ...BUTTONS.map((button) => after(pressScript(button.id, INITIAL_NAV), INITIAL_NAV))]
  for (const place of places) {
    lines.push(...said(backScript(place)))
    for (const button of BUTTONS) lines.push(...said(pressScript(button.id, place)))
  }

  // "แนะนำหน่อย": two features at a time, going round the list.
  const features = t.guide.features
  for (let at = 0; at < features.length; at += 1) lines.push(t.guide.intro([features[at].say, features[(at + 1) % features.length].say]))

  // Adding dishes: the tried examples, and how many were added.
  for (const feature of features) lines.push(...said(addMenuScript(dishesIn(feature.tryIt))))
  lines.push(...said(addMenuScript([])))
  for (let count = 1; count <= 5; count += 1) lines.push(t.addMenu.done(count))

  // "หมายถึง … ใช่ไหมคะ?" for everything the companion may ask back about, and the food types it may pick.
  for (const label of new Set(BANK.map((entry) => entry.label))) if (label !== 'none') lines.push(th.understanding.ask(labelName(label)))
  for (const category of CATEGORY_LABELS) lines.push(th.s3.categoryPicked(category))
  lines.push(th.s3.categoryOptions(CATEGORY_LABELS.join(' ')))

  // Days off heard on the hours page: one or two days, or all but one or two ("ที่เหลือหยุด").
  const days = Object.keys(th.h3.dayNames) as (keyof typeof th.h3.dayNames)[]
  const sets: (typeof days)[] = [[]]
  for (const [at, day] of days.entries()) {
    sets.push([day])
    for (const other of days.slice(at + 1)) sets.push([day, other])
  }
  for (const off of [...sets]) if (off.length > 0) sets.push(days.filter((day) => !off.includes(day)))
  for (const off of sets) lines.push(th.h3.closedHeard(off.map((day) => th.h3.dayNames[day]).join(' ')))

  // Photographing the ID card, the bank book or the paper menu: "กำลังอ่าน…", then what she read (the sample document).
  lines.push(th.scan.reading)
  for (const kind of Object.keys(th.scan.docs) as DocKind[]) lines.push(scanSummary(sampleScan(kind)))

  return lines.filter(Boolean)
}
