import { Line, Grid, Text } from '@react-three/drei'
import { useStore, fromInches, unitLabel } from '../store'
import type { Container } from '../store'

const S = 0.02

interface UboxContainerProps {
  container: Container
  showLabel: boolean
}

export function UboxContainer({ container, showLabel }: UboxContainerProps) {
  const containerUnit = useStore((s) => s.containerUnit)
  const { dims, name } = container

  const L = dims.length * S
  const W = dims.width * S
  const H = dims.height * S

  const u = unitLabel(containerUnit)
  const dispL = +fromInches(dims.length, containerUnit).toFixed(1)
  const dispW = +fromInches(dims.width, containerUnit).toFixed(1)
  const dispH = +fromInches(dims.height, containerUnit).toFixed(1)

  const hl = L / 2, hw = W / 2
  const corners: [number, number, number][] = [
    [-hl, 0, -hw], [hl, 0, -hw], [hl, 0, hw], [-hl, 0, hw],
    [-hl, H, -hw], [hl, H, -hw], [hl, H, hw], [-hl, H, hw],
  ]
  const edges: [[number, number, number], [number, number, number]][] = [
    [corners[0], corners[1]], [corners[1], corners[2]], [corners[2], corners[3]], [corners[3], corners[0]],
    [corners[4], corners[5]], [corners[5], corners[6]], [corners[6], corners[7]], [corners[7], corners[4]],
    [corners[0], corners[4]], [corners[1], corners[5]], [corners[2], corners[6]], [corners[3], corners[7]],
  ]

  return (
    <group>
      <mesh position={[0, H / 2, 0]}>
        <boxGeometry args={[L, H, W]} />
        <meshStandardMaterial color="#f5a623" transparent opacity={0.08} side={2} depthWrite={false} />
      </mesh>

      {edges.map((edge, i) => (
        <Line key={i} points={edge} color="#f5a623" lineWidth={2} />
      ))}

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

      <Text position={[0, -0.08, hw + 0.12]} fontSize={0.08} color="#f5a623" anchorX="center" anchorY="middle">
        {`${dispL}${u} (L)`}
      </Text>
      <Text position={[hl + 0.12, -0.08, 0]} fontSize={0.08} color="#f5a623" anchorX="center" anchorY="middle" rotation={[0, -Math.PI / 2, 0]}>
        {`${dispW}${u} (W)`}
      </Text>
      <Text position={[hl + 0.12, H / 2, hw + 0.12]} fontSize={0.08} color="#f5a623" anchorX="center" anchorY="middle">
        {`${dispH}${u} (H)`}
      </Text>

      {showLabel && (
        <Text position={[0, H + 0.1, 0]} fontSize={0.1} color="#f5a623" anchorX="center" anchorY="middle">
          {name}
        </Text>
      )}
    </group>
  )
}
