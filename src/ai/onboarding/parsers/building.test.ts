import { describe, expect, it } from 'vitest'
import { BUILDING_CONFIDENCE, parseBuilding } from './building.ts'

describe('parseBuilding', () => {
  it('reads a building named in a sentence', () => {
    expect(parseBuilding('ร้านชื่อครัวป้าแดง อยู่ตึกชินวัตรค่ะ')).toEqual({ value: 'ตึกชินวัตร', confidence: BUILDING_CONFIDENCE })
  })

  it('keeps a number that belongs to the name', () => {
    expect(parseBuilding('อยู่ในตลาดโชคชัย 4 ค่ะ')?.value).toBe('ตลาดโชคชัย 4')
  })

  it('stops at the floor or the street', () => {
    expect(parseBuilding('อาคารสาทรซิตี้ชั้นสอง')?.value).toBe('อาคารสาทรซิตี้')
    expect(parseBuilding('คอนโดลุมพินี ซอยลาดพร้าว 71')?.value).toBe('คอนโดลุมพินี')
  })

  it('ignores a place the shop is only near', () => {
    expect(parseBuilding('อยู่ลาดพร้าว 71 ใกล้ตลาดโชคชัย')).toBeNull()
    expect(parseBuilding('ตรงข้าม ห้างเซ็นทรัล')).toBeNull()
  })

  it('finds nothing in the demo script line', () => {
    expect(parseBuilding('ร้านชื่อครัวป้าแดงค่ะ ขายน้ำพริกปลาทู อาหารไทยบ้านๆ อยู่ลาดพร้าวซอยเจ็ดสิบเอ็ด ตรงข้ามเซเว่น')).toBeNull()
  })

  it('needs a name after the building word', () => {
    expect(parseBuilding('อยู่ในตึกค่ะ')).toBeNull()
  })
})
