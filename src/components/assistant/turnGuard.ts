/**
 * Tells a slow task whether its answer still matters: the screen is still there and no newer
 * merchant turn has begun since. Held in a ref by useVoiceInput; kept free of React so it can be tested.
 */
export function createTurnGuard() {
  let mounted = true
  let latest = 0
  return {
    mount: () => {
      mounted = true
    },
    unmount: () => {
      mounted = false
    },
    mounted: () => mounted,
    /** Starts a turn; the returned function is true only while it is still the latest and the screen is mounted. */
    begin: () => {
      const mine = ++latest
      return () => mounted && mine === latest
    },
  }
}
