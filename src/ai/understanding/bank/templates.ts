import type { Said } from '@/ai/language/corpus/types.ts'
import type { BankEntry, ScreenId } from './types.ts'

// Templates add only slot-like variety the hand-written sentences cannot list one by one: which dish, which price,
// which day, which landmark. Every frame is a sentence a merchant would say in that region; the slots change the
// content, not the way of speaking. Templates are training only (isHeldOut keeps them out of the test set), so the
// metrics still measure hand-written speech. Spec D1 §5 caps them at 30% of the bank.

interface Slots {
  opener: string[]
  particle: string[]
  dish: string[]
  price: string[]
  day: string[] // a day the merchant talks about: today, yesterday, this week…
  tomorrow: string[]
  clock: string[]
  closed: string[] // a day the shop shuts
  landmark: string[]
}

const COMMON_DISHES = ['ส้มตำ', 'ลาบหมู', 'ข้าวมันไก่', 'กะเพราหมูสับ', 'ผัดไทย', 'ต้มยำกุ้ง', 'ข้าวขาหมู', 'ก๋วยเตี๋ยวเรือ', 'ข้าวผัดปู', 'หมูกรอบ', 'ไก่ย่าง', 'ข้าวเหนียวมะม่วง', 'ชาเย็น', 'กาแฟโบราณ', 'ไข่เจียวหมูสับ']

