import { afterEach, describe, expect, it } from 'vitest'
import { demoFlags } from '@/services/demoFlags.ts'
import { getAccount } from '@/services/merchantApi.ts'
import { locateDevice, SIMULATED_ACCURACY } from './geolocation.ts'

function device(outcome: { fix?: { latitude: number; longitude: number; accuracy: number }; code?: number }): Geolocation {
  return {
    getCurrentPosition: (ok: PositionCallback, fail?: PositionErrorCallback | null) => {
      if (outcome.fix) ok({ coords: outcome.fix } as GeolocationPosition)
      else fail?.({ code: outcome.code ?? 2 } as GeolocationPositionError)
    },
  } as Geolocation
}

afterEach(() => {
  demoFlags.simulateLocation = false
})

describe('locateDevice', () => {
  it('gives the phone’s point and how sure it is', async () => {
    expect(await locateDevice(device({ fix: { latitude: 16.42, longitude: 102.83, accuracy: 30 } }))).toEqual({ lat: 16.42, lng: 102.83, accuracy: 30 })
  })

  it('tells a refusal from a failure', async () => {
    expect(await locateDevice(device({ code: 1 }))).toBe('denied')
    expect(await locateDevice(device({ code: 3 }))).toBe('unavailable')
    expect(await locateDevice(null)).toBe('unavailable')
  })

  it('answers with the sample shop when the presenter simulates the location', async () => {
    demoFlags.simulateLocation = true
    const { lat, lng } = getAccount().deviceLocation
    expect(await locateDevice(device({ code: 1 }))).toEqual({ lat, lng, accuracy: SIMULATED_ACCURACY })
  })
})
