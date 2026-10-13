import { stripParticles } from './particles.ts'

export const BUILDING_CONFIDENCE = 0.85

// "อยู่ตึกชินวัตร 3 ค่ะ", "ในตลาดโชคชัย 4", "อาคารสาทรซิตี้". The name ends at a particle, a pause,
// or the next part of the address (ชั้น/ซอย/ถนน). After a landmark word ("ใกล้ตลาด…") the place is
// where the shop is near, not where it is, so that is left to the location parser.
const BUILDING_PATTERN =
  /(?<!(?:ตรงข้าม|ข้างๆ|ข้าง|ใกล้|หน้า|หลัง|ติดกับ|ติด)\s*)(อาคาร|ตึก|ตลาด|ห้าง|คอนโด|หมู่บ้าน|ศูนย์อาหาร|โครงการ)\s*(\S+?(?:\s\d+)?)(?=นะ|ค่ะ|ครับ|คะ|ชั้น|ซอย|ถนน|อยู่|\s|$)/

export function parseBuilding(text: string): { value: string; confidence: number } | null {
  const match = BUILDING_PATTERN.exec(text)
  if (!match) return null
  const name = stripParticles(match[2])
  return name ? { value: `${match[1]}${name}`, confidence: BUILDING_CONFIDENCE } : null
}
