import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useRef } from 'react'
import * as THREE from 'three'
import { useStore } from '../store'
import { UboxContainer } from './UboxContainer'
import { FurnitureObject } from './FurnitureObject'

const S = 0.02

export function Scene() {
  const items = useStore((s) => s.items)
  const uboxCount = useStore((s) => s.uboxCount)
  const container = useStore((s) => s.container)
  const selectItem = useStore((s) => s.selectItem)
  const controlsRef = useRef<any>(null)

  // Calculate offsets using dynamic container width
  const W = container.width * S
  const gap = 0.3
  const totalWidth = uboxCount * W + (uboxCount - 1) * gap
  const getUboxOffset = (index: number) => -totalWidth / 2 + W / 2 + index * (W + gap)

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

        {Array.from({ length: uboxCount }, (_, i) => (
          <UboxContainer key={i} index={i} totalCount={uboxCount} />
        ))}

        {items.map((item) => (
          <FurnitureObject
            key={item.id}
            item={item}
            uboxOffset={getUboxOffset(item.uboxIndex)}
          />
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
