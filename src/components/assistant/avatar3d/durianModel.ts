import * as THREE from 'three'

/** Directions (from the centre) where the hood opens for the face, so no spike grows there. */
export const FACE_OPENING = (dir: THREE.Vector3) => dir.z > 0.2 && (dir.x / 0.7) ** 2 + ((dir.y + 0.06) / 0.78) ** 2 < 1

const COLORS = {
  husk: 0xa7a83c,
  spike: 0xb8b64a,
  skin: 0xd99c74,
  lid: 0xc98a64, // a shade darker, so the heavy upper lids read
  white: 0xf3ece2,
  iris: 0x3a2417,
  brow: 0x3a2418,
  lips: 0xa4474a,
  mouth: 0x4f1a1f,
  top: 0x8b3a8f, // the purple top in the companion's photo
  gold: 0xe0b33a,
}

export interface Durian {
  root: THREE.Group // moved in and out of the frame
  body: THREE.Group // bobs and sways
  eyes: [THREE.Object3D, THREE.Object3D] // squashed to blink
  brows: [THREE.Object3D, THREE.Object3D] // knitted at rest, eased while she talks
  pout: THREE.Object3D // the closed mouth, corners down like the photo
  talk: THREE.Object3D // the open, smiling mouth shown while speaking
  waveArm: THREE.Object3D // the arm that waves hello
  dispose: () => void
}

