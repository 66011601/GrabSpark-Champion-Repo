import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearHeardLog, HEARD_LOG_MAX, heardLogFromUrl, heardLogOn, noteHeard, readHeardLog, setHeardLogOn } from './heardLog.ts'

const turn = (said: string, screen: string | null = 'S3') => ({ screen, said, others: [], fixed: said, outcome: 'done' as const })

beforeEach(() => {
  const store = new Map<string, string>()
  vi.stubGlobal('window', {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
    },
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('the heard log', () => {
  it('keeps nothing until a tester turns it on', () => {
    noteHeard(turn('เห็ดจั่งได๋'))
    expect(heardLogOn()).toBe(false)
    expect(readHeardLog()).toEqual([])
  })

  it('keeps each turn with its time once on', () => {
    setHeardLogOn(true)
    noteHeard(turn('เห็ดจั่งได๋'), new Date('2026-10-16T09:00:00Z'))
    expect(readHeardLog()).toEqual([{ at: '2026-10-16T09:00:00.000Z', ...turn('เห็ดจั่งได๋') }])
  })

  it('never keeps the email and password screen', () => {
    setHeardLogOn(true)
    noteHeard(turn('รหัสผ่านคือ', 'S2_ACCOUNT'))
    expect(readHeardLog()).toEqual([])
  })

  it('keeps only the newest turns', () => {
    setHeardLogOn(true)
    for (let index = 0; index <= HEARD_LOG_MAX; index += 1) noteHeard(turn(`ประโยค ${index}`))
    const log = readHeardLog()
    expect(log).toHaveLength(HEARD_LOG_MAX)
    expect(log[0].said).toBe('ประโยค 1')
  })

  it('is turned on and off from the address, and cleared', () => {
    heardLogFromUrl('?heardlog')
    expect(heardLogOn()).toBe(true)
    noteHeard(turn('ถัดไป'))
    clearHeardLog()
    expect(readHeardLog()).toEqual([])
    heardLogFromUrl('?heardlog=off')
    expect(heardLogOn()).toBe(false)
    heardLogFromUrl('?other=1')
    expect(heardLogOn()).toBe(false)
  })

  it('stays off when storage is blocked', () => {
    vi.stubGlobal('window', {
      localStorage: {
        getItem: () => {
          throw new Error('blocked')
        },
        setItem: () => {
          throw new Error('blocked')
        },
        removeItem: () => {},
      },
    })
    setHeardLogOn(true)
    noteHeard(turn('ถัดไป'))
    expect(heardLogOn()).toBe(false)
    expect(readHeardLog()).toEqual([])
  })
})
