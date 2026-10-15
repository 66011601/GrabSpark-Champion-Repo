import * as THREE from 'three'
import { buildCompanion } from './companionModel.ts'

export interface CompanionStage {
  dispose: () => void
}

const ENTER_DELAY = 0.25 // seconds: the page dims first, then the companion comes up
const ENTER_TIME = 0.7
const WAVE_UNTIL = 2.6

const easeOutBack = (t: number) => 1 + 2.2 * (t - 1) ** 3 + 1.2 * (t - 1) ** 2

/**
 * Draws the 3D companion on a transparent canvas: she rises in, pumps a thumbs-up hello, then bobs, blinks,
 * and smiles and talks while `speaking()` is true. With reduced motion she simply stands there and only talks.
 * `close` frames just her head, still and facing out, for the small round avatar.
 * Throws when WebGL is not available, so the caller can show the picture instead.
 */
export function mountCompanion(canvas: HTMLCanvasElement, { speaking, reducedMotion, close = false }: { speaking: () => boolean; reducedMotion: boolean; close?: boolean }): CompanionStage {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setClearColor(0x000000, 0)

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50)
  camera.position.set(0, close ? 0.1 : -0.2, close ? 6 : 7.2)
  camera.lookAt(0, close ? 0.1 : -0.45, 0)

  scene.add(new THREE.HemisphereLight(0xffffff, 0x6b5a3a, 1.7))
  const key = new THREE.DirectionalLight(0xffffff, 2.2)
  key.position.set(1, 2, 5) // mostly from the front, so her face stays bright
  const rim = new THREE.DirectionalLight(0xfff3c4, 1.3)
  rim.position.set(-3, 2, -3)
  scene.add(key, rim)

  const companion = buildCompanion()
  if (!close) companion.root.rotation.y = -0.35 // turned towards the speech bubble on her left
  scene.add(companion.root)

  const fit = () => {
    const { clientWidth: width, clientHeight: height } = canvas
    if (!width || !height) return
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
  }
  fit()
  const resize = new ResizeObserver(fit)
  resize.observe(canvas)

  const start = performance.now()
  renderer.setAnimationLoop(() => {
    const t = (performance.now() - start) / 1000
    if (reducedMotion || close) {
      companion.root.position.y = 0
      if (close && !reducedMotion) companion.body.position.y = Math.sin(t * 2) * 0.02
    } else {
      const enter = Math.min(1, Math.max(0, (t - ENTER_DELAY) / ENTER_TIME))
      companion.root.position.y = -3.4 * (1 - easeOutBack(enter))
      companion.body.position.y = Math.sin(t * 2) * 0.04
      companion.body.rotation.z = Math.sin(t * 1.3) * 0.035
      companion.waveArm.rotation.z = t > ENTER_DELAY && t < WAVE_UNTIL ? Math.sin((t - ENTER_DELAY) * 9) * 0.25 : 0
      const blink = t % 3.4 < 0.12 ? 0.15 : 1
      for (const eye of companion.eyes) eye.scale.y = blink
    }
    const talking = speaking()
    companion.pout.visible = !talking
    companion.talk.visible = talking
    if (talking) companion.talk.scale.y = 0.35 + 0.55 * Math.abs(Math.sin(t * 13))
    for (const brow of companion.brows) brow.position.y = brow.userData.y + (talking ? 0.035 : 0) // brows up: she's glad to help
    renderer.render(scene, camera)
  })

  return {
    dispose() {
      renderer.setAnimationLoop(null)
      resize.disconnect()
      companion.dispose()
      renderer.dispose()
    },
  }
}
