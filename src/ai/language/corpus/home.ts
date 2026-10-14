import type { Utterance } from './types.ts'

/**
 * The home tasks after sign-up: telling the menu with prices (H2) and the opening hours (H3), in central Thai
 * and in Isan, Northern (คำเมือง) and Southern Thai, plus the two screens' own buttons.
 */
export const HOME: Utterance[] = [
  // H2 — "บอกเมนูกับราคาได้เลยค่ะ": dishes with prices
  { say: 'ข้าวมันไก่ห้าสิบบาทค่ะ', region: 'central', expect: { step: 'H2', expecting: 'menu', fields: { menu: [{ name: 'ข้าวมันไก่', priceTHB: 50 }] } } },
  { say: 'กะเพราหมูสับหกสิบบาท ไข่เจียวหมูสับสี่สิบห้าบาทค่ะ', region: 'central', expect: { step: 'H2', expecting: 'menu', fields: { menu: [{ name: 'กะเพราหมูสับ', priceTHB: 60 }, { name: 'ไข่เจียวหมูสับ', priceTHB: 45 }] } } },
  { say: 'ส้มตำไทยสี่สิบ ตำปูปลาร้าห้าสิบค่ะ', region: 'central', expect: { step: 'H2', expecting: 'menu', fields: { menu: [{ name: 'ส้มตำไทย', priceTHB: 40 }, { name: 'ตำปูปลาร้า', priceTHB: 50 }] } } },
  { say: 'ก๋วยเตี๋ยวเรือสี่สิบบาท พิเศษห้าสิบบาทครับ', region: 'central', expect: { step: 'H2', expecting: 'menu', fields: { menu: [{ name: 'ก๋วยเตี๋ยวเรือ', priceTHB: 40 }] } } },
  { say: 'ชาไทยเย็นสามสิบห้าบาทค่ะ', region: 'central', expect: { step: 'H2', expecting: 'menu', fields: { menu: [{ name: 'ชาไทยเย็น', priceTHB: 35 }] } } },
  { say: 'ข้าวผัดกุ้งหกสิบห้าบาทครับ', region: 'central', expect: { step: 'H2', expecting: 'menu', fields: { menu: [{ name: 'ข้าวผัดกุ้ง', priceTHB: 65 }] } } },
  { say: 'มีต้มยำกุ้งน้ำข้นหนึ่งร้อยยี่สิบบาทค่ะ', region: 'central', expect: { step: 'H2', expecting: 'menu', fields: { menu: [{ name: 'ต้มยำกุ้งน้ำข้น', priceTHB: 120 }] } } },
  { say: 'ข้าวหมูกรอบ 50 บาท ข้าวหมูแดง 45 บาท', region: 'central', expect: { step: 'H2', expecting: 'menu', fields: { menu: [{ name: 'ข้าวหมูกรอบ', priceTHB: 50 }, { name: 'ข้าวหมูแดง', priceTHB: 45 }] } } },
  { say: 'ผัดไทยกุ้งสดเจ็ดสิบบาท แล้วก็หอยทอดหกสิบค่ะ', region: 'central', expect: { step: 'H2', expecting: 'menu', fields: { menu: [{ name: 'ผัดไทยกุ้งสด', priceTHB: 70 }, { name: 'หอยทอด', priceTHB: 60 }] } } },
  { say: 'โจ๊กหมูสามสิบบาท ใส่ไข่สามสิบห้าค่ะ', region: 'central', expect: { step: 'H2', expecting: 'menu', fields: { menu: [{ name: 'โจ๊กหมู', priceTHB: 30 }] } } },
  { say: 'ข้าวขาหมูห้าสิบ ข้าวมันไก่ทอดห้าสิบห้าบาทครับ', region: 'central', expect: { step: 'H2', expecting: 'menu', fields: { menu: [{ name: 'ข้าวขาหมู', priceTHB: 50 }, { name: 'ข้าวมันไก่ทอด', priceTHB: 55 }] } } },
  { say: 'น้ำพริกกะปิปลาทูแปดสิบเก้าบาทค่ะ', region: 'central', expect: { step: 'H2', expecting: 'menu', fields: { menu: [{ name: 'น้ำพริกกะปิปลาทู', priceTHB: 89 }] } } },
  { say: 'ข้าวเหนียวมะม่วงซาวห้าบาทเด้อ', region: 'isan', expect: { step: 'H2', expecting: 'menu', fields: { menu: [{ name: 'ข้าวเหนียวมะม่วง', priceTHB: 25 }] } } },
  { say: 'ตำซั่วซาวห้า ตำไทยซาวเด้อ', region: 'isan', expect: { step: 'H2', expecting: 'menu', fields: { menu: [{ name: 'ตำซั่ว', priceTHB: 25 }, { name: 'ตำไทย', priceTHB: 20 }] } } },
  { say: 'ต้มแซ่บกระดูกอ่อนฮ้อยซาวบาทเด้อ', region: 'isan', expect: { step: 'H2', expecting: 'menu', fields: { menu: [{ name: 'ต้มแซ่บกระดูกอ่อน', priceTHB: 120 }] } } },
  { say: 'ลาบหมูห้าสิบ ไก่ย่างฮ้อยนึงเด้อ', region: 'isan', expect: { step: 'H2', expecting: 'menu', fields: { menu: [{ name: 'ลาบหมู', priceTHB: 50 }, { name: 'ไก่ย่าง', priceTHB: 100 }] } } },
  { say: 'ข้าวซอยไก่ห้าสิบบาทเจ้า', region: 'north', expect: { step: 'H2', expecting: 'menu', fields: { menu: [{ name: 'ข้าวซอยไก่', priceTHB: 50 }] } } },
  { say: 'ขนมจีนน้ำเงี้ยวสี่สิบเน้อ', region: 'north', expect: { step: 'H2', expecting: 'menu', fields: { menu: [{ name: 'ขนมจีนน้ำเงี้ยว', priceTHB: 40 }] } } },
  { say: 'แคบหมูซาวบาท ไส้อั่วหกสิบเจ้า', region: 'north', expect: { step: 'H2', expecting: 'menu', fields: { menu: [{ name: 'แคบหมู', priceTHB: 20 }, { name: 'ไส้อั่ว', priceTHB: 60 }] } } },
  { say: 'น้ำพริกหนุ่มซาวห้าบาท ลำแต๊เจ้า', region: 'north', expect: { step: 'H2', expecting: 'menu', fields: { menu: [{ name: 'น้ำพริกหนุ่ม', priceTHB: 25 }] } } },
  { say: 'ขนมจีนแกงไตปลาสี่สิบบาท หรอยหนิ', region: 'south', expect: { step: 'H2', expecting: 'menu', fields: { menu: [{ name: 'ขนมจีนแกงไตปลา', priceTHB: 40 }] } } },
  { say: 'คั่วกลิ้งหมูหกสิบบาท ลูกค้าแหลงว่าหรอยหนิ', region: 'south', expect: { step: 'H2', expecting: 'menu', fields: { menu: [{ name: 'คั่วกลิ้งหมู', priceTHB: 60 }] } } },
  { say: 'แกงส้มปลากะพงร้อยห้าสิบบาท หวันนี้มีแค่หม้อเดียวหนิ', region: 'south', expect: { step: 'H2', expecting: 'menu', fields: { menu: [{ name: 'แกงส้มปลากะพง', priceTHB: 150 }] } } },
  { say: 'ข้าวยำสามสิบห้าบาท โรตีแกงยี่สิบห้าบาท ขายทุกหวันหนิ', region: 'south', expect: { step: 'H2', expecting: 'menu', fields: { menu: [{ name: 'ข้าวยำ', priceTHB: 35 }, { name: 'โรตีแกง', priceTHB: 25 }] } } },

  // H3 — "ร้านเปิดกี่โมงถึงกี่โมงคะ": opening hours
  { say: 'เปิดเจ็ดโมงเช้าปิดห้าโมงเย็นค่ะ', region: 'central', expect: { step: 'H3', expecting: 'hours', fields: { hours: { open: '07:00', close: '17:00' } } } },
  { say: 'สิบโมงถึงสองทุ่มครับ', region: 'central', expect: { step: 'H3', expecting: 'hours', fields: { hours: { open: '10:00', close: '20:00' } } } },
  { say: 'เปิดหกโมงเช้าถึงบ่ายสองค่ะ', region: 'central', expect: { step: 'H3', expecting: 'hours', fields: { hours: { open: '06:00', close: '14:00' } } } },
  { say: 'แปดโมงครึ่งถึงหนึ่งทุ่มค่ะ', region: 'central', expect: { step: 'H3', expecting: 'hours', fields: { hours: { open: '08:30', close: '19:00' } } } },
  { say: 'เปิดสี่โมงเย็นถึงเที่ยงคืนครับ', region: 'central', expect: { step: 'H3', expecting: 'hours', fields: { hours: { open: '16:00', close: '00:00' } } } },
  { say: 'ขายตั้งแต่ตีห้าถึงสิบโมงเช้าค่ะ', region: 'central', expect: { step: 'H3', expecting: 'hours', fields: { hours: { open: '05:00', close: '10:00' } } } },
  { say: '9 โมงถึง 3 ทุ่ม หยุดวันจันทร์ค่ะ', region: 'central', expect: { step: 'H3', expecting: 'hours', fields: { hours: { open: '09:00', close: '21:00' } } } },
  { say: 'เปิดเที่ยงถึงสามทุ่มครับ', region: 'central', expect: { step: 'H3', expecting: 'hours', fields: { hours: { open: '12:00', close: '21:00' } } } },
  { say: 'เปิด 07:30 ปิด 15:00 ค่ะ', region: 'central', expect: { step: 'H3', expecting: 'hours', fields: { hours: { open: '07:30', close: '15:00' } } } },
  { say: 'เปิดทุกวันเจ็ดโมงเช้าถึงหกโมงเย็นค่ะ', region: 'central', expect: { step: 'H3', expecting: 'hours', fields: { hours: { open: '07:00', close: '18:00' } } } },
  { say: 'ร้านเปิดห้าโมงเย็นถึงห้าทุ่มครับ', region: 'central', expect: { step: 'H3', expecting: 'hours', fields: { hours: { open: '17:00', close: '23:00' } } } },
  { say: 'เปิดซู่มื้อเจ็ดโมงเช้าถึงห้าโมงแลงเด้อ', region: 'isan', expect: { step: 'H3', expecting: 'hours', fields: { hours: { open: '07:00', close: '17:00' } } } },
  { say: 'ทุกมื้อเปิดหกโมงเช้า ปิดสองทุ่มเด้อ', region: 'isan', expect: { step: 'H3', expecting: 'hours', fields: { hours: { open: '06:00', close: '20:00' } } } },
  { say: 'เปิดตอนแลง สี่โมงแลงฮอดเที่ยงคืนเด้อ', region: 'isan', expect: { step: 'H3', expecting: 'hours', fields: { hours: { open: '16:00', close: '00:00' } } } },
  { say: 'เปิดเจ็ดโมงเช้า ปิดหกโมงแลงเจ้า', region: 'north', expect: { step: 'H3', expecting: 'hours', fields: { hours: { open: '07:00', close: '18:00' } } } },
  { say: 'ข้าเจ้าขายกาดเช้า ตีห้าถึงสิบโมงเน้อ', region: 'north', expect: { step: 'H3', expecting: 'hours', fields: { hours: { open: '05:00', close: '10:00' } } } },
  { say: 'เปิดสิบโมงถึงสองทุ่มทุกวันเน้อ', region: 'north', expect: { step: 'H3', expecting: 'hours', fields: { hours: { open: '10:00', close: '20:00' } } } },
  { say: 'เปิดเจ็ดโมงเช้าถึงห้าโมงเย็นทุกหวันแหละ', region: 'south', expect: { step: 'H3', expecting: 'hours', fields: { hours: { open: '07:00', close: '17:00' } } } },
  { say: 'ทุกหวันเปิดหกโมงเช้าถึงบ่ายสองหนิ', region: 'south', expect: { step: 'H3', expecting: 'hours', fields: { hours: { open: '06:00', close: '14:00' } } } },
  { say: 'ร้านฉานเปิดตีห้าครึ่งถึงสิบโมงเช้าหนิ', region: 'south', expect: { step: 'H3', expecting: 'hours', fields: { hours: { open: '05:30', close: '10:00' } } } },

  // H2 / H3 — the home tasks' own buttons
  { say: 'ถ่ายรูปเมนูหน่อยค่ะ', region: 'central', expect: { screen: 'H2', command: 'shoot' } },
  { say: 'ถ่ายเลยค่ะ', region: 'central', expect: { screen: 'H2', command: 'shoot' } },
  { say: 'กลับไปก่อนค่ะ', region: 'central', expect: { screen: 'H2', command: 'back' } },
  { say: 'ย้อนกลับครับ', region: 'central', expect: { screen: 'H3', command: 'back' } },
  { say: 'ถ่ายรูปเมนูหื้อเจ้า', region: 'north', expect: { screen: 'H2', command: 'shoot' } },
  { say: 'ฉานถ่ายรูปเมนูเลยหนิ', region: 'south', expect: { screen: 'H2', command: 'shoot' } },
  { say: 'ถอยกลับแหน่', region: 'isan', expect: { screen: 'H3', command: 'back' } },
  { say: 'ปิ๊กไปก่อนเจ้า', region: 'north', expect: { screen: 'H3', command: 'back' } },
]
