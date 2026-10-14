import { describe, expect, it } from 'vitest'
import { fillSlots, runScript, type RunnerIO } from './runner.ts'
import { SCRIPTS } from './scripts.ts'
import type { Script } from './types.ts'

const script = (id: string) => SCRIPTS.find((s) => s.id === id) as Script

function recorder(onSay?: (text: string) => Promise<void>): { io: RunnerIO; log: string[] } {
  const log: string[] = []
  return {
    log,
    io: {
      go: async (step) => void log.push(`go:${step.screen}:${step.target ?? step.highlight ?? ''}`),
      say: async (text) => {
        log.push(`say:${text}`)
        await onSay?.(text)
      },
    },
  }
}

describe('runScript', () => {
  it('goes to each step, then says its line, in order', async () => {
    const { io, log } = recorder()
    const finished = await runScript(script('feedback'), io, new AbortController().signal)
    expect(finished).toBe(true)
    expect(log.filter((entry) => entry.startsWith('go:')).map((entry) => entry.split(':')[1])).toEqual(['HOME', 'FEEDBACK', 'FEEDBACK', 'FEEDBACK'])
    expect(log).toHaveLength(script('feedback').steps.length * 2)
    expect(log[0].startsWith('go:HOME')).toBe(true)
    expect(log[1].startsWith('say:')).toBe(true)
  })

  it('stops when cancelled, even while a line is still being said', async () => {
    const controller = new AbortController()
    const { io, log } = recorder(() => {
      controller.abort()
      return new Promise<void>(() => {}) // a line that never finishes, like speech that was cut off
    })
    expect(await runScript(script('sales'), io, controller.signal)).toBe(false)
    expect(log).toHaveLength(2) // one go, one say, nothing after
  })

  it('does nothing when it is cancelled before it starts', async () => {
    const controller = new AbortController()
    controller.abort()
    const { io, log } = recorder()
    expect(await runScript(script('promo'), io, controller.signal)).toBe(false)
    expect(log).toEqual([])
  })

  it('only prepares drafts: no step of any script confirms anything', () => {
    for (const s of SCRIPTS) {
      for (const step of s.steps) {
        expect(step.target ?? '').not.toMatch(/confirm/)
        expect(step.set?.done ?? null).toBeNull()
      }
    }
  })
})

describe('fillSlots', () => {
  it('puts the named menu item into the sold-out script', () => {
    const steps = script('soldOut').steps.map((step) => fillSlots(step, { item: 'ข้าวหมูกรอบ', itemId: 'M04' }))
    expect(steps[1].highlight).toBe('item-M04')
    expect(steps[1].say).toContain('ข้าวหมูกรอบ')
    expect(steps[2].target).toBe('soldout-M04')
    expect(steps[2].set?.soldOut).toEqual({ kind: 'soldOut', itemId: 'M04', until: null })
  })

  it('leaves a script without placeholders as it was', () => {
    const step = script('sales').steps[0]
    expect(fillSlots(step, {})).toEqual(step)
  })
})
