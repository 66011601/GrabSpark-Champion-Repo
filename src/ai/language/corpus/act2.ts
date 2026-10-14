import type { Utterance } from './types.ts'

/**
 * Act 2, the home screen after sign-up: what an owner asks the companion, in central Thai and in Isan,
 * Northern (คำเมือง) and Southern Thai. Each sentence goes through the language layer and then Act 2's own
 * matchers in DashboardScreen's order (confirm, control, open, button, intent). Act 2's files are a teammate's
 * and are never edited: a sentence it cannot hear without a new central wording there is a `knownGap`.
 */
export const ACT2: Utterance[] = [
  // The five scripts — sales
  { say: 'ขอดูยอดขายหน่อย', region: 'central', expect: { act2: 'intent:sales' } },
  { say: 'วันนี้ขายได้เท่าไหร่คะ', region: 'central', expect: { act2: 'intent:sales' } },
  { say: 'เดือนนี้รายได้เป็นยังไงบ้างครับ', region: 'central', expect: { act2: 'intent:sales' } },
  { say: 'ยอดขายสัปดาห์นี้เป็นไงบ้างคะ', region: 'central', expect: { act2: 'intent:sales' } },
  { say: 'เบิ่งยอดขายแหน่', region: 'isan', expect: { act2: 'intent:sales' } },
  { say: 'มื้อนี่ขายได้จักบาทแล้ว', region: 'isan', expect: { act2: 'intent:sales' } },
  { say: 'ผ่อยอดขายหื้อเจ้า', region: 'north', expect: { act2: 'intent:sales' } },
  { say: 'หวันนี้ขายได้กี่ตังหนิ', region: 'south', expect: { act2: 'intent:sales' } },

  // forecast
  { say: 'ถ้าพรุ่งนี้ฝนตกจะขายได้ไหมคะ', region: 'central', expect: { act2: 'intent:forecast' } },
  { say: 'พรุ่งนี้ออเดอร์จะเยอะไหมครับ', region: 'central', expect: { act2: 'intent:forecast' } },
  { say: 'ช่วยพยากรณ์ยอดขายสัปดาห์หน้าให้หน่อย', region: 'central', expect: { act2: 'intent:forecast' } },
  { say: 'ฝนตกแบบนี้ออเดอร์จะลดไหมคะ', region: 'central', expect: { act2: 'intent:forecast' } },
  { say: 'มื้ออื่นฝนสิตกบ่ ออเดอร์สิหลายบ่', region: 'isan', expect: { act2: 'intent:forecast' } },
  { say: 'วันพูกฝนจะตกก่ ออเดอร์จะมีหลายก่', region: 'north', expect: { act2: 'intent:forecast' } },
  { say: 'ต่อเช้าฝนตกแล้วออเดอร์จะเป็นพรือ', region: 'south', expect: { act2: 'intent:forecast' } },

  // promo
  { say: 'ช่วยทำโปรวันฝนตกให้หน่อยค่ะ', region: 'central', expect: { act2: 'intent:promo' } },
  { say: 'อยากจัดโปรลดราคาครับ', region: 'central', expect: { act2: 'intent:promo' } },
  { say: 'ตั้งโปรลดยี่สิบเปอร์เซ็นต์ให้หน่อย', region: 'central', expect: { act2: 'intent:promo' } },
  { say: 'ยอดขายตก ช่วยคิดโปรให้หน่อยค่ะ', region: 'central', expect: { act2: 'intent:promo' } },
  { say: 'เฮ็ดโปรวันฝนตกให้แหน่', region: 'isan', expect: { act2: 'intent:promo' } },
  { say: 'ยะโปรวันฝนตกหื้อเจ้า', region: 'north', expect: { act2: 'intent:promo' } },
  { say: 'ทำโปรวันฝนตกให้ฉานหน่อยหนิ', region: 'south', expect: { act2: 'intent:promo' } },

  // soldOut
  { say: 'ข้าวมันไก่หมดแล้วค่ะ', region: 'central', expect: { act2: 'intent:soldOut' } },
  { say: 'ปิดเมนูกะเพราก่อน ของหมดครับ', region: 'central', expect: { act2: 'intent:soldOut' } },
  { say: 'วันนี้หมูกรอบหมดแล้วนะ', region: 'central', expect: { act2: 'intent:soldOut' } },
  { say: 'ตั้งว่าชาไทยหมดให้หน่อยค่ะ', region: 'central', expect: { act2: 'intent:soldOut' } },
  { say: 'ข้าวเหนียวหมดแล้วเด้อ', region: 'isan', expect: { act2: 'intent:soldOut' } },
  { say: 'ข้าวซอยหมดแล้วเจ้า', region: 'north', expect: { act2: 'intent:soldOut' } },
  { say: 'หวันนี้ข้าวยำหมดแล้วหนิ', region: 'south', expect: { act2: 'intent:soldOut' } },

  // feedback
  { say: 'ลูกค้าบ่นอะไรบ้างคะ', region: 'central', expect: { act2: 'intent:feedback' } },
  { say: 'ขอดูรีวิวหน่อยค่ะ', region: 'central', expect: { act2: 'intent:feedback' } },
  {
    say: 'มีคนติอะไรร้านไหมครับ',
    region: 'central',
    expect: { act2: 'intent:feedback' },
    knownGap: "feedback hears only the whole phrase 'มีคนติอะไรไหม' and the keywords คำติ / ติชม; a word in between (ร้าน) loses it. Act 2 would need a keyword group ['มีคนติ'] or ['ติ', 'ไหม']",
  },
  { say: 'มีลูกค้าร้องเรียนอะไรไหมคะ', region: 'central', expect: { act2: 'intent:feedback' } },
  { say: 'ลูกค้าไม่พอใจเรื่องอะไรคะ', region: 'central', expect: { act2: 'intent:feedback' } },
  { say: 'ลูกค้าจ่มหยังแหน่', region: 'isan', expect: { act2: 'intent:feedback' } },
  { say: 'ผ่อรีวิวลูกค้าหื้อเจ้า', region: 'north', expect: { act2: 'intent:feedback' } },
  { say: 'ลูกค้าบ่นไหรบ้างหนิ', region: 'south', expect: { act2: 'intent:feedback' } },

  // Controls: home, back, stop
  { say: 'กลับหน้าหลักค่ะ', region: 'central', expect: { act2: 'control:home' } },
  { say: 'กลับไปหน้าหลักเลยครับ', region: 'central', expect: { act2: 'control:home' } },
  { say: 'ย้อนกลับค่ะ', region: 'central', expect: { act2: 'control:back' } },
  { say: 'กลับไปก่อนครับ', region: 'central', expect: { act2: 'control:back' } },
  { say: 'หยุดก่อนค่ะ', region: 'central', expect: { act2: 'control:stop' } },
  { say: 'พอแล้ว ไม่ต้องแล้วครับ', region: 'central', expect: { act2: 'control:stop' } },
  { say: 'กลับไปหน้าหลักโลด', region: 'isan', expect: { act2: 'control:home' } },
  { say: 'พอแล้วเด้อ บ่เอาแล้ว', region: 'isan', expect: { act2: 'control:stop' } },
  { say: 'ปิ๊กหน้าหลักเจ้า', region: 'north', expect: { act2: 'control:home' } },
  { say: 'ปิ๊กไปเน้อ', region: 'north', expect: { act2: 'control:back' } },
  { say: 'หลบไปหน้าหลักหนิ', region: 'south', expect: { act2: 'control:home' } },
  { say: 'หยุดก่อนหนิ', region: 'south', expect: { act2: 'control:stop' } },

  // Open any of the 13 home items
  { say: 'เปิดเมนูค่ะ', region: 'central', expect: { act2: 'open:menu' } },
  { say: 'ไปที่คำสั่งซื้อหน่อย', region: 'central', expect: { act2: 'open:orders' } },
  { say: 'เปิดหน้าร้านค้าครับ', region: 'central', expect: { act2: 'open:shop' } },
  { say: 'ไปหน้าพนักงานค่ะ', region: 'central', expect: { act2: 'open:staff' } },
  { say: 'เปิดแคชเชียร์ให้หน่อย', region: 'central', expect: { act2: 'open:cashier' } },
  { say: 'เข้าไปที่ส่งด่วนค่ะ', region: 'central', expect: { act2: 'open:express' } },
  { say: 'เปิดฟีดแบกหน่อยค่ะ', region: 'central', expect: { act2: 'open:feedback' } },
  { say: 'ขอเข้าไปที่ศูนย์ช่วยเหลือครับ', region: 'central', expect: { act2: 'open:help' } },
  { say: 'เปิดข้อมูลเชิงลึกครับ', region: 'central', expect: { act2: 'open:insights' } },
  { say: 'ไปหน้าเพิ่มยอดขายค่ะ', region: 'central', expect: { act2: 'open:boost' } },
  { say: 'เปิดแกร็บช้อปค่ะ', region: 'central', expect: { act2: 'open:grabshop' } },
  { say: 'เปิดเมนูแหน่', region: 'isan', expect: { act2: 'open:menu' } },
  { say: 'ไปหน้าพนักงานเด้อ', region: 'isan', expect: { act2: 'open:staff' } },
  { say: 'เปิดคำสั่งซื้อหื้อเจ้า', region: 'north', expect: { act2: 'open:orders' } },
  { say: 'ไปตี้ส่งด่วนเน้อ', region: 'north', expect: { act2: 'open:express' } },
  { say: 'เปิดหน้าร้านหนิ', region: 'south', expect: { act2: 'open:shop' } },
  { say: 'เข้าไปที่แคชเชียร์หนิ', region: 'south', expect: { act2: 'open:cashier' } },

  // Buttons, pressed from wherever the owner is
  { say: 'ขอดูข้อมูลเชิงลึกหน่อยค่ะ', region: 'central', expect: { act2: 'button:see-insights' } },
  { say: 'แท็บรีวิวค่ะ', region: 'central', expect: { act2: 'button:review-reviews' } },
  { say: 'กดเจ็ดวันล่าสุดครับ', region: 'central', expect: { act2: 'button:period-7' } },
  { say: 'เทียบกับสัปดาห์ก่อนหน่อยค่ะ', region: 'central', expect: { act2: 'button:compare' } },
  { say: 'ส่งของข้ามสาขาค่ะ', region: 'central', expect: { act2: 'button:express-branch' } },
  { say: 'คัดลอกลิงก์ให้หน่อย', region: 'central', expect: { act2: 'button:link-copy' } },
  { say: 'กดเพิ่มพนักงานค่ะ', region: 'central', expect: { act2: 'button:staff-add' } },
  { say: 'ดูประวัติคำสั่งซื้อครับ', region: 'central', expect: { act2: 'button:orders-history' } },
  { say: 'เบิ่งข้อมูลเชิงลึกแหน่', region: 'isan', expect: { act2: 'button:see-insights' } },
  { say: 'แชร์ลิงก์แหน่', region: 'isan', expect: { act2: 'button:link-share' } },
  { say: 'ผ่อประวัติคำสั่งซื้อหื้อเจ้า', region: 'north', expect: { act2: 'button:orders-history' } },
  { say: 'กดสามสิบวันเน้อ', region: 'north', expect: { act2: 'button:period-30' } },
  { say: 'แลรีวิวไม่ดีหนิ', region: 'south', expect: { act2: 'button:filter-negative' } },
  { say: 'แลบัญชีพนักงานหนิ', region: 'south', expect: { act2: 'button:staff-accounts' } },

  // Voice never confirms: only the merchant's own tap does
  { say: 'ยืนยันค่ะ', region: 'central', expect: { act2: 'confirm' } },
  { say: 'ตกลง เปิดโปรเลยครับ', region: 'central', expect: { act2: 'confirm' } },
  { say: 'ส่งเลยค่ะ', region: 'central', expect: { act2: 'confirm' } },
  { say: 'ยืนยันเลยเด้อ', region: 'isan', expect: { act2: 'confirm' } },
  { say: 'ตกลงเจ้า ยะเลย', region: 'north', expect: { act2: 'confirm' } },
  { say: 'ยืนยันให้ฉานหน่อยหนิ', region: 'south', expect: { act2: 'confirm' } },
]
