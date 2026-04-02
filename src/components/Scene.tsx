import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useRef } from 'react'
import * as THREE from 'three'
import { useStore } from '../store'
import { UboxContainer } from './UboxContainer'
import { FurnitureObject } from './FurnitureObject'

const S = 0.02

export function Scene() {
  const containers = useStore((s) => s.containers)
  const activeContainerId = useStore((s) => s.activeContainerId)
  const selectItem = useStore((s) => s.selectItem)
  const controlsRef = useRef<any>(null)

  const isAllMode = activeContainerId === null
  const visibleContainers = isAllMode
    ? containers
    : containers.filter((c) => c.id === activeContainerId)

  // Calculate side-by-side offsets for All mode
  const gap = 0.3
  const getOffset = (index: number): number => {
    if (!isAllMode) return 0
    let offset = 0
    for (let i = 0; i < index; i++) {
      offset += visibleContainers[i].dims.width * S + gap
    }
    // Center them
    let totalWidth = 0
    for (const c of visibleContainers) totalWidth += c.dims.width * S
    totalWidth += (visibleContainers.length - 1) * gap
    return offset - totalWidth / 2 + visibleContainers[index].dims.width * S / 2
  }

  const defaultCamera = {
    position: new THREE.Vector3(2.5, 2.0, 2.5),
    fov: 50,
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}>
      <Canvas
        camera={{ position: defaultCamera.position.toArray() as [number, number, number], fov: defaultCamera.fov }}
        onPointerMissed={() => selectItem(null)}
        gl={{ antialias: true }}
      >
        <color attach="background" args={['#1a1a2e']} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 10, 5]} intensity={0.8} />
        <directionalLight position={[-3, 5, -3]} intensity={0.3} />

        {visibleContainers.map((c, idx) => (
          <group key={c.id} position={[getOffset(idx), 0, 0]}>
            <UboxContainer container={c} showLabel={isAllMode} />
            {c.items.map((item) => (
              <FurnitureObject
                key={item.id}
                item={item}
                containerDims={c.dims}
                otherItems={c.items.filter((i) => i.id !== item.id)}
              />
            ))}
          </group>
        ))}

        <OrbitControls
          ref={controlsRef}
          makeDefault
          enableDamping
          dampingFactor={0.1}
          minDistance={0.5}
          maxDistance={10}
        />

        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]} receiveShadow>
          <planeGeometry args={[20, 20]} />
          <meshStandardMaterial color="#12121f" />
        </mesh>
      </Canvas>
    </div>
  )
}
