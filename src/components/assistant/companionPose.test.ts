import { describe, expect, it } from 'vitest'
import { pose } from './companionPose.ts'

const still = { tiltX: 0, tiltY: 0, talking: false, entering: false }

describe('pose', () => {
  it('stands almost still at rest: only small sways', () => {
    for (let t = 0; t < 10; t += 0.37) {
      const p = pose(t, still)
      expect(Math.abs(p.head.rotate)).toBeLessThanOrEqual(1.5)
      for (const hand of [p.handL, p.handR]) expect(Math.abs(hand.rotate)).toBeLessThanOrEqual(2)
      expect(p.body.scaleY).toBeGreaterThanOrEqual(1)
      expect(p.body.scaleY).toBeLessThanOrEqual(1.01)
    }
  })

  it('pumps both thumbs while she says hello, then settles', () => {
    const hello = Math.max(...[0.3, 0.45, 0.6, 0.75].map((t) => Math.abs(pose(t, { ...still, entering: true }).handR.rotate)))
    expect(hello).toBeGreaterThan(4)
    expect(Math.abs(pose(4, { ...still, entering: true }).handR.rotate)).toBeLessThanOrEqual(2)
  })

  it('moves nearer layers further when tilted, so they read as depth', () => {
    const p = pose(0, { ...still, tiltX: 1 })
    expect(p.handL.x).toBeGreaterThan(p.head.x)
    expect(p.head.x).toBeGreaterThan(p.body.x)
    expect(p.body.x).toBeGreaterThan(0)
  })

  it('bobs her head while she talks', () => {
    const lifts = [0.1, 0.2, 0.3, 0.4].map((t) => pose(t, { ...still, talking: true }).head.y)
    expect(Math.min(...lifts)).toBeLessThan(-0.3)
    expect(pose(0.2, still).head.y).toBeCloseTo(0, 1)
  })
})
