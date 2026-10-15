import { describe, expect, it, vi } from 'vitest'
import { withChoices, type Choice } from './companionState.ts'

const choice = (id: string, label: string): Choice => ({ id, label, onPress: vi.fn() })

describe('withChoices', () => {
  it('puts the sheet chips first and drops companion buttons that repeat one by name', () => {
    const own = [{ label: 'ใช้ตำแหน่งตอนนี้', onPress: vi.fn() }]
    const merged = withChoices(own, [choice('here', 'ใช้ตำแหน่งตอนนี้'), choice('pin', 'ปักหมุดบนแผนที่')])
    expect(merged.map((chip) => [chip.id, chip.label])).toEqual([
      ['chip:ใช้ตำแหน่งตอนนี้', 'ใช้ตำแหน่งตอนนี้'],
      ['pin', 'ปักหมุดบนแผนที่'],
    ])
    expect(merged[0].onPress).toBe(own[0].onPress)
  })

  it('keeps two companion buttons that share a name apart by id', () => {
    const merged = withChoices([], [choice('back', 'ย้อนกลับ'), choice('control:back', 'ย้อนกลับ')])
    expect(new Set(merged.map((chip) => chip.id)).size).toBe(2)
  })
})
