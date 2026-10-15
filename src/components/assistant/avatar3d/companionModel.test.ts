import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { buildCompanion, OPEN_FACE } from './companionModel.ts'

describe('buildCompanion', () => {
  const companion = buildCompanion()

  it('has the parts the animation moves', () => {
    for (const part of [companion.body, companion.eyes[0], companion.eyes[1], companion.brows[0], companion.brows[1], companion.pout, companion.talk, companion.waveArm]) {
      expect(part).toBeInstanceOf(THREE.Object3D)
    }
    expect(companion.root.getObjectByName('seeds')).toBeInstanceOf(THREE.InstancedMesh)
    for (const name of ['hair', 'cap', 'apron']) expect(companion.root.getObjectByName(name), name).toBeDefined()
  })

  it('dots strawberry seeds around the face but keeps the middle of it clear', () => {
    const seeds = companion.root.getObjectByName('seeds') as THREE.InstancedMesh
    expect(seeds.count).toBeGreaterThan(20)
    const matrix = new THREE.Matrix4()
    const at = new THREE.Vector3()
    for (let i = 0; i < seeds.count; i++) {
      seeds.getMatrixAt(i, matrix)
      at.setFromMatrixPosition(matrix).normalize()
      expect(OPEN_FACE(at), `seed ${i} sits on the eyes or mouth`).toBe(false)
    }
  })

  it('starts with the little kiss-shaped pout, not talking', () => {
    expect(companion.pout.visible).toBe(true)
    expect(companion.talk.visible).toBe(false)
  })

  it('frees everything it made', () => {
    const made = buildCompanion()
    let geometries = 0
    let textures = 0
    made.root.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return
      object.geometry.addEventListener('dispose', () => geometries++)
      const map = (object.material as THREE.MeshStandardMaterial).map
      map?.addEventListener('dispose', () => textures++)
    })
    made.dispose()
    expect(geometries).toBeGreaterThan(10)
    expect(textures).toBeGreaterThan(0)
  })
})
