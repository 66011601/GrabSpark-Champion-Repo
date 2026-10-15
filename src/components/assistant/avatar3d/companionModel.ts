import * as THREE from 'three'

/** Directions (from the head's centre) of the eyes, nose and mouth, so no strawberry seed lands there. */
export const OPEN_FACE = (dir: THREE.Vector3) => dir.z > 0.35 && (dir.x / 0.74) ** 2 + ((dir.y + 0.08) / 0.6) ** 2 < 1

const COLORS = {
  skin: 0xff7b6e, // strawberry red-pink
  hand: 0xffa092,
  seed: 0xf7c948,
  blush: 0xff5d7a,
  white: 0xffffff,
  iris: 0x6a3b1e,
  pupil: 0x1a0f0a,
  lash: 0x1b1210,
  brow: 0x3a2418,
  lips: 0xe0384d,
  mouth: 0x5a1820,
  hair: 0x2b1d1a,
  green: 0x10a24a, // Grab green: bows, visor, apron
  shirt: 0xf7f7f5,
  check: [0xf4e8d6, 0xe3cdb0], // the cap's soft beige check
}

export interface Companion {
  root: THREE.Group // moved in and out of the frame
  body: THREE.Group // bobs and sways
  eyes: [THREE.Object3D, THREE.Object3D] // squashed to blink
  brows: [THREE.Object3D, THREE.Object3D] // raised a little while she talks
  pout: THREE.Object3D // the closed, kiss-shaped mouth
  talk: THREE.Object3D // the open, smiling mouth shown while speaking
  waveArm: THREE.Object3D // the thumbs-up arm she pumps hello
  dispose: () => void
}

/** The head's strawberry shape: round on top, narrowing to the chin. */
const shape = (v: THREE.Vector3) => {
  const low = Math.max(0, -v.y)
  return v.set(v.x * (1 - 0.16 * low * low), v.y * 0.95, v.z * 0.92 * (1 - 0.12 * low * low))
}

/** A soft two-tone check, made in memory so it also builds where there is no canvas (the tests). */
function checkTexture() {
  const size = 8
  const data = new Uint8Array(size * size * 4)
  const [light, dark] = COLORS.check.map((hex) => new THREE.Color(hex))
  for (let i = 0; i < size * size; i++) {
    const tone = ((i % size) + Math.floor(i / size)) % 2 ? dark : light
    data.set([tone.r * 255, tone.g * 255, tone.b * 255, 255], i * 4)
  }
  const texture = new THREE.DataTexture(data, size, size)
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(3, 2)
  texture.magFilter = THREE.LinearFilter
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true
  return texture
}

/**
 * The companion as GrabMerchant's strawberry girl: a big round strawberry head with yellow seeds, huge brown eyes,
 * blushing cheeks and a little kiss of a pout; black hair with bangs and braids tied with green bows; a beige check cap
 * with a green visor; a white shirt and green apron, and both thumbs up. Built from plain shapes, so no model file is loaded.
 */
