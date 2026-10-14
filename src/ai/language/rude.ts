/**
 * Rude words and insult phrases, central and regional, matched on whole words only (Task 1's phraseEnd),
 * so เหี้ยมโหด, หีบ or สัดส่วน are safe. Food words are never listed on their own: สัตว์, ควาย, ตีน and หอย are
 * on menus (อาหารสัตว์, เนื้อควาย, ตีนไก่, หอยทอด); only their insult forms with ไอ้ / อี / บัก are here.
 */
export const RUDE: string[] = [
  'เหี้ย', 'เชี่ย', 'เชี้ย', 'สัส', 'สัด', 'ควย', 'หี', 'แตด', 'เย็ด', 'เยด',
  'แม่ง', 'แม่ม', 'มึง', 'กู', 'ฉิบหาย', 'ชิบหาย', 'ซิบหาย', 'ระยำ', 'เสือก', 'จัญไร',
  'ส้นตีน', 'ดอกทอง', 'อีดอก', 'ห่าราก',
  'ไอ้เหี้ย', 'อีเหี้ย', 'ไอ้เชี่ย', 'ไอ้ควย', 'ไอ้สัตว์', 'ไอ้สัส', 'ไอ้ควาย', 'อีควาย', 'บักควาย', 'ไอ้ห่า', 'อีห่า', 'บักห่า', 'ไอ้เวร', 'อีเวร',
]
