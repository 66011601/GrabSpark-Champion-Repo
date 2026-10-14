import { afterEach, describe, expect, it, vi } from 'vitest'
import { READ_MS, readDocument, sampleScan } from './mockOcr.ts'

afterEach(() => {
  vi.useRealTimers()
})

describe('readDocument', () => {
  it('reads the sample for that document after a moment', async () => {
    vi.useFakeTimers()
    let done = false
    const reading = readDocument('idCard').then((scan) => {
      done = true
      return scan
    })
    await vi.advanceTimersByTimeAsync(READ_MS - 1)
    expect(done).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    await expect(reading).resolves.toEqual(sampleScan('idCard'))
  })

  it('hands out a fresh copy every time', async () => {
    const first = sampleScan('menu')
    first.items.pop()
    expect(sampleScan('menu').items).toHaveLength(5)
    const read = await readDocument('menu', 0)
    expect(read.kind).toBe('menu')
  })

  it('matches the demo store', () => {
    expect(sampleScan('idCard').idNumber).toBe('1234567890121')
    expect(sampleScan('bankBook').accountName).toBe('นาง แดง ใจดี')
    expect(sampleScan('menu').storeName.value).toBe('ครัวป้าแดง')
  })
})
