type SayListener = (text: string) => void

const listeners = new Set<SayListener>()

/** Lets the presenter's DemoPanel "speak" a scripted line into whichever screen is listening. */
export const demoBus = {
  say(text: string): void {
    for (const listener of listeners) listener(text)
  },
  onSay(listener: SayListener): () => void {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
}
