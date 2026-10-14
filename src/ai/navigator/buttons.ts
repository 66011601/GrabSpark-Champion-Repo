import { th } from '@/copy/th.ts'
import { getMerchant } from '@/services/merchantApi.ts'
import { buildRainPromo } from './drafts.ts'
import { GRID, plain, VERBS } from './openPage.ts'
import type { GridId, NavScreen, NavState, Script, ScriptStep, SubId } from './types.ts'

const t = th.act2
const ins = t.insights
const fb = t.feedback

export interface NavButton {
  id: string // its data-nav, which the cursor taps
  label: string
  names: string[] // what an owner may say; the bare label only where no script wants those words
  screen: NavScreen
  page?: GridId // which item, when screen is 'PAGE'
  after?: string // the button that has to be on first: the tab or filter it sits under
  group?: string // the heading it sits under on its page
  set: Partial<NavState> // what pressing it changes, by tap or by voice alike
  say: string
}

const sub = (id: SubId, screen: NavScreen, page: GridId | undefined, names: string[], group?: string): NavButton => {
  const copy = t.subs[id]
  return { id, label: copy.title, names: [copy.title, ...names], screen, page, group, set: { sub: id }, say: copy.confirm ? `${copy.about} ${t.tapYourself}` : copy.about }
}

/**
 * Every button an owner can press by voice, on every screen. Confirm buttons are not here on purpose:
 * only the merchant's own tap confirms anything.
 */
export const BUTTONS: NavButton[] = [
  { id: 'see-insights', label: t.homeScreen.seeInsights, names: [t.homeScreen.seeInsights], screen: 'HOME', set: { screen: 'INSIGHTS' }, say: t.pageSay(t.grid[7], t.pages.insights) },

  // ข้อมูลเชิงลึก. "ยอดขาย" alone stays with the sales script.
  { id: 'tab-overview', label: ins.tabs.overview, names: [ins.tabs.overview, `แท็บ${ins.tabs.overview}`], screen: 'INSIGHTS', set: { tab: 'overview' }, say: ins.overviewSay },
  { id: 'tab-sales', label: ins.tabs.sales, names: [`แท็บ${ins.tabs.sales}`], screen: 'INSIGHTS', set: { tab: 'sales' }, say: t.sales.openTab },
  { id: 'tab-trend', label: ins.tabs.trend, names: [ins.tabs.trend, `แท็บ${ins.tabs.trend}`], screen: 'INSIGHTS', set: { tab: 'trend' }, say: t.forecast.openTab },
  { id: 'period-7', label: ins.days(7), names: [ins.days(7), 'เจ็ดวัน', '7 วันล่าสุด', 'เจ็ดวันล่าสุด'], screen: 'INSIGHTS', after: 'tab-sales', set: { period: 7 }, say: t.sales.period },
  { id: 'period-30', label: ins.days(30), names: [ins.days(30), 'สามสิบวัน', '30 วันล่าสุด', 'สามสิบวันล่าสุด'], screen: 'INSIGHTS', after: 'tab-sales', set: { period: 30 }, say: ins.period30 },
  { id: 'compare', label: ins.compare, names: [ins.compare, 'เทียบสัปดาห์ก่อน', 'เทียบกับอาทิตย์ก่อน', 'เทียบอาทิตย์ก่อน'], screen: 'INSIGHTS', after: 'tab-sales', set: { compare: true }, say: t.sales.compare },
  // "พรุ่งนี้ฝนตก" alone stays with the forecast script.
  { id: 'rain', label: ins.rainToggle, names: ['สวิตช์ฝนตก', 'ใส่เงื่อนไขฝนตก'], screen: 'INSIGHTS', after: 'tab-trend', set: { rain: true }, say: t.forecast.rain },

  // ฟีดแบก. "รีวิว" alone stays with the feedback script.
  { id: 'review-reviews', label: fb.tabs.reviews, names: ['แท็บรีวิว'], screen: 'FEEDBACK', set: { reviewTab: 'reviews' }, say: fb.reviewsSay },
  { id: 'review-reports', label: fb.tabs.reports, names: [fb.tabs.reports, 'แท็บรายงาน', 'รายงานลูกค้า'], screen: 'FEEDBACK', set: { reviewTab: 'reports' }, say: fb.reportsSay },
  { id: 'filter-all', label: fb.all, names: [fb.all, 'รีวิวทั้งหมด'], screen: 'FEEDBACK', after: 'review-reviews', set: { negativeOnly: false }, say: fb.allSay },
  { id: 'filter-negative', label: fb.filter, names: [fb.filter, '1 ถึง 3 ดาว', 'หนึ่งถึงสามดาว', 'รีวิวไม่ดี'], screen: 'FEEDBACK', after: 'review-reviews', set: { negativeOnly: true }, say: fb.tap },
  { id: 'lesson-open', label: fb.lessonTitle, names: ['บทเรียน', 'บทเรียน 2 นาที', 'บทเรียนสองนาที', 'ส่งให้ตรงเวลา'], screen: 'FEEDBACK', after: 'filter-negative', set: { lesson: true }, say: fb.lessonOpen },
  { id: 'lesson-read', label: fb.read, names: [fb.read, 'ฟัง', 'ฟังบทเรียน', 'อ่านบทเรียน'], screen: 'FEEDBACK', after: 'lesson-open', set: {}, say: fb.lesson.join(' ') },

  // เพิ่มยอดขาย. The rain promo draft still waits for a tap on its confirm bar.
  sub('boost-ad', 'BOOST', undefined, ['สร้างแคมเปญ', 'สร้างโฆษณา', 'ทำโฆษณา']),
  sub('boost-campaigns', 'BOOST', undefined, ['แคมเปญ', 'แคมเปญโฆษณา', 'ดูโฆษณา']),
  { id: 'create-promo', label: t.promo.create, names: [t.promo.create, 'จัดโปรโมชั่น', 'สร้างโปรโมชัน', 'สร้างโปรโมชั่น'], screen: 'BOOST', set: { promo: buildRainPromo(getMerchant()), sub: null }, say: t.promo.ready },

  sub('orders-accept', 'PAGE', 'orders', ['รับออเดอร์', 'คำสั่งซื้อใหม่', 'ออเดอร์ใหม่']),
  sub('orders-history', 'PAGE', 'orders', ['ประวัติออเดอร์', 'ประวัติการสั่งซื้อ']),
  sub('staff-add', 'PAGE', 'staff', ['เพิ่มลูกจ้าง', 'สร้างบัญชีพนักงาน']),
  sub('staff-accounts', 'PAGE', 'staff', ['บัญชีพนักงาน', 'รายชื่อพนักงาน']),
  sub('express-instant', 'PAGE', 'express', ['ส่งของทันที', 'เรียกไรเดอร์'], t.expressGroups.rider),
  sub('express-offline', 'PAGE', 'express', ['ออเดอร์นอกระบบ', 'ส่งนอกระบบ'], t.expressGroups.fits),
  sub('express-branch', 'PAGE', 'express', ['ข้ามสาขา', 'ส่งข้ามสาขา'], t.expressGroups.fits),
  sub('link-view', 'PAGE', 'smartlink', ['ลิงก์ร้าน', 'ลิงค์ร้าน', 'ดูลิงค์ร้าน']),
  sub('link-copy', 'PAGE', 'smartlink', ['คัดลอกลิงค์', 'ก๊อปลิงก์', 'ก๊อปปี้ลิงก์']),
  sub('link-share', 'PAGE', 'smartlink', ['แชร์ลิงค์', 'แชร์ร้าน']),
]

