import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { buildDurian, FACE_OPENING } from './durianModel.ts'

describe('buildDurian', () => {
  const durian = buildDurian()

  it('has the parts the animation moves', () => {
    for (const part of [durian.body, durian.eyes[0], durian.eyes[1], durian.brows[0], durian.brows[1], durian.pout, durian.talk, durian.waveArm]) expect(part).toBeInstanceOf(THREE.Object3D)
    expect(durian.root.getObjectByName('spikes')).toBeInstanceOf(THREE.InstancedMesh)
    expect(durian.root.getObjectByName('collar')).toBeDefined()
  })

  it('covers the husk in spikes but keeps them off the face', () => {
    const spikes = durian.root.getObjectByName('spikes') as THREE.InstancedMesh
    expect(spikes.count).toBeGreaterThan(80)
    const matrix = new THREE.Matrix4()
    const at = new THREE.Vector3()
    for (let i = 0; i < spikes.count; i++) {
      spikes.getMatrixAt(i, matrix)
      at.setFromMatrixPosition(matrix).normalize()
      expect(FACE_OPENING(at), `spike ${i} sits on the face`).toBe(false)
    }
  })

  it('starts with the mouth closed in a pout', () => {
    expect(durian.pout.visible).toBe(true)
    expect(durian.talk.visible).toBe(false)
  })

  it('frees everything it made', () => {
    const made = buildDurian()
    let disposed = 0
    made.root.traverse((object) => {
      if (object instanceof THREE.Mesh) object.geometry.addEventListener('dispose', () => disposed++)
    })
    made.dispose()
    expect(disposed).toBeGreaterThan(10)
  })
})
