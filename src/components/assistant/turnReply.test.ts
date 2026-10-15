import { describe, expect, it, vi } from 'vitest'
import { understandThai } from '@/ai/language/understand.ts'
import { th } from '@/copy/th.ts'
import { noticeFor, replyTo } from './turnReply.ts'

describe('replyTo', () => {
  it('answers swearing alone calmly, without asking the screen', async () => {
    const interpret = vi.fn(() => true)
    expect(await replyTo(understandThai('เหี้ยเอ๊ย'), interpret)).toBe(th.language.calm)
    expect(interpret).not.toHaveBeenCalled()
  })

  it('does not understand a sentence with nothing left, without asking the screen', async () => {
    const interpret = vi.fn(() => true)
    expect(await replyTo({ text: '', onlyRude: false }, interpret)).toBe(false)
    expect(interpret).not.toHaveBeenCalled()
  })

  it('hands the screen the plain central Thai sentence', async () => {
    const interpret = vi.fn((text: string) => text === 'ต่อไปเลย')
    expect(await replyTo(understandThai('แม่งเอ๊ย ต่อไปเลย'), interpret)).toBe(true)
    expect(interpret).toHaveBeenCalledWith('ต่อไปเลย')
  })

  it('treats a failing screen as not understood', async () => {
    expect(await replyTo({ text: 'x', onlyRude: false }, () => Promise.reject(new Error('map down')))).toBe(false)
    expect(
      await replyTo({ text: 'x', onlyRude: false }, () => {
        throw new Error('boom')
      }),
    ).toBe(false)
  })
})

describe('noticeFor', () => {
  it('shows nothing when it worked, the not-understood line, or the screen’s own reply', () => {
    expect(noticeFor(true, null)).toBeNull()
    expect(noticeFor(false, null)).toBe(th.onboarding.notUnderstood)
    expect(noticeFor('ได้ค่ะ', null)).toBe('ได้ค่ะ')
  })

  it('puts the greeting in front, even when nothing else is said', () => {
    expect(noticeFor(true, 'สวัสดีเจ้า')).toBe('สวัสดีเจ้า')
    expect(noticeFor(false, 'สวัสดีเจ้า')).toBe(`สวัสดีเจ้า ${th.onboarding.notUnderstood}`)
  })
})
