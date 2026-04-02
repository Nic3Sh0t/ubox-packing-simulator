import { Line, Grid, Text } from '@react-three/drei'
import { useStore, fromInches, unitLabel } from '../store'

const S = 0.02 // scale: 1 inch = 0.02 three.js units

interface UboxContainerProps {
  index: number
  totalCount: number
}

export function UboxContainer({ index, totalCount }: UboxContainerProps) {
  const container = useStore((s) => s.container)
  const containerUnit = useStore((s) => s.containerUnit)

  const L = container.length * S
  const W = container.width * S
  const H = container.height * S
  const gap = 0.3

  // Center the group of containers
  const totalWidth = totalCount * W + (totalCount - 1) * gap
  const offsetX = -totalWidth / 2 + W / 2 + index * (W + gap)

  const u = unitLabel(containerUnit)
  const dispL = +fromInches(container.length, containerUnit).toFixed(1)
  const dispW = +fromInches(container.width, containerUnit).toFixed(1)
  const dispH = +fromInches(container.height, containerUnit).toFixed(1)

  // 8 corners of the box
  const hl = L / 2, hw = W / 2
  const corners: [number, number, number][] = [
    [-hl, 0, -hw], [hl, 0, -hw], [hl, 0, hw], [-hl, 0, hw],
    [-hl, H, -hw], [hl, H, -hw], [hl, H, hw], [-hl, H, hw],
  ]
  // 12 edges
  const edges: [[number, number, number], [number, number, number]][] = [
    [corners[0], corners[1]], [corners[1], corners[2]], [corners[2], corners[3]], [corners[3], corners[0]],
    [corners[4], corners[5]], [corners[5], corners[6]], [corners[6], corners[7]], [corners[7], corners[4]],
    [corners[0], corners[4]], [corners[1], corners[5]], [corners[2], corners[6]], [corners[3], corners[7]],
  ]

  return (
    <group position={[offsetX, 0, 0]}>
      {/* Semi-transparent walls */}
      <mesh position={[0, H / 2, 0]}>
        <boxGeometry args={[L, H, W]} />
        <meshStandardMaterial color="#f5a623" transparent opacity={0.08} side={2} depthWrite={false} />
      </mesh>

      {/* Wireframe edges */}
      {edges.map((edge, i) => (
        <Line key={i} points={edge} color="#f5a623" lineWidth={2} />
      ))}

      {/* Floor grid */}
      <Grid
        args={[L, W]}
        position={[0, 0.001, 0]}
        cellSize={0.02 * 6}
        cellThickness={0.5}
        cellColor="#f5a623"
        sectionSize={0.02 * 12}
        sectionThickness={1}
        sectionColor="#f5a623"
        fadeDistance={5}
        fadeStrength={1}
        infiniteGrid={false}
      />

      {/* Dimension labels */}
      <Text
        position={[0, -0.08, hw + 0.12]}
        fontSize={0.08}
        color="#f5a623"
        anchorX="center"
        anchorY="middle"
      >
        {`${dispL}${u} (L)`}
      </Text>
      <Text
        position={[hl + 0.12, -0.08, 0]}
        fontSize={0.08}
        color="#f5a623"
        anchorX="center"
        anchorY="middle"
        rotation={[0, -Math.PI / 2, 0]}
      >
        {`${dispW}${u} (W)`}
      </Text>
      <Text
        position={[hl + 0.12, H / 2, hw + 0.12]}
        fontSize={0.08}
        color="#f5a623"
        anchorX="center"
        anchorY="middle"
      >
        {`${dispH}${u} (H)`}
      </Text>

      {totalCount > 1 && (
        <Text
          position={[0, H + 0.1, 0]}
          fontSize={0.1}
          color="#f5a623"
          anchorX="center"
          anchorY="middle"
        >
          {`Container ${index + 1}`}
        </Text>
      )}
    </group>
  )
}
