/** Where one layer of the 2.5D companion sits: shifts in % of the artwork's size, turns in degrees. */
export interface LayerPose {
  x: number
  y: number
  rotate: number
  scaleY: number
}

export interface Pose {
  body: LayerPose
  head: LayerPose
  handL: LayerPose
  handR: LayerPose
}

const HELLO = 2.6 // seconds of thumbs-up pumping when she arrives

/**
 * The companion's pose at `t` seconds. Tilt (-1 to 1, from the pointer or an idle drift) shifts each layer by its
 * depth: the hands most, the body least, so the flat artwork reads as standing in space. She breathes, sways her head
 * on her neck, pumps her thumbs to say hello, and bobs her head while she talks.
 */
export function pose(t: number, { tiltX, tiltY, talking, entering }: { tiltX: number; tiltY: number; talking: boolean; entering: boolean }): Pose {
  const hello = entering && t < HELLO ? Math.sin(t * 9) * 8 * (1 - t / HELLO) : 0
  const hand = (phase: number, turn: number): LayerPose => ({
    x: tiltX * 1.4,
    y: tiltY * 0.9,
    rotate: Math.sin(t * 1.6 + phase) * 1.5 + turn * hello,
    scaleY: 1,
  })
  return {
    body: { x: tiltX * 0.3, y: tiltY * 0.2, rotate: 0, scaleY: 1 + 0.005 * (1 + Math.sin(t * 2)) },
    head: { x: tiltX * 0.8, y: tiltY * 0.5 + (talking ? -0.6 * Math.abs(Math.sin(t * 9)) : 0), rotate: Math.sin(t * 1.1) * 1.0 + tiltX * 0.4, scaleY: 1 },
    handL: hand(0, -1),
    handR: hand(1.3, 1),
  }
}