// "ดู", "ปุ่ม", "แตะ" fit a button but not a home item: "ดูฟีดแบก" is still the feedback script.
const SAYINGS = new Map<string, string>()
for (const button of BUTTONS) for (const name of button.names) for (const verb of [...VERBS, 'ดู', 'ปุ่ม', 'แตะ']) SAYINGS.set(plain(verb + name), button.id)

/** "กดส่งของข้ามสาขา", "แท็บรีวิว", "7 วัน": which button to press, or null. The whole sentence must be the button. */
export function matchButton(utterance: string): string | null {
  const said = plain(utterance)
  return said ? (SAYINGS.get(said) ?? null) : null
}

const byId = (id: string) => BUTTONS.find((button) => button.id === id) as NavButton
const gridFor = (button: NavButton) => GRID.find((item) => (button.page ? item.id === button.page : item.opens === button.screen)) as (typeof GRID)[number]
const onScreen = (button: NavButton, nav: NavState) => nav.screen === button.screen && (button.screen !== 'PAGE' || nav.page === button.page)
// The tab or filter is already the way the button needs it (the app keeps it while the owner is elsewhere).
const isOn = (button: NavButton, nav: NavState) => Object.entries(button.set).every(([key, value]) => nav[key as keyof NavState] === value)

/** Where the current screen is called, for "กลับไปหน้า …". */
const titleOf = (nav: NavState) => GRID.find((item) => (nav.screen === 'PAGE' ? item.id === nav.page : item.opens === nav.screen))?.label ?? t.home

/**
 * Press a button from wherever the owner is: back out of a sub-page, or through the home grid to the right screen,
 * then the tab or filter it sits under, then the button itself. Every step is a tap the owner can watch.
 */
export function pressScript(id: string, nav: NavState): Script {
  const steps: ScriptStep[] = []
  let now = nav
  const step = (next: ScriptStep) => {
    steps.push(next)
    now = { ...now, screen: next.screen, ...next.set }
  }
  const press = (button: NavButton) => {
    if (button.after && !isOn(byId(button.after), now)) press(byId(button.after))
    if (!onScreen(button, now)) {
      if (button.screen === 'HOME') step({ screen: 'HOME', set: { page: null, sub: null }, say: t.backHome })
      else {
        const item = gridFor(button)
        step({ screen: 'HOME', target: `grid-${item.id}`, set: { page: item.id, sub: null }, say: t.goTo(item.label) })
      }
    } else if (now.sub && button.screen !== 'HOME') step({ screen: now.screen, target: 'back', set: { sub: null }, say: t.backTo(titleOf(now)) })
    step({ screen: button.screen, target: button.id, set: button.set, say: button.say })
  }
  const button = byId(id)
  press(button)
  return { id: `press-${id}`, title: button.label, phrases: [], keywords: [], steps }
}

/** "กลับ": close the lesson or the sub-page if one is open, otherwise back to the home screen. Null when already home. */
export function backScript(nav: NavState): Script | null {
  if (nav.screen === 'HOME') return null
  const step: ScriptStep = nav.lesson
    ? { screen: nav.screen, set: { lesson: false }, say: fb.lessonClose }
    : nav.sub
      ? { screen: nav.screen, target: 'back', set: { sub: null }, say: t.backTo(titleOf(nav)) }
      : { screen: nav.screen, target: 'back', set: { screen: 'HOME', page: null }, say: t.backHome }
  return { id: 'back', title: nav.sub && !nav.lesson ? titleOf(nav) : t.home, phrases: [], keywords: [], steps: [step] }
}