/**
 * The companion from her photo, in 3D: a plump, stern auntie whose face looks out of a spiky durian-husk hood,
 * in a purple top with gold beads. Built from plain shapes, so no model file is loaded.
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

  // The hood: a tall husk, spikes everywhere but the face, and a tight ring of them around the face like the photo.
  const HUSK = new THREE.Vector3(1, 1.12, 0.92)
  const huskMaterial = material(COLORS.husk, { roughness: 0.75 })
  const husk = mesh(new THREE.SphereGeometry(1, 48, 32), huskMaterial)
  husk.scale.copy(HUSK)
  body.add(husk)

  const onHusk = (dir: THREE.Vector3) => dir.clone().multiply(HUSK).multiplyScalar(0.97)
  const spots: { at: THREE.Vector3; dir: THREE.Vector3; size: number }[] = []
  const total = 760
  for (let i = 0; i < total; i++) {
    const y = 1 - (2 * (i + 0.5)) / total
    const r = Math.sqrt(1 - y * y)
    const turn = i * Math.PI * (3 - Math.sqrt(5))
    const dir = new THREE.Vector3(Math.cos(turn) * r, y, Math.sin(turn) * r)
    const at = onHusk(dir)
    if (y > -0.8 && !FACE_OPENING(at.clone().normalize())) spots.push({ at, dir, size: 0.8 + ((i * 37) % 40) / 100 })
  }
  for (let i = 0; i < 44; i++) {
    const angle = (i / 44) * Math.PI * 2
    const dir = new THREE.Vector3(Math.sin(angle) * 0.7 * 1.08, Math.cos(angle) * 0.78 * 1.08 - 0.06, 0)
    if (dir.lengthSq() >= 0.92) continue // the ring's lower edge runs under the chin, behind the collar
    dir.z = Math.sqrt(1 - dir.lengthSq())
    const at = onHusk(dir)
    if (!FACE_OPENING(at.clone().normalize())) spots.push({ at, dir: dir.clone().add(new THREE.Vector3(0, 0, 0.4)).normalize(), size: 0.75 })
  }
  const spikeGeometry = new THREE.ConeGeometry(0.065, 0.17, 4)
  spikeGeometry.translate(0, 0.085, 0)
  const spikes = new THREE.InstancedMesh(spikeGeometry, material(COLORS.spike, { roughness: 0.7, flatShading: true }), spots.length)
  spikes.name = 'spikes'
  const up = new THREE.Vector3(0, 1, 0)
  const place = new THREE.Matrix4()
  spots.forEach(({ at, dir, size }, i) => {
    place.compose(at, new THREE.Quaternion().setFromUnitVectors(up, dir), new THREE.Vector3(size, size, size))
    spikes.setMatrixAt(i, place)
  })
  body.add(spikes)

  // The face: wide and full in the cheeks and jaw, filling the hood's opening.
  const skin = material(COLORS.skin, { roughness: 0.5 })
  const faceGeometry = new THREE.SphereGeometry(1, 48, 36)
  const vertex = new THREE.Vector3()
  const position = faceGeometry.attributes.position
  for (let i = 0; i < position.count; i++) {
    vertex.fromBufferAttribute(position, i)
    const low = Math.max(0, -vertex.y)
    vertex.x *= 1 + 0.16 * low * (1 - low) * 2 // fuller jaw and jowls
    vertex.z *= 1 - 0.08 * Math.max(0, vertex.y) // a flatter brow
    if (vertex.z > 0) vertex.z += 0.16 * Math.exp(-((Math.abs(vertex.x) - 0.5) ** 2 + (vertex.y + 0.25) ** 2) / 0.05) // round cheeks
    position.setXYZ(i, vertex.x, vertex.y, vertex.z)
  }
  faceGeometry.computeVertexNormals()
  const face = mesh(faceGeometry, skin, 0, -0.08, 0.56)
  face.scale.set(0.68, 0.78, 0.44)
  body.add(face)
  face.updateMatrixWorld()

  // Where the face's surface is at (x, y), so the features sit on it instead of inside it.
  const ray = new THREE.Raycaster()
  const onFace = (x: number, y: number, lift = 0) => {
    ray.set(new THREE.Vector3(x, y, 5), new THREE.Vector3(0, 0, -1))
    const [hit] = ray.intersectObject(face)
    return (hit ? hit.point.z : 0.6) + lift
  }

  const chin = mesh(new THREE.SphereGeometry(0.2, 24, 16), skin, 0, -0.7, onFace(0, -0.66, -0.17))
  chin.scale.set(1.35, 0.6, 0.85) // the soft double chin
  body.add(chin)

  const nose = new THREE.Group()
  nose.add(mesh(new THREE.CapsuleGeometry(0.035, 0.14, 4, 10), skin, 0, 0.02, 0))
  const tip = mesh(new THREE.SphereGeometry(0.07, 20, 14), skin, 0, -0.07, 0.025)
  tip.scale.set(1, 0.85, 0.9)
  nose.add(tip, mesh(new THREE.SphereGeometry(0.045, 14, 10), skin, -0.06, -0.09, -0.01), mesh(new THREE.SphereGeometry(0.045, 14, 10), skin, 0.06, -0.09, -0.01))
  nose.position.set(0, -0.06, onFace(0, -0.06, -0.01))
  body.add(nose)

  // Eyes under heavy lids, looking straight out: the photo's unimpressed look.
  const white = material(COLORS.white, { roughness: 0.3 })
  const iris = material(COLORS.iris, { roughness: 0.2 })
  const lid = material(COLORS.lid, { roughness: 0.5 })
  const shine = material(0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.6 })
  const eye = (x: number) => {
    const group = new THREE.Group()
    group.position.set(x, 0.1, onFace(x, 0.1, -0.035))
    const look = new THREE.Group() // sized here, so a blink can squash the group freely
    look.scale.setScalar(1.25)
    group.add(look)
    const ball = mesh(new THREE.SphereGeometry(0.085, 20, 16), white)
    ball.scale.set(1.3, 0.72, 0.5)
    const pupil = mesh(new THREE.SphereGeometry(0.048, 16, 12), iris, 0, -0.008, 0.032)
    pupil.scale.set(1, 1, 0.5)
    const upper = mesh(new THREE.SphereGeometry(0.1, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), lid, 0, -0.004, 0.006)
    upper.scale.set(1.25, 0.5, 0.62)
    look.add(ball, pupil, upper, mesh(new THREE.SphereGeometry(0.014, 8, 6), shine, 0.018, 0.012, 0.06))
    body.add(group)
    return group
  }
  const eyes: [THREE.Object3D, THREE.Object3D] = [eye(-0.21), eye(0.21)]

  // Thick brows knitted down towards the nose.
  const browMaterial = material(COLORS.brow, { roughness: 0.8 })
  const brow = (side: number) => {
    const made = mesh(new THREE.CapsuleGeometry(0.03, 0.17, 4, 10), browMaterial, side * 0.21, 0.25, onFace(side * 0.21, 0.25, 0.01))
    made.rotation.z = Math.PI / 2 + side * 0.32
    body.add(made)
    return made
  }
  const brows: [THREE.Object3D, THREE.Object3D] = [brow(-1), brow(1)]

  // The mouth: a small pout with its corners down, and an open smile for talking.
  const lips = material(COLORS.lips, { roughness: 0.35 })
  const mouthZ = onFace(0, -0.33, 0)
  const pout = new THREE.Group()
  const frown = mesh(new THREE.TorusGeometry(0.085, 0.026, 10, 24, Math.PI), lips, 0, 0.005, 0)
  frown.scale.set(1, 0.55, 1)
  const lower = mesh(new THREE.SphereGeometry(0.07, 20, 14), lips, 0, -0.03, -0.012)
  lower.scale.set(1.15, 0.5, 0.6)
  pout.add(frown, lower)
  pout.position.set(0, -0.33, mouthZ)
  pout.scale.setScalar(1.2)
  const talk = new THREE.Group()
  const opening = mesh(new THREE.SphereGeometry(0.08, 20, 14), material(COLORS.mouth, { roughness: 0.6 }))
  opening.scale.set(1.15, 0.7, 0.35)
  const smile = mesh(new THREE.TorusGeometry(0.088, 0.024, 10, 24, Math.PI), lips, 0, 0.012, 0.004)
  smile.rotation.z = Math.PI // corners up
  smile.scale.set(1, 0.75, 1)
  talk.add(opening, smile)
  talk.position.set(0, -0.34, mouthZ - 0.01)
  talk.scale.x = 1.2
  talk.visible = false
  body.add(pout, talk)

  // Her purple top and the gold beads around the hood.
  const top = mesh(new THREE.SphereGeometry(1, 40, 24), material(COLORS.top, { roughness: 0.45 }), 0, -1.35, 0.05)
  top.name = 'collar'
  top.scale.set(1.3, 0.62, 0.85)
  body.add(top)
  const gold = material(COLORS.gold, { metalness: 0.7, roughness: 0.3 })
  for (let i = 0; i <= 14; i++) {
    const angle = Math.PI * (0.12 + (0.76 * i) / 14)
    const sag = Math.sin(angle) ** 4 * 0.12
    body.add(mesh(new THREE.SphereGeometry(0.05, 12, 10), gold, Math.cos(angle) * 0.82, -0.86 - sag, Math.sin(angle) * 0.72))
  }
  const pendant = mesh(new THREE.OctahedronGeometry(0.09), gold, 0, -1.08, 0.78)
  pendant.scale.set(1, 1.3, 0.5)
  body.add(pendant)

  const arm = (side: number) => {
    const shoulder = new THREE.Group()
    shoulder.position.set(side * 1.05, -1.05, 0.2)
    const sleeve = mesh(new THREE.CapsuleGeometry(0.15, 0.32, 6, 12), material(COLORS.top, { roughness: 0.45 }), side * 0.1, -0.28, 0)
    sleeve.rotation.z = side * 0.3
    shoulder.add(sleeve, mesh(new THREE.SphereGeometry(0.13, 16, 12), skin, side * 0.2, -0.6, 0))
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
  return { root, body, eyes, brows, pout, talk, waveArm, dispose }
}