const SLOTS: Record<Said, Slots> = {
  central: {
    opener: ['', '', 'เอ่อ ', 'คือว่า ', 'นี่ ', 'แบบว่า '],
    particle: ['', 'ค่ะ', 'ครับ', 'นะคะ', 'จ้ะ', 'นะ'],
    dish: [...COMMON_DISHES, 'ข้าวหมูแดง', 'ราดหน้า', 'ข้าวไข่ข้น', 'เย็นตาโฟ', 'ต้มเลือดหมู', 'ข้าวต้มปลา', 'ขนมจีนแกงเขียวหวาน', 'หอยทอด'],
    price: ['สี่สิบบาท', 'ห้าสิบบาท', 'หกสิบบาท', 'สามสิบห้าบาท', 'ร้อยยี่สิบบาท', 'แปดสิบบาท', 'ยี่สิบห้าบาท'],
    day: ['วันนี้', 'เมื่อวาน', 'อาทิตย์นี้', 'เดือนนี้', 'เมื่อวานซืน', 'อาทิตย์ที่แล้ว'],
    tomorrow: ['พรุ่งนี้', 'มะรืนนี้', 'เสาร์นี้', 'วันหยุดยาวนี้'],
    clock: ['เจ็ดโมงเช้า', 'แปดโมง', 'สิบโมง', 'เที่ยง', 'บ่ายสาม', 'ห้าโมงเย็น', 'สองทุ่ม', 'สี่ทุ่ม'],
    closed: ['วันจันทร์', 'วันพระ', 'ทุกวันพุธ', 'วันอาทิตย์', 'วันหยุดนักขัตฤกษ์'],
    landmark: ['หน้าวัด', 'ข้างโรงเรียน', 'ตรงข้ามเซเว่น', 'หลังตลาด', 'ใกล้ปั๊มน้ำมัน', 'ปากซอย', 'ข้างโรงพยาบาล', 'หน้าที่ว่าการอำเภอ', 'ใต้ทางด่วน', 'ข้างวินมอเตอร์ไซค์'],
  },
  isan: {
    opener: ['', '', 'เอ้อ ', 'คือว่า ', 'ข้อยว่า ', 'อ้าว '],
    particle: ['', 'เด้อ', 'แหน่', 'เด้', 'เนาะ', 'เด้อหล่า'],
    dish: [...COMMON_DISHES, 'ซุบหน่อไม้', 'อ่อมหมู', 'ปลาร้าบอง', 'ต้มแซ่บ', 'ตำซั่ว', 'ลาบเป็ด', 'ก้อยกุ้ง', 'ไส้กรอกอีสาน', 'แจ่วบอง'],
    price: ['ซาวบาท', 'ซาวห้าบาท', 'สามสิบบาท', 'สี่สิบบาท', 'ฮ้อยนึง', 'ฮ้อยห้าสิบ', 'ห้าสิบบาท'],
    day: ['มื้อนี้', 'มื้อวาน', 'อาทิตย์นี้', 'เดือนนี้', 'มื้อซืน', 'อาทิตย์ก่อน'],
    tomorrow: ['มื้ออื่น', 'มื้ออื่นมื้อฮือ', 'วันเสาร์นี่', 'บุญบั้งไฟนี่'],
    clock: ['หกโมงเช้า', 'เจ็ดโมง', 'สิบโมง', 'เที่ยง', 'บ่ายสอง', 'ตอนแลง', 'หนึ่งทุ่ม', 'สามทุ่ม'],
    closed: ['วันพระ', 'มื้อวันพระ', 'วันจันทร์', 'ฮอดวันศุกร์', 'ช่วงบุญ'],
    landmark: ['หน้าวัดบ้าน', 'ข้างโฮงเรียน', 'ทางไปตลาดนัด', 'ใกล้หนองน้ำ', 'ปากทางเข้าบ้าน', 'ข้างศาลากลางบ้าน', 'หลังอนามัย', 'ตรงข้ามเซเว่น', 'ใกล้ปั๊มบางจาก'],
  },
  north: {
    opener: ['', '', 'เอ่อ ', 'คือว่า ', 'ข้าเจ้าว่า ', 'อ้าว '],
    particle: ['', 'เจ้า', 'เน้อ', 'ก่', 'เน้อเจ้า', 'แต๊'],
    dish: [...COMMON_DISHES, 'ข้าวซอย', 'ไส้อั่ว', 'น้ำพริกหนุ่ม', 'น้ำพริกอ่อง', 'แกงฮังเล', 'ขนมจีนน้ำเงี้ยว', 'แคบหมู', 'ลาบคั่ว', 'แกงแค', 'จิ้นส้ม'],
    price: ['ซาวบาท', 'ซาวห้าบาท', 'สามสิบบาท', 'สี่สิบบาท', 'ห้าสิบบาท', 'ร้อยนึง', 'หกสิบบาท'],
    day: ['วันนี้', 'มะวาน', 'อาทิตย์นี้', 'เดือนนี้', 'มะวานซืน', 'อาทิตย์ตี้แล้ว'],
    tomorrow: ['วันพูก', 'วันพูกเช้า', 'วันเสาร์นี้', 'ช่วงปีใหม่เมือง'],
    clock: ['หกโมงเช้า', 'เจ็ดโมง', 'สิบโมง', 'เตี้ยง', 'บ่ายสาม', 'ตอนแลง', 'สองทุ่ม', 'สามทุ่ม'],
    closed: ['วันพระ', 'วันจันทร์', 'วันกาดนัด', 'วันอาทิตย์', 'ช่วงสงกรานต์'],
    landmark: ['หน้ากาด', 'ข้างวัด', 'ใกล้โฮงเฮียน', 'ตรงข้ามเซเว่น', 'ตีนดอย', 'ข้างกาดหลวง', 'หลังโฮงยา', 'ปากซอยตี้ไปน้ำตก', 'ใกล้ประตูเมือง'],
  },
  south: {
    opener: ['', '', 'เอ่อ ', 'คือว่า ', 'ฉานว่า ', 'โอ๊ย '],
    particle: ['', 'หนิ', 'นิ', 'เหอ', 'ฮู้', 'โหล'],
    dish: [...COMMON_DISHES, 'แกงไตปลา', 'คั่วกลิ้ง', 'ข้าวยำ', 'ขนมจีนแกงไก่', 'โรตี', 'หมูฮ้อง', 'ผัดสะตอ', 'แกงส้มปลา', 'ข้าวหมกไก่', 'ไก่ทอดหาดใหญ่', 'ติ่มซำ'],
    price: ['ยี่สิบบาท', 'สามสิบบาท', 'สี่สิบบาท', 'ห้าสิบบาท', 'หกสิบบาท', 'ร้อยนึง', 'เจ็ดสิบบาท'],
    day: ['หวันนี้', 'วานนี้', 'อาทิตย์นี้', 'เดือนนี้', 'วานซืน', 'อาทิตย์ที่แล้ว'],
    tomorrow: ['ต่อเช้า', 'หวันเสาร์นี้', 'ช่วงชักพระ', 'หวันหยุดนี้'],
    clock: ['หกโมงเช้า', 'เจ็ดโมง', 'สิบโมง', 'เที่ยง', 'บ่ายสอง', 'ห้าโมงเย็น', 'สองทุ่ม', 'สามทุ่ม'],
    closed: ['หวันศุกร์', 'หวันจันทร์', 'ช่วงรายอ', 'หวันอาทิตย์', 'ทุกหวันพุธ'],
    landmark: ['หน้ามัสยิด', 'ข้างหลาด', 'ใกล้ท่าเรือ', 'หน้าโรงเรียน', 'ตรงข้ามเซเว่น', 'หลังสภากาแฟ', 'ปากซอยไปหาดใหญ่', 'ข้างโรงพัก', 'ใกล้ควนนั่น'],
  },
}

interface Template {
  label: string
  screens: ScreenId[]
  count: number // sentences per region
  frames: Record<Said, string[]>
}

