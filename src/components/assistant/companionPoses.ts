/** The companion's full-body poses, cut by scripts/companion-poses/build.html. */
export type PoseName = 'wave' | 'hips' | 'cheer' | 'heart' | 'bag' | 'peace'

/**
 * Each pose's size in pixels, and how much of her shows above the phone's bottom edge (a share of her height, from
 * the top of her cap): about to the hips, more where her hands or the bag sit lower. The rest is behind the edge.
 */
export const POSES: Record<PoseName, { width: number; height: number; show: number }> = {
  wave: { width: 364, height: 540, show: 0.66 },
  hips: { width: 350, height: 531, show: 0.66 },
  cheer: { width: 372, height: 482, show: 0.74 },
  heart: { width: 343, height: 561, show: 0.62 },
  bag: { width: 393, height: 545, show: 0.74 },
  peace: { width: 340, height: 536, show: 0.62 },
}

export interface PoseMoment {
  text: string // the helper line
  notice?: string | null // the reply to what the merchant just said
  asking: boolean // buttons to pick from are showing
  shop: boolean // Act 2: running the shop, not signing up
}

// "Nothing changes until you tap", "thank you", her answer to thanks or praise: a heart.
const HEART = /กดเอง|ส่งเอง|แทนไม่ได้|ยืนยันเอง|จนกว่าคุณจะกด|หนูไม่กด|ขอบคุณ|ยินดี|เขิน|ดีใจที่ได้ช่วย/
// Something done: a filled page, a saved menu, a sent application, a dish added or switched off.
const CHEER = /เรียบร้อย|สำเร็จ|เสร็จแล้ว|ครบแล้ว|บันทึกแล้ว|ได้รับ SMS แล้ว|เพิ่มเมนูใหม่ \d+ รายการแล้ว|ปิดการขาย “.+” แล้ว|เปิดใช้งานแล้ว|(?:รับ|เพิ่ม|ส่ง)\S*แล้วค่ะ$|แล้วค่ะ!/
// A question back to the merchant.
const ASKING = /ใช่ไหมคะ\??|ไหมคะ\?$|\?$/
// Something to fix, or not understood: she explains, hands on hips.
const PROBLEM = /ยังไม่|ช่วยเช็ค|ไม่ถูก|ไม่ได้ค่ะ|ลองใหม่|ลองพูด|ขอโทษ/

/**
 * Which pose fits what she is saying. In order: a heart for tap-only and thanks, a jump for something done, a wink
 * for a question or buttons to pick, hands on hips for something to fix. Otherwise, in the shop, the delivery bag
 * with a thumbs-up; on a new page, a wave hello.
 */
export function poseFor({ text, notice, asking, shop }: PoseMoment): PoseName {
  const said = notice ?? text
  if (HEART.test(said)) return 'heart'
  if (CHEER.test(said)) return 'cheer'
  if (asking || ASKING.test(said.trim())) return 'peace'
  if (notice && PROBLEM.test(notice)) return 'hips'
  if (shop) return 'bag'
  return notice ? 'hips' : 'wave'
}
