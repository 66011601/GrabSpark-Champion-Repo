import { demoFlags } from '@/services/demoFlags.ts'
import { getAccount } from '@/services/merchantApi.ts'

export interface DeviceFix {
  lat: number
  lng: number
  accuracy: number // metres
}

export type LocateFailure = 'denied' | 'unavailable'

export const SIMULATED_ACCURACY = 15
/** Worse than this, the merchant is asked to move the pin to the shop's door. */
export const ROUGH_FIX_M = 100
const PERMISSION_DENIED = 1

const browserGeolocation = (): Geolocation | null => (typeof navigator === 'undefined' ? null : (navigator.geolocation ?? null))

/** Where the phone is (null = a device without GPS). The browser asks the merchant first; a refusal is just another answer. */
export function locateDevice(geo: Geolocation | null = browserGeolocation()): Promise<DeviceFix | LocateFailure> {
  if (demoFlags.simulateLocation) {
    const { lat, lng } = getAccount().deviceLocation
    return Promise.resolve({ lat, lng, accuracy: SIMULATED_ACCURACY })
  }
  if (!geo) return Promise.resolve('unavailable')
  return new Promise((resolve) => {
    geo.getCurrentPosition(
      (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude, accuracy: position.coords.accuracy }),
      (problem) => resolve(problem.code === PERMISSION_DENIED ? 'denied' : 'unavailable'),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    )
  })
}