const TEMPLATES: Template[] = [
  {
    label: 'topic:menu',
    screens: ['H2'],
    count: 22,
    frames: {
      central: ['{opener}{dish} {price}{particle}', '{opener}เพิ่ม{dish}ในเมนูด้วย{particle}', '{dish}จานละ{price}{particle}', '{opener}มี{dish}ขายด้วย ราคา{price}'],
      isan: ['{opener}{dish} {price}{particle}', '{opener}เพิ่ม{dish}ใส่เมนูแหน่', '{dish}จานละ{price}{particle}', '{opener}ฮ้านมี{dish}นำ ขาย{price}'],
      north: ['{opener}{dish} {price}{particle}', '{opener}ใส่{dish}ในเมนูหื้อแหม', '{dish}จานละ{price}{particle}', '{opener}มี{dish}ขายตวย {price}'],
      south: ['{opener}{dish} {price}{particle}', '{opener}เพิ่ม{dish}ในเมนูที', '{dish}จานละ{price}{particle}', '{opener}มี{dish}ขายด้วย {price}'],
    },
  },
  {
    label: 'topic:hours',
    screens: ['H3'],
    count: 16,
    frames: {
      central: ['{opener}เปิด{clock} ปิด{clock}{particle}', '{opener}{closed}ร้านหยุด{particle}', '{opener}ร้านเปิดตั้งแต่{clock}{particle}'],
      isan: ['{opener}เปิด{clock} ปิด{clock}{particle}', '{opener}{closed}ฮ้านปิด{particle}', '{opener}ฮ้านเปิดตั้งแต่{clock}{particle}'],
      north: ['{opener}เปิด{clock} ปิด{clock}{particle}', '{opener}{closed}ร้านปิด{particle}', '{opener}ร้านเปิดตั้งแต่{clock}{particle}'],
      south: ['{opener}เปิด{clock} ปิด{clock}{particle}', '{opener}{closed}ร้านปิด{particle}', '{opener}ร้านเปิดแต่{clock}{particle}'],
    },
  },
  {
    label: 'topic:location',
    screens: ['S3'],
    count: 18,
    frames: {
      central: ['{opener}ร้านอยู่{landmark}{particle}', '{opener}ร้านเราตั้งอยู่{landmark}{particle}', '{opener}มาตรง{landmark} เห็นร้านเลย{particle}'],
      isan: ['{opener}ฮ้านอยู่{landmark}{particle}', '{opener}ฮ้านข้อยอยู่{landmark}{particle}', '{opener}มาฮอด{landmark} กะเห็นฮ้านแล้ว'],
      north: ['{opener}ร้านอยู่{landmark}{particle}', '{opener}ร้านข้าเจ้าอยู่{landmark}{particle}', '{opener}มาถึง{landmark} ก่หันร้านเลย'],
      south: ['{opener}ร้านอยู่{landmark}{particle}', '{opener}ร้านฉานอยู่{landmark}{particle}', '{opener}มาถึง{landmark} แลเห็นร้านเลย'],
    },
  },
  {
    label: 'topic:category',
    screens: ['S3'],
    count: 12,
    frames: {
      central: ['{opener}ร้านขาย{dish}เป็นหลัก{particle}', '{opener}ขายพวก{dish}{particle}', '{opener}ส่วนใหญ่ลูกค้าสั่ง{dish}{particle}'],
      isan: ['{opener}ฮ้านขาย{dish}เป็นหลัก{particle}', '{opener}ขาย{dish}กับของกินอีสาน{particle}', '{opener}ลูกค้าสั่ง{dish}หลายสุด'],
      north: ['{opener}ร้านขาย{dish}เป็นหลัก{particle}', '{opener}ขาย{dish}กับกับข้าวเมือง{particle}', '{opener}คนมักสั่ง{dish}นักสุด'],
      south: ['{opener}ร้านขาย{dish}เป็นหลัก{particle}', '{opener}ขาย{dish}กับของกินบ้านเรา{particle}', '{opener}คนสั่ง{dish}จังหู'],
    },
  },
  {
    label: 'intent:sales',
    screens: ['ACT2'],
    count: 16,
    frames: {
      central: ['{opener}ขอดูยอดขาย{day}{particle}', '{opener}{day}ขายได้เท่าไหร่{particle}', '{opener}{day}ได้เงินเข้ามากี่บาท{particle}'],
      isan: ['{opener}ขอเบิ่งยอดขาย{day}แหน่', '{opener}{day}ขายได้จักบาท{particle}', '{opener}{day}ได้เงินหลายบ่{particle}'],
      north: ['{opener}ขอผ่อยอดขาย{day}{particle}', '{opener}{day}ขายได้เต้าใด{particle}', '{opener}{day}ได้เงินนักก่'],
      south: ['{opener}ขอแลยอดขาย{day}{particle}', '{opener}{day}ขายได้กี่ตัง{particle}', '{opener}{day}ได้เบี้ยเท่าไหร่{particle}'],
    },
  },
  {
    label: 'intent:soldOut',
    screens: ['ACT2'],
    count: 14,
    frames: {
      central: ['{opener}{dish}หมดแล้ว{particle}', '{opener}{dish}ไม่มีขายแล้ว{day}{particle}', '{opener}ปิด{dish}ไว้ก่อน ของหมด'],
      isan: ['{opener}{dish}หมดแล้ว{particle}', '{opener}{dish}บ่มีขายแล้ว{particle}', '{opener}ปิด{dish}ไว้ก่อน ของหมดเกลี้ยง'],
      north: ['{opener}{dish}หมดแล้ว{particle}', '{opener}{dish}บ่มีแล้ว{particle}', '{opener}ปิด{dish}ไว้ก่อน หมดเกลี้ยงแล้ว'],
      south: ['{opener}{dish}เหม็ดแล้ว{particle}', '{opener}{dish}ไม่มีแล้ว{particle}', '{opener}ปิด{dish}ไว้ก่อน ของเหม็ด'],
    },
  },
  {
    label: 'intent:forecast',
    screens: ['ACT2'],
    count: 12,
    frames: {
      central: ['{opener}{tomorrow}ฝนตก ลูกค้าจะเยอะไหม{particle}', '{opener}{tomorrow}ออเดอร์จะมาเท่าไหร่{particle}', '{opener}{tomorrow}ควรเตรียมของเท่าไหร่ดี'],
      isan: ['{opener}{tomorrow}ฝนสิตก ลูกค้าสิหลายบ่', '{opener}{tomorrow}ออเดอร์สิมาจักอัน{particle}', '{opener}{tomorrow}ควรเตรียมของส่ำใด'],
      north: ['{opener}{tomorrow}ฝนจะตก คนจะสั่งนักก่', '{opener}{tomorrow}ออเดอร์จะมาเต้าใด{particle}', '{opener}{tomorrow}ควรเตรียมของเต้าใดดี'],
      south: ['{opener}{tomorrow}ฝนตก คนจะสั่งเยอะม้าย', '{opener}{tomorrow}ออเดอร์จะเข้ากี่อัน{particle}', '{opener}{tomorrow}เตรียมของเท่าไหร่ดีหนิ'],
    },
  },
  {
    label: 'intent:promo',
    screens: ['ACT2'],
    count: 12,
    frames: {
      central: ['{opener}อยากจัดโปร{dish}{tomorrow}{particle}', '{opener}ลดราคา{dish}ให้ลูกค้าหน่อย', '{opener}ทำโปรซื้อ{dish}แถมน้ำดีไหม'],
      isan: ['{opener}อยากเฮ็ดโปร{dish}{tomorrow}{particle}', '{opener}ลดราคา{dish}ให้ลูกค้าแหน่', '{opener}เฮ็ดโปรซื้อ{dish}แถมน้ำดีบ่'],
      north: ['{opener}ใค่ยะโปร{dish}{tomorrow}{particle}', '{opener}ลดราคา{dish}หื้อลูกค้าแหม', '{opener}ยะโปรซื้อ{dish}แถมน้ำดีก่'],
      south: ['{opener}อยากทำโปร{dish}{tomorrow}{particle}', '{opener}ลดราคา{dish}ให้ลูกค้าที', '{opener}ทำโปรซื้อ{dish}แถมน้ำดีม้าย'],
    },
  },
]