export function buildCompanion(): Companion {
  const material = (color: number, extra: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...extra })
  const mesh = (geometry: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0) => {
    const made = new THREE.Mesh(geometry, mat)
    made.position.set(x, y, z)
    return made
  }
  const at = new THREE.Vector3()
  const reshape = (geometry: THREE.BufferGeometry, change: (v: THREE.Vector3) => void) => {
    const position = geometry.attributes.position
    for (let i = 0; i < position.count; i++) {
      change(at.fromBufferAttribute(position, i))
      position.setXYZ(i, at.x, at.y, at.z)
    }
    geometry.computeVertexNormals()
    return geometry
  }

  const root = new THREE.Group()
  const body = new THREE.Group()
  root.add(body)

  // The head, and where its surface is at (x, y) so the face sits on it.
  const skin = material(COLORS.skin, { roughness: 0.5, emissive: 0x3a1410 }) // a little glow keeps the shaded side pink
  const head = mesh(reshape(new THREE.SphereGeometry(1, 64, 48), shape), skin)
  body.add(head)
  head.updateMatrixWorld()
  const ray = new THREE.Raycaster()
  const onHead = (x: number, y: number, lift = 0) => {
    ray.set(new THREE.Vector3(x, y, 5), new THREE.Vector3(0, 0, -1))
    const [hit] = ray.intersectObject(head)
    return new THREE.Vector3(x, y, (hit ? hit.point.z : 0.8) + lift)
  }
  const facingOut = (object: THREE.Object3D) => object.lookAt(object.position.clone().multiplyScalar(2))

  // Seeds around the face, lying flat on the skin.
  const spots: THREE.Vector3[] = []
  for (let i = 0; i < 180; i++) {
    const y = 1 - (2 * (i + 0.5)) / 180
    const r = Math.sqrt(1 - y * y)
    const turn = i * Math.PI * (3 - Math.sqrt(5))
    const point = shape(new THREE.Vector3(Math.cos(turn) * r, y, Math.sin(turn) * r))
    if (point.z > -0.2 && point.y < 0.3 && !OPEN_FACE(point.clone().normalize())) spots.push(point)
  }
  const seedGeometry = new THREE.SphereGeometry(0.032, 8, 6)
  seedGeometry.scale(0.75, 1.3, 0.45)
  const seeds = new THREE.InstancedMesh(seedGeometry, material(COLORS.seed, { roughness: 0.35 }), spots.length)
  seeds.name = 'seeds'
  const place = new THREE.Object3D()
  spots.forEach((point, i) => {
    place.position.copy(point)
    facingOut(place)
    place.updateMatrix()
    seeds.setMatrixAt(i, place.matrix)
  })
  body.add(seeds)

  const blushMaterial = new THREE.MeshBasicMaterial({ color: COLORS.blush, transparent: true, opacity: 0.45, depthWrite: false })
  for (const side of [-1, 1]) {
    const blush = mesh(new THREE.CircleGeometry(0.2, 32), blushMaterial)
    blush.position.copy(onHead(side * 0.5, -0.3, 0.012))
    facingOut(blush)
    blush.scale.set(1.1, 0.8, 1)
    body.add(blush)
  }

  // Big glossy eyes with a lash line and two highlights.
  const eyeParts = {
    white: material(COLORS.white, { roughness: 0.25 }),
    iris: material(COLORS.iris, { roughness: 0.2 }),
    pupil: material(COLORS.pupil, { roughness: 0.2 }),
    lash: material(COLORS.lash, { roughness: 0.5 }),
    shine: material(COLORS.white, { emissive: COLORS.white, emissiveIntensity: 0.8 }),
  }
  const eye = (side: number) => {
    const group = new THREE.Group()
    group.position.copy(onHead(side * 0.33, -0.02, -0.07))
    facingOut(group)
    const flat = (made: THREE.Mesh, depth: number) => (made.scale.set(1, 1, depth), made)
    const ball = flat(mesh(new THREE.SphereGeometry(0.19, 24, 18), eyeParts.white), 0.45)
    ball.scale.y = 1.08
    const lid = mesh(new THREE.TorusGeometry(0.19, 0.022, 8, 28, Math.PI), eyeParts.lash, 0, 0.005, 0.05)
    lid.scale.set(1.02, 1.08, 1)
    const lashes = [0.15, 0.32].map((angle) => {
      const lash = mesh(new THREE.CapsuleGeometry(0.012, 0.07, 3, 6), eyeParts.lash, side * Math.cos(angle) * 0.2, Math.sin(angle) * 0.2 + 0.02, 0.05)
      lash.rotation.z = -side * (0.9 + angle)
      return lash
    })
    group.add(
      ball,
      flat(mesh(new THREE.SphereGeometry(0.145, 24, 18), eyeParts.iris, 0, -0.01, 0.045), 0.4),
      flat(mesh(new THREE.SphereGeometry(0.08, 16, 12), eyeParts.pupil, 0, -0.01, 0.075), 0.4),
      mesh(new THREE.SphereGeometry(0.045, 12, 8), eyeParts.shine, 0.06, 0.06, 0.1),
      mesh(new THREE.SphereGeometry(0.02, 8, 6), eyeParts.shine, -0.05, -0.065, 0.1),
      lid,
      ...lashes,
    )
    body.add(group)
    return group
  }
  const eyes: [THREE.Object3D, THREE.Object3D] = [eye(-1), eye(1)]

  const browMaterial = material(COLORS.brow, { roughness: 0.7 })
  const brow = (side: number) => {
    const arc = mesh(new THREE.TorusGeometry(0.17, 0.016, 6, 20, Math.PI * 0.55), browMaterial)
    arc.position.copy(onHead(side * 0.33, 0.27, 0.005))
    arc.rotation.z = Math.PI * 0.225
    arc.userData.y = arc.position.y
    body.add(arc)
    return arc
  }
  const brows: [THREE.Object3D, THREE.Object3D] = [brow(-1), brow(1)]

  const nose = mesh(new THREE.SphereGeometry(0.06, 16, 12), material(0xf58a7d, { roughness: 0.45 }))
  nose.position.copy(onHead(0, -0.2, -0.025))
  body.add(nose)

  // The mouth: a small round kiss, and an open smile for talking.
  const lips = material(COLORS.lips, { roughness: 0.3 })
  const inside = material(COLORS.mouth, { roughness: 0.6 })
  const mouthAt = onHead(0, -0.4, 0)
  const pout = new THREE.Group()
  const ring = mesh(new THREE.TorusGeometry(0.07, 0.045, 12, 24), lips)
  ring.scale.set(1, 0.85, 0.8)
  const hole = mesh(new THREE.SphereGeometry(0.04, 12, 8), inside)
  hole.scale.set(1, 0.8, 0.4)
  pout.add(ring, hole)
  pout.position.copy(mouthAt)
  const talk = new THREE.Group()
  const opening = mesh(new THREE.SphereGeometry(0.1, 20, 14), inside)
  opening.scale.set(1.2, 0.75, 0.35)
  const smile = mesh(new THREE.TorusGeometry(0.11, 0.025, 10, 24, Math.PI), lips, 0, 0.02, 0.01)
  smile.rotation.z = Math.PI // corners up
  talk.add(opening, smile)
  talk.position.copy(mouthAt).add(new THREE.Vector3(0, -0.02, -0.01))
  talk.scale.x = 1.3
  talk.visible = false
  body.add(pout, talk)

  // Hair: a shell over the head that opens for the face below the bangs, and comes down the sides and back.
  const fringe = (x: number) => {
    const side = Math.abs(x)
    return side < 0.6 ? 0.3 + 0.05 * Math.abs(Math.sin(x * 15)) : 0.3 - (side - 0.6) * 3
  }
  const hairGeometry = reshape(new THREE.SphereGeometry(1.06, 64, 48), (v) => {
    const hidden = v.z > 0 ? v.y < fringe(v.x) : v.y < -0.55
    shape(v.multiplyScalar(hidden ? 0.85 / 1.06 : 1))
  })
  const hairMaterial = material(COLORS.hair, { roughness: 0.65 })
  const hair = mesh(hairGeometry, hairMaterial)
  hair.name = 'hair'
  body.add(hair)

  const green = material(COLORS.green, { roughness: 0.45 })
  for (const side of [-1, 1]) {
    // A braid of shrinking beads hanging behind each cheek.
    for (let i = 0; i < 5; i++) body.add(mesh(new THREE.SphereGeometry(0.2 - i * 0.02, 16, 12), hairMaterial, side * (0.95 - i * 0.02), -0.3 - i * 0.24, -0.05))
    const bow = new THREE.Group()
    for (const tilt of [-1, 1]) {
      const loop = mesh(new THREE.SphereGeometry(0.26, 16, 12), green, 0, tilt * 0.2, 0)
      loop.scale.set(0.45, 1, 0.75)
      loop.rotation.x = tilt * 0.35
      bow.add(loop)
    }
    const tail = mesh(new THREE.CapsuleGeometry(0.05, 0.22, 4, 8), green, 0, -0.18, 0.12)
    tail.rotation.x = 0.4
    bow.add(mesh(new THREE.SphereGeometry(0.09, 12, 10), green), tail)
    bow.position.set(side * 1.0, 0.0, 0.12)
    bow.rotation.y = side * 0.5
    body.add(bow)
  }

  // The cap: a puffy beige check crown, a green band and visor, and a little front patch.
  const check = checkTexture()
  const cap = new THREE.Group()
  cap.name = 'cap'
  const crown = mesh(new THREE.SphereGeometry(1, 48, 20, 0, Math.PI * 2, 0, Math.PI / 2), material(0xffffff, { map: check, roughness: 0.85 }))
  crown.scale.set(1.08, 0.66, 1.04)
  const band = mesh(new THREE.TorusGeometry(1.0, 0.07, 10, 48), green)
  band.rotation.x = Math.PI / 2
  band.scale.set(1.07, 1.03, 1)
  const visor = mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.05, 40, 1, false, -Math.PI / 2, Math.PI), green, 0, -0.04, 0.42)
  visor.scale.set(1, 1, 0.8)
  visor.rotation.x = 0.28
  const patch = mesh(new THREE.BoxGeometry(0.46, 0.17, 0.03), material(0xf8f1e2, { roughness: 0.8 }), 0, 0.26, 0.95)
  patch.rotation.x = -0.45
  const mark = mesh(new THREE.BoxGeometry(0.3, 0.06, 0.012), green, 0, 0, 0.02)
  patch.add(mark)
  cap.add(crown, band, visor, patch)
  cap.position.set(0, 0.46, -0.02)
  cap.rotation.x = -0.12
  body.add(cap)

  // A white shirt under a green apron.
  const shirt = material(COLORS.shirt, { roughness: 0.7 })
  const torso = mesh(new THREE.SphereGeometry(1, 40, 24), shirt, 0, -1.5, 0)
  torso.scale.set(0.72, 0.62, 0.55)
  const apron = mesh(new THREE.SphereGeometry(1.04, 40, 24, Math.PI * 0.27, Math.PI * 0.46, Math.PI * 0.32, Math.PI * 0.68), green)
  apron.name = 'apron'
  apron.position.copy(torso.position)
  apron.scale.copy(torso.scale)
  body.add(torso, apron)
  for (const side of [-1, 1]) {
    const strap = mesh(new THREE.CapsuleGeometry(0.035, 0.32, 4, 8), green, side * 0.24, -1.05, 0.38)
    strap.rotation.z = side * 0.25
    body.add(strap)
  }

  // Arms raised beside the face, both thumbs up.
  const hand = material(COLORS.hand, { roughness: 0.5 })
  const arm = (side: number) => {
    const shoulder = new THREE.Group()
    shoulder.position.set(side * 0.62, -1.25, 0.2)
    const reach = new THREE.Vector3(side * 0.3, 0.52, 0.3)
    const limb = mesh(new THREE.CapsuleGeometry(0.12, reach.length() - 0.12, 6, 12), hand)
    limb.position.copy(reach).multiplyScalar(0.5)
    limb.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), reach.clone().normalize())
    const sleeve = mesh(new THREE.SphereGeometry(0.2, 16, 12), shirt)
    const trim = mesh(new THREE.TorusGeometry(0.16, 0.035, 8, 20), green, side * 0.06, 0.1, 0.03)
    trim.quaternion.copy(limb.quaternion).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2))
    const fist = new THREE.Group()
    fist.position.copy(reach)
    const palm = mesh(new THREE.SphereGeometry(0.19, 18, 14), hand)
    palm.scale.set(0.95, 1.05, 0.85)
    const fingers = [0.1, 0.035, -0.035, -0.1].map((y) => {
      const finger = mesh(new THREE.CapsuleGeometry(0.045, 0.13, 4, 8), hand, side * 0.02, y, 0.14)
      finger.rotation.z = Math.PI / 2
      return finger
    })
    const thumb = mesh(new THREE.CapsuleGeometry(0.07, 0.11, 4, 10), hand, -side * 0.02, 0.24, 0.02)
    thumb.rotation.z = side * 0.15
    fist.add(palm, ...fingers, thumb)
    fist.rotation.z = -side * 0.12
    shoulder.add(limb, sleeve, trim, fist)
    body.add(shoulder)
    return shoulder
  }
  arm(-1)
  const waveArm = arm(1)

  const dispose = () => {
    check.dispose()
    root.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return
      object.geometry.dispose()
      for (const each of Array.isArray(object.material) ? object.material : [object.material]) each.dispose()
    })
  }
  return { root, body, eyes, brows, pout, talk, waveArm, dispose }
}
