import * as THREE from 'three'

/** Directions (from the centre) that belong to the face, so no spike grows there. */
export const FACE_OPENING = (dir: THREE.Vector3) => dir.z > 0.3 && (dir.x / 0.7) ** 2 + ((dir.y + 0.05) / 0.72) ** 2 < 1

const COLORS = {
  husk: 0xa3b13c,
  spike: 0x8c9a2e,
  face: 0xf6dc95, // durian flesh
  eye: 0x1d1d1f,
  brow: 0x4a3520,
  blush: 0xff8fa3,
  mouth: 0x7a2630,
  collar: 0x7d3c98, // the purple top in the companion's photo
  gold: 0xe0b33a,
}

export interface Durian {
  root: THREE.Group // moved in and out of the frame
  body: THREE.Group // bobs and sways
  eyes: [THREE.Object3D, THREE.Object3D] // squashed to blink
  smile: THREE.Object3D // the closed mouth
  talk: THREE.Object3D // the open mouth, shown while speaking
  waveArm: THREE.Object3D // the arm that waves hello
  dispose: () => void
}

/**
 * The companion as a round, soft 3D durian: a spiky husk around a durian-flesh face, small arms,
 * and the purple collar and gold beads from the photo. Built from plain shapes, so no model file is loaded.
 */
export function buildDurian(): Durian {
  const material = (color: number, extra: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...extra })
  const mesh = (geometry: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0) => {
    const made = new THREE.Mesh(geometry, mat)
    made.position.set(x, y, z)
    return made
  }

  const root = new THREE.Group()
  const body = new THREE.Group()
  root.add(body)

  const huskMaterial = material(COLORS.husk, { roughness: 0.65 })
  const husk = mesh(new THREE.SphereGeometry(1, 48, 32), huskMaterial)
  husk.scale.set(1, 1.04, 0.96)
  body.add(husk)

  // Spikes on a Fibonacci sphere, each standing on the husk along its own direction.
  const spikeGeometry = new THREE.ConeGeometry(0.1, 0.26, 5)
  spikeGeometry.translate(0, 0.13, 0)
  const points: THREE.Vector3[] = []
  const total = 240
  for (let i = 0; i < total; i++) {
    const y = 1 - (2 * (i + 0.5)) / total
    const r = Math.sqrt(1 - y * y)
    const turn = i * Math.PI * (3 - Math.sqrt(5))
    const dir = new THREE.Vector3(Math.cos(turn) * r, y, Math.sin(turn) * r)
    if (!FACE_OPENING(dir) && y > -0.82) points.push(dir)
  }
  const spikes = new THREE.InstancedMesh(spikeGeometry, material(COLORS.spike, { roughness: 0.7, flatShading: true }), points.length)
  spikes.name = 'spikes'
  const up = new THREE.Vector3(0, 1, 0)
  const place = new THREE.Matrix4()
  points.forEach((dir, i) => {
    const size = 0.85 + ((i * 37) % 30) / 100 // a little uneven, like a real husk
    place.compose(new THREE.Vector3(dir.x, dir.y * 1.04, dir.z * 0.96).multiplyScalar(0.94), new THREE.Quaternion().setFromUnitVectors(up, dir), new THREE.Vector3(size, size, size))
    spikes.setMatrixAt(i, place)
  })
  body.add(spikes)

  const FACE = { y: -0.04, z: 0.7, w: 0.62, h: 0.64, d: 0.3 }
  const face = mesh(new THREE.SphereGeometry(1, 40, 28), material(COLORS.face, { roughness: 0.55 }), 0, FACE.y, FACE.z)
  face.scale.set(FACE.w, FACE.h, FACE.d)
  body.add(face)
  // How far forward the face's surface is at (x, y), so the features sit on it instead of inside it.
  const onFace = (x: number, y: number, lift: number) => FACE.z + FACE.d * Math.sqrt(Math.max(0, 1 - (x / FACE.w) ** 2 - ((y - FACE.y) / FACE.h) ** 2)) + lift

  const eyeMaterial = material(COLORS.eye, { roughness: 0.2 })
  const shine = material(0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.6 })
  const eye = (x: number) => {
    const group = new THREE.Group()
    group.position.set(x, 0.07, onFace(x, 0.07, -0.02))
    const ball = mesh(new THREE.SphereGeometry(0.1, 20, 16), eyeMaterial)
    ball.scale.set(0.9, 1.1, 0.55)
    group.add(ball, mesh(new THREE.SphereGeometry(0.03, 10, 8), shine, 0.03, 0.045, 0.05))
    body.add(group)
    return group
  }
  const eyes: [THREE.Object3D, THREE.Object3D] = [eye(-0.23), eye(0.23)]

  // Brows tilted in a little: the photo's no-nonsense look, kept friendly.
  const browMaterial = material(COLORS.brow)
  for (const side of [-1, 1]) {
    const brow = mesh(new THREE.CapsuleGeometry(0.022, 0.11, 4, 8), browMaterial, side * 0.22, 0.27, onFace(side * 0.22, 0.27, 0.01))
    brow.rotation.z = Math.PI / 2 + side * 0.28
    body.add(brow)
  }

  const blushMaterial = new THREE.MeshBasicMaterial({ color: COLORS.blush, transparent: true, opacity: 0.55, depthWrite: false })
  for (const side of [-1, 1]) {
    const blush = mesh(new THREE.CircleGeometry(0.08, 24), blushMaterial, side * 0.36, -0.1, onFace(side * 0.36, -0.1, 0.012))
    blush.rotation.y = side * 0.55
    body.add(blush)
  }

  const mouthMaterial = material(COLORS.mouth, { roughness: 0.4 })
  const smile = mesh(new THREE.TorusGeometry(0.075, 0.022, 8, 20, Math.PI), mouthMaterial, 0, -0.13, onFace(0, -0.13, 0.005))
  smile.rotation.z = Math.PI
  const talk = mesh(new THREE.SphereGeometry(0.075, 20, 14), mouthMaterial, 0, -0.18, onFace(0, -0.18, -0.01))
  talk.scale.set(1, 0.8, 0.4)
  talk.visible = false
  body.add(smile, talk)

  const collar = mesh(new THREE.TorusGeometry(0.62, 0.14, 14, 48), material(COLORS.collar, { roughness: 0.5 }), 0, -0.9, 0)
  collar.name = 'collar'
  collar.rotation.x = Math.PI / 2
  body.add(collar)
  const gold = material(COLORS.gold, { metalness: 0.6, roughness: 0.3 })
  for (let i = 0; i <= 10; i++) {
    const angle = Math.PI * (0.15 + (0.7 * i) / 10)
    body.add(mesh(new THREE.SphereGeometry(0.045, 12, 10), gold, Math.cos(angle) * 0.7, -0.76 - Math.sin(angle) * 0.04, Math.sin(angle) * 0.62))
  }

  const arm = (side: number) => {
    const shoulder = new THREE.Group()
    shoulder.position.set(side * 0.86, -0.35, 0.25)
    const limb = mesh(new THREE.CapsuleGeometry(0.11, 0.26, 6, 12), huskMaterial, side * 0.12, -0.12, 0)
    limb.rotation.z = side * 0.6
    shoulder.add(limb)
    body.add(shoulder)
    return shoulder
  }
  arm(-1)
  const waveArm = arm(1)

  const dispose = () => {
    root.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return
      object.geometry.dispose()
      for (const each of Array.isArray(object.material) ? object.material : [object.material]) each.dispose()
    })
  }
  return { root, body, eyes, smile, talk, waveArm, dispose }
}