// mulberry32: a tiny seeded generator, so the templates come out the same in every build and test run.
function seeded(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state)
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296
  }
}

const SEED = 20261015
const REGIONS: Said[] = ['central', 'isan', 'north', 'south']

function expand(): BankEntry[] {
  const random = seeded(SEED)
  const pick = <T>(list: T[]): T => list[Math.floor(random() * list.length)]
  const entries: BankEntry[] = []
  for (const template of TEMPLATES) {
    for (const region of REGIONS) {
      const slots = SLOTS[region]
      const said = new Set<string>()
      // Frames cycle so each is used; a repeated sentence is drawn again, with a bound in case the slots run out.
      for (let tries = 0; said.size < template.count && tries < template.count * 20; tries += 1) {
        const frame = template.frames[region][tries % template.frames[region].length]
        const say = frame.replace(/\{(\w+)\}/g, (_, slot: keyof Slots) => pick(slots[slot])).trim()
        if (said.has(say)) continue
        said.add(say)
        entries.push({ say, region, screens: template.screens, label: template.label, source: 'template' })
      }
    }
  }
  return entries
}

/** Slot-filled sentences (dishes, prices, days, landmarks) for field topics and Act 2 intents, training only. */
export const TEMPLATE_BANK: BankEntry[] = expand()
