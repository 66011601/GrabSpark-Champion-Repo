import type { Utterance } from './types.ts'

/**
 * Rude words in real merchant sentences (a busy owner swearing at the app, a late rider or themselves), which the
 * transcript must show as ***, and food or ordinary words that look close, which it must never mask.
 */
export const RUDE_CORPUS: Utterance[] = [
  // Masked
  { say: 'แม่งเอ๊ย แอปนี้ใช้ยากจัง ต่อไปเลย', region: 'central', expect: { masked: true } },
  { say: 'เหี้ยอะไรเนี่ย กดไม่ขึ้นสักที', region: 'central', expect: { masked: true } },
  { say: 'ไอ้ควายไรเดอร์มาช้าอีกแล้ว', region: 'central', expect: { masked: true } },
  { say: 'ชิบหายแล้ว ลืมเปิดร้าน', region: 'central', expect: { masked: true } },
  { say: 'มึงจะถามอะไรนักหนา', region: 'central', expect: { masked: true } },
  { say: 'กูบอกแล้วว่าห้าสิบบาท', region: 'central', expect: { masked: true } },
  { say: 'เชี่ย ราคาผิดหมดเลย', region: 'central', expect: { masked: true } },
  { say: 'ระยำจริง ๆ เน็ตหลุดอีกแล้ว', region: 'central', expect: { masked: true } },
  { say: 'บักห่า บ่เอาแล้ว', region: 'isan', expect: { masked: true } },
  { say: 'บักควาย เฮ็ดหยังของมัน', region: 'isan', expect: { masked: true } },
  { say: 'อีห่า ลืมปิดแก๊สอีกแล้วเด้อ', region: 'isan', expect: { masked: true } },
  { say: 'ไอ้ห่าเอ๊ย ยะบ่ทันแล้วเน้อ', region: 'north', expect: { masked: true } },
  { say: 'แม่งเอ๊ย ฝนตกแต๊ ๆ ลูกค้าบ่มาเลยเจ้า', region: 'north', expect: { masked: true } },
  { say: 'ไอ้เหี้ย แหลงไม่รู้เรื่องหนิ', region: 'south', expect: { masked: true } },
  { say: 'ไอ้สัตว์ หวันนี้ไรเดอร์ยังไม่มาเลยหนิ', region: 'south', expect: { masked: true } },

  // Not masked: food and ordinary words
  { say: 'ขายตีนไก่ทอดกับเนื้อควายย่าง', region: 'central', expect: { masked: false } },
  { say: 'มีอาหารสัตว์เลี้ยงขายด้วยค่ะ', region: 'central', expect: { masked: false } },
  { say: 'หอยทอดกระทะร้อนหกสิบบาทค่ะ', region: 'central', expect: { masked: false } },
  { say: 'ร้านขายหอยแครงลวกครับ', region: 'central', expect: { masked: false } },
  { say: 'สัดส่วนกำไรเดือนนี้ดีไหมคะ', region: 'central', expect: { masked: false } },
  { say: 'หีบห่อเรียบร้อยแล้ว เรียกไรเดอร์ได้เลย', region: 'central', expect: { masked: false } },
  { say: 'ลูกชิ้นเนื้อควายไม้ละสิบบาทครับ', region: 'central', expect: { masked: false } },
  { say: 'กูเกิลแมปหาร้านเจอไหมคะ', region: 'central', expect: { masked: false } },
  { say: 'ร้านอยู่ตรงข้ามสวนสัตว์ค่ะ', region: 'central', expect: { masked: false } },
  { say: 'ก้อยหอยเชอรี่ซาวบาทเด้อ', region: 'isan', expect: { masked: false } },
  { say: 'ต้มแซ่บตีนไก่ขายดีคักเด้อ', region: 'isan', expect: { masked: false } },
  { say: 'ลาบควายกิ๋นลำแต๊เจ้า', region: 'north', expect: { masked: false } },
  { say: 'แกงหอยขมเปิดขายวันพูกเจ้า', region: 'north', expect: { masked: false } },
  { say: 'หอยหวานผัดฉ่าหรอยหนิ', region: 'south', expect: { masked: false } },
  { say: 'แกงไตปลาใส่ตีนไก่ด้วยหนิ', region: 'south', expect: { masked: false } },
  { say: 'ร้านชื่อกูรูก๋วยเตี๋ยวค่ะ', region: 'central', expect: { masked: false } },

  // An exclamation after a swear word is dropped, so the request after it still works (the README's demo line)
  { say: 'แม่งเอ๊ย ต่อไปเลย', region: 'central', expect: { screen: 'S3', command: 'next' } },
  { say: 'แม่งเอ๊ย ต่อไปเลย', region: 'central', expect: { masked: true } },
  { say: 'เหี้ยเอ้ย ไปต่อ', region: 'central', expect: { screen: 'S3', command: 'next' } },
  { say: 'โว้ย ต่อไป', region: 'central', expect: { screen: 'S3', command: 'next' } },
  { say: 'แม่งเอ๊ย ไปต่อโลดเด้อ', region: 'isan', expect: { screen: 'S3', command: 'next' } },
  { say: 'ไอ้ห่าเอ๊ย ปิ๊กไปก่อนเจ้า', region: 'north', expect: { screen: 'S3', command: 'back' } },
  { say: 'แม่งเอ้ย ต่อไปหนิ', region: 'south', expect: { screen: 'S3', command: 'next' } },
]
