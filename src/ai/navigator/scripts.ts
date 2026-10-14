import { th } from '@/copy/th.ts'
import { getMerchant } from '@/services/merchantApi.ts'
import { buildRainPromo } from './drafts.ts'
import { complaintTopics, rainForecast, salesSummary } from './insights.ts'
import type { Script, ScriptId } from './types.ts'

const shop = getMerchant()
const t = th.act2
const baht = (amount: number) => `${amount.toLocaleString('th-TH')} บาท`
const sales = salesSummary(shop)
const rain = rainForecast(shop)
const promo = buildRainPromo(shop)
const complaints = complaintTopics(shop)

/**
 * The five things an owner can ask for. Each is data: the runner plays the steps, the screens just show state.
 * `{item}` and `{itemId}` are filled with the menu item the owner named.
 */
export const SCRIPTS: Script<ScriptId>[] = [
  {
    id: 'sales',
    phrases: [t.ask.sales, 'ขอดูยอดขาย', 'ยอดขายเป็นยังไงบ้าง', 'วันนี้ขายได้เท่าไหร่', 'ยอดขายสัปดาห์นี้'],
    keywords: [['ยอดขาย'], ['ยอดเงิน'], ['รายได้'], ['ขายได้'], ['ยอด', 'ขาย']],
    not: ['พรุ่งนี้', 'ฝน', 'พยากรณ์', 'โปร'],
    steps: [
      { screen: 'HOME', target: 'grid-insights', say: t.goTo(t.grid[7]) },
      { screen: 'INSIGHTS', target: 'tab-sales', set: { tab: 'sales' }, say: t.sales.openTab },
      { screen: 'INSIGHTS', target: 'period-7', set: { period: 7 }, say: t.sales.period },
      { screen: 'INSIGHTS', target: 'compare', set: { compare: true }, say: t.sales.compare },
      { screen: 'INSIGHTS', highlight: 'best-item', say: t.sales.summary(baht(sales.totalTHB), sales.changePct, sales.best.name) },
    ],
  },
  {
    id: 'forecast',
    phrases: [t.ask.forecast, 'ถ้าพรุ่งนี้ฝนตก ขายจะเป็นยังไง', 'ฝนตกพรุ่งนี้ ออเดอร์เยอะไหม', 'พยากรณ์ออเดอร์พรุ่งนี้', 'พรุ่งนี้ฝนตกยอดขายจะเป็นยังไง'],
    keywords: [['ฝน', 'ออเดอร์'], ['ฝน', 'ยอด'], ['ฝน', 'ขาย'], ['ฝน', 'พรุ่งนี้'], ['พยากรณ์'], ['พรุ่งนี้', 'ออเดอร์']],
    not: ['โปร'],
    steps: [
      { screen: 'HOME', target: 'grid-insights', say: t.goTo(t.grid[7]) },
      { screen: 'INSIGHTS', target: 'tab-trend', set: { tab: 'trend', rain: false }, say: t.forecast.openTab },
      { screen: 'INSIGHTS', target: 'rain', set: { rain: true }, say: t.forecast.rain },
      { screen: 'INSIGHTS', highlight: 'forecast-range', say: t.forecast.range(rain.range[0], rain.range[1], rain.normal) },
      { screen: 'INSIGHTS', highlight: 'prep', say: t.forecast.prep(rain.prepPct[0], rain.prepPct[1]) },
    ],
  },
  {
    id: 'promo',
    phrases: [t.ask.promo, 'ทำโปรให้หน่อย', 'สร้างโปรโมชันวันฝนตก', 'ตั้งโปรวันฝนตกให้หน่อย', 'จัดโปรให้หน่อย'],
    keywords: [['โปร', 'ฝน'], ['โปร', 'ทำ'], ['โปร', 'สร้าง'], ['โปร', 'ตั้ง'], ['โปร', 'จัด'], ['โปร', 'เปิด'], ['โปร', 'ให้']],
    steps: [
      { screen: 'HOME', target: 'grid-boost', say: t.goTo(t.grid[3]) },
      { screen: 'BOOST', target: 'create-promo', set: { promo }, say: t.promo.ready },
      { screen: 'BOOST', highlight: 'promo-fields', say: t.promo.explain(promo.bundlePrice, promo.normalPrice) },
      { screen: 'BOOST', highlight: 'checks', say: t.promo.safe(29, promo.dailyCap * (promo.normalPrice - promo.bundlePrice)) },
      { screen: 'BOOST', highlight: 'confirm', say: t.promo.yours },
    ],
  },
  {
    id: 'soldOut',
    phrases: [t.ask.soldOut, 'ของหมดแล้ว', 'ขายหมดแล้ว', 'หมดแล้วนะ', 'ตั้งว่าหมด'],
    keywords: [['หมด']],
    not: ['ยอดขาย', 'โปร'],
    steps: [
      { screen: 'HOME', target: 'grid-menu', say: t.goTo(t.grid[1]) },
      { screen: 'MENU', highlight: 'item-{itemId}', say: t.soldOut.find('{item}') },
      { screen: 'MENU', target: 'soldout-{itemId}', set: { soldOut: { kind: 'soldOut', itemId: '{itemId}', until: null } }, say: t.soldOut.tap },
      { screen: 'MENU', highlight: 'back-times', say: t.soldOut.ask },
    ],
  },
  {
    id: 'feedback',
    phrases: [t.ask.feedback, 'ลูกค้าไม่พอใจอะไร', 'ดูรีวิวหน่อย', 'ขอดูฟีดแบ็ก', 'มีคนติอะไรไหม'],
    keywords: [['บ่น'], ['รีวิว'], ['ฟีด', 'แบ'], ['ฟิด', 'แบ'], ['ฟีท', 'แบ'], ['ฟิท', 'แบ'], ['ฟิต', 'แบ'], ['ฟีต', 'แบ'], ['ไม่พอใจ'], ['ร้องเรียน'], ['คำติ'], ['ติชม']],
    steps: [
      { screen: 'HOME', target: 'grid-feedback', say: t.goTo(t.grid[8]) },
      { screen: 'FEEDBACK', target: 'filter-negative', set: { negativeOnly: true }, say: t.feedback.tap },
      { screen: 'FEEDBACK', highlight: 'summary', say: t.feedback.summary(complaints.map((c) => t.feedback.topic(c.topic, c.count)).join(' และ ')) },
      { screen: 'FEEDBACK', target: 'lesson-open', set: { lesson: true }, say: t.feedback.offer },
    ],
  },
]
