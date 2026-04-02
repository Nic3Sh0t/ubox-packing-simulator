import { useRef, useState, useEffect } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { TransformControls } from '@react-three/drei'
import * as THREE from 'three'
import { useStore } from '../store'
import type { FurnitureItem, ContainerDims } from '../store'

const S = 0.02

// Snap threshold in inches — not too aggressive
const WALL_SNAP_THRESHOLD = 3   // snap to container walls within 3 inches
const ITEM_SNAP_THRESHOLD = 3   // snap to other items within 3 inches

interface FurnitureObjectProps {
  item: FurnitureItem
  uboxOffset: number
}

// ─── AABB helpers ───────────────────────────────────────────────────────────

interface AABB {
  minX: number; maxX: number
  minY: number; maxY: number
  minZ: number; maxZ: number
}

/**
 * Compute oriented bounding box half-extents in world axes
 * by rotating the item's local box corners and taking the max extent.
 */
function getItemHalfSizes(item: FurnitureItem): { halfL: number; halfW: number; halfH: number } {
  if (item.shape === 'cylinder') {
    const r = (item.diameter || item.length) / 2
    // Cylinder: when tilted, AABB grows. Approximate with rotated bounding box.
    const euler = new THREE.Euler(item.rotation[0], item.rotation[1], item.rotation[2], 'XYZ')
    const q = new THREE.Quaternion().setFromEuler(euler)
    const corners = [
      new THREE.Vector3(r, item.height / 2, r),
      new THREE.Vector3(-r, item.height / 2, r),
      new THREE.Vector3(r, -item.height / 2, r),
      new THREE.Vector3(-r, -item.height / 2, r),
      new THREE.Vector3(r, item.height / 2, -r),
      new THREE.Vector3(-r, item.height / 2, -r),
      new THREE.Vector3(r, -item.height / 2, -r),
      new THREE.Vector3(-r, -item.height / 2, -r),
    ]
    let maxX = 0, maxY = 0, maxZ = 0
    for (const c of corners) {
      c.applyQuaternion(q)
      maxX = Math.max(maxX, Math.abs(c.x))
      maxY = Math.max(maxY, Math.abs(c.y))
      maxZ = Math.max(maxZ, Math.abs(c.z))
    }
    return { halfL: maxX, halfW: maxZ, halfH: maxY }
  }

  // Box / L-shape: rotate the 8 corners of the local bounding box
  const hx = item.length / 2
  const hy = item.height / 2
  const hz = item.width / 2
  const euler = new THREE.Euler(item.rotation[0], item.rotation[1], item.rotation[2], 'XYZ')
  const q = new THREE.Quaternion().setFromEuler(euler)

  let maxX = 0, maxY = 0, maxZ = 0
  for (let sx = -1; sx <= 1; sx += 2) {
    for (let sy = -1; sy <= 1; sy += 2) {
      for (let sz = -1; sz <= 1; sz += 2) {
        const v = new THREE.Vector3(hx * sx, hy * sy, hz * sz).applyQuaternion(q)
        maxX = Math.max(maxX, Math.abs(v.x))
        maxY = Math.max(maxY, Math.abs(v.y))
        maxZ = Math.max(maxZ, Math.abs(v.z))
      }
    }
  }
  return { halfL: maxX, halfW: maxZ, halfH: maxY }
}

function getAABB(cx: number, cy: number, cz: number, item: FurnitureItem): AABB {
  const { halfL, halfW, halfH } = getItemHalfSizes(item)
  return {
    minX: cx - halfL, maxX: cx + halfL,
    minY: cy - halfH, maxY: cy + halfH,
    minZ: cz - halfW, maxZ: cz + halfW,
  }
}

function aabbOverlap(a: AABB, b: AABB): boolean {
  return a.minX < b.maxX && a.maxX > b.minX
    && a.minY < b.maxY && a.maxY > b.minY
    && a.minZ < b.maxZ && a.maxZ > b.minZ
}

// ─── Core constraint solver (translate mode only) ───────────────────────────

function solvePosition(
  item: FurnitureItem,
  container: ContainerDims,
  otherItems: FurnitureItem[],
  rawX: number, rawY: number, rawZ: number,
): [number, number, number] {
  const { halfL, halfW, halfH } = getItemHalfSizes(item)

  // 1) Hard clamp: keep inside container
  let x = Math.max(-container.length / 2 + halfL, Math.min(container.length / 2 - halfL, rawX))
  let y = Math.max(halfH, Math.min(container.height - halfH, rawY))
  let z = Math.max(-container.width / 2 + halfW, Math.min(container.width / 2 - halfW, rawZ))

  // 2) Wall edge snapping
  const wallMinX = -container.length / 2 + halfL
  const wallMaxX =  container.length / 2 - halfL
  const wallMinZ = -container.width / 2 + halfW
  const wallMaxZ =  container.width / 2 - halfW
  const wallMinY = halfH
  const wallMaxY = container.height - halfH

  if (Math.abs(x - wallMinX) < WALL_SNAP_THRESHOLD) x = wallMinX
  else if (Math.abs(x - wallMaxX) < WALL_SNAP_THRESHOLD) x = wallMaxX

  if (Math.abs(z - wallMinZ) < WALL_SNAP_THRESHOLD) z = wallMinZ
  else if (Math.abs(z - wallMaxZ) < WALL_SNAP_THRESHOLD) z = wallMaxZ

  if (Math.abs(y - wallMinY) < WALL_SNAP_THRESHOLD) y = wallMinY
  else if (Math.abs(y - wallMaxY) < WALL_SNAP_THRESHOLD) y = wallMaxY

  // 3) Item-to-item snapping + collision resolution
  for (let pass = 0; pass < 3; pass++) {
    const myBox = getAABB(x, y, z, item)

    for (const other of otherItems) {
      const { halfL: oHL, halfW: oHW, halfH: oHH } = getItemHalfSizes(other)
      const [ox, oy, oz] = other.position
      const otherBox = getAABB(ox, oy, oz, other)

      const overlapX = myBox.minX < otherBox.maxX && myBox.maxX > otherBox.minX
      const overlapY = myBox.minY < otherBox.maxY && myBox.maxY > otherBox.minY
      const overlapZ = myBox.minZ < otherBox.maxZ && myBox.maxZ > otherBox.minZ

      // X-axis snap
      if (overlapY && overlapZ && !overlapX) {
        const gapRight = myBox.minX - otherBox.maxX
        const gapLeft = otherBox.minX - myBox.maxX
        if (gapRight >= 0 && gapRight < ITEM_SNAP_THRESHOLD) {
          x = ox + oHL + halfL
        } else if (gapLeft >= 0 && gapLeft < ITEM_SNAP_THRESHOLD) {
          x = ox - oHL - halfL
        }
      }

      // Z-axis snap
      if (overlapY && overlapX && !overlapZ) {
        const gapFront = myBox.minZ - otherBox.maxZ
        const gapBack = otherBox.minZ - myBox.maxZ
        if (gapFront >= 0 && gapFront < ITEM_SNAP_THRESHOLD) {
          z = oz + oHW + halfW
        } else if (gapBack >= 0 && gapBack < ITEM_SNAP_THRESHOLD) {
          z = oz - oHW - halfW
        }
      }

      // Y-axis snap
      if (overlapX && overlapZ && !overlapY) {
        const gapAbove = myBox.minY - otherBox.maxY
        const gapBelow = otherBox.minY - myBox.maxY
        if (gapAbove >= 0 && gapAbove < ITEM_SNAP_THRESHOLD) {
          y = oy + oHH + halfH
        } else if (gapBelow >= 0 && gapBelow < ITEM_SNAP_THRESHOLD) {
          y = oy - oHH - halfH
        }
      }
    }

    // Collision resolution
    const myBoxAfterSnap = getAABB(x, y, z, item)

    for (const other of otherItems) {
      const [ox, oy, oz] = other.position
      const otherBox = getAABB(ox, oy, oz, other)

      if (!aabbOverlap(myBoxAfterSnap, otherBox)) continue

      const overlapXLeft  = myBoxAfterSnap.maxX - otherBox.minX
      const overlapXRight = otherBox.maxX - myBoxAfterSnap.minX
      const overlapYDown  = myBoxAfterSnap.maxY - otherBox.minY
      const overlapYUp    = otherBox.maxY - myBoxAfterSnap.minY
      const overlapZBack  = myBoxAfterSnap.maxZ - otherBox.minZ
      const overlapZFront = otherBox.maxZ - myBoxAfterSnap.minZ

      const minOverlap = Math.min(
        overlapXLeft, overlapXRight,
        overlapYDown, overlapYUp,
        overlapZBack, overlapZFront,
      )

      const epsilon = 0.01
      if (minOverlap === overlapXLeft)       x -= overlapXLeft + epsilon
      else if (minOverlap === overlapXRight) x += overlapXRight + epsilon
      else if (minOverlap === overlapYDown)  y -= overlapYDown + epsilon
      else if (minOverlap === overlapYUp)    y += overlapYUp + epsilon
      else if (minOverlap === overlapZBack)  z -= overlapZBack + epsilon
      else if (minOverlap === overlapZFront) z += overlapZFront + epsilon

      x = Math.max(-container.length / 2 + halfL, Math.min(container.length / 2 - halfL, x))
      y = Math.max(halfH, Math.min(container.height - halfH, y))
      z = Math.max(-container.width / 2 + halfW, Math.min(container.width / 2 - halfW, z))
    }
  }

  return [x, y, z]
}

// ─── Shape components ───────────────────────────────────────────────────────

function BoxShape({ item, highlight }: { item: FurnitureItem; highlight: boolean }) {
  const geo = new THREE.BoxGeometry(item.length * S, item.height * S, item.width * S)
  return (
    <mesh>
      <boxGeometry args={[item.length * S, item.height * S, item.width * S]} />
      <meshStandardMaterial color={item.color} transparent opacity={0.85} />
      {highlight && (
        <lineSegments>
          <edgesGeometry args={[geo]} />
          <lineBasicMaterial color="white" />
        </lineSegments>
      )}
    </mesh>
  )
}

function LShapeShape({ item, highlight }: { item: FurnitureItem; highlight: boolean }) {
  const armW = (item.armWidth || 24) * S
  const L = item.length * S
  const W = item.width * S
  const H = item.height * S
  const backPos: [number, number, number] = [0, 0, -W / 2 + armW / 2]
  const sidePos: [number, number, number] = [-L / 2 + armW / 2, 0, 0]

  return (
    <group>
      <mesh position={backPos}>
        <boxGeometry args={[L, H, armW]} />
        <meshStandardMaterial color={item.color} transparent opacity={0.85} />
      </mesh>
      <mesh position={sidePos}>
        <boxGeometry args={[armW, H, W]} />
        <meshStandardMaterial color={item.color} transparent opacity={0.85} />
      </mesh>
      {highlight && (
        <>
          <lineSegments position={backPos}>
            <edgesGeometry args={[new THREE.BoxGeometry(L, H, armW)]} />
            <lineBasicMaterial color="white" />
          </lineSegments>
          <lineSegments position={sidePos}>
            <edgesGeometry args={[new THREE.BoxGeometry(armW, H, W)]} />
            <lineBasicMaterial color="white" />
          </lineSegments>
        </>
      )}
    </group>
  )
}

function CylinderShape({ item, highlight }: { item: FurnitureItem; highlight: boolean }) {
  const r = ((item.diameter || item.length) / 2) * S
  const h = item.height * S
  return (
    <mesh>
      <cylinderGeometry args={[r, r, h, 24]} />
      <meshStandardMaterial color={item.color} transparent opacity={0.85} />
      {highlight && (
        <lineSegments>
          <edgesGeometry args={[new THREE.CylinderGeometry(r, r, h, 24)]} />
          <lineBasicMaterial color="white" />
        </lineSegments>
      )}
    </mesh>
  )
}

// ─── Main component ─────────────────────────────────────────────────────────

export function FurnitureObject({ item, uboxOffset }: FurnitureObjectProps) {
  const selectedId = useStore((s) => s.selectedId)
  const selectItem = useStore((s) => s.selectItem)
  const updateItemPosition = useStore((s) => s.updateItemPosition)
  const updateItemRotation = useStore((s) => s.updateItemRotation)
  const container = useStore((s) => s.container)
  const allItems = useStore((s) => s.items)
  const transformMode = useStore((s) => s.transformMode)
  const isSelected = selectedId === item.id
  const groupRef = useRef<THREE.Group>(null!)
  const transformRef = useRef<any>(null!)
  const [hovered, setHovered] = useState(false)
  const isDragging = useRef(false)

  // Other items in the same ubox (for collision)
  const sameBoxItems = allItems.filter(
    (i) => i.id !== item.id && i.uboxIndex === item.uboxIndex
  )

  const scenePos: [number, number, number] = [
    item.position[0] * S + uboxOffset,
    item.position[1] * S,
    item.position[2] * S,
  ]

  // Real-time constraint enforcement during drag
  useEffect(() => {
    if (!isSelected || !transformRef.current) return
    const controls = transformRef.current

    const onObjectChange = () => {
      if (!groupRef.current) return
      isDragging.current = true

      if (transformMode === 'translate') {
        const pos = groupRef.current.position
        const rawX = (pos.x - uboxOffset) / S
        const rawY = pos.y / S
        const rawZ = pos.z / S
        const [sx, sy, sz] = solvePosition(item, container, sameBoxItems, rawX, rawY, rawZ)
        pos.set(sx * S + uboxOffset, sy * S, sz * S)
      }
      // In rotate mode, let the user rotate freely (no clamping needed)
    }

    const onDragEnd = () => {
      if (!groupRef.current || !isDragging.current) return
      isDragging.current = false

      if (transformMode === 'translate') {
        const pos = groupRef.current.position
        const finalX = (pos.x - uboxOffset) / S
        const finalY = pos.y / S
        const finalZ = pos.z / S
        updateItemPosition(item.id, [finalX, finalY, finalZ])
      } else {
        // Commit rotation from the 3D object
        const rot = groupRef.current.rotation
        updateItemRotation(item.id, [rot.x, rot.y, rot.z])
      }
    }

    controls.addEventListener('objectChange', onObjectChange)
    controls.addEventListener('mouseUp', onDragEnd)
    return () => {
      controls.removeEventListener('objectChange', onObjectChange)
      controls.removeEventListener('mouseUp', onDragEnd)
    }
  }, [isSelected, item, container, sameBoxItems, uboxOffset, updateItemPosition, updateItemRotation, transformMode])

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    selectItem(item.id)
  }

  const ShapeComponent = item.shape === 'lshape' ? LShapeShape :
    item.shape === 'cylinder' ? CylinderShape : BoxShape

  return (
    <>
      <group
        ref={groupRef}
        position={scenePos}
        rotation={item.rotation}
        onClick={onClick}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true) }}
        onPointerOut={() => setHovered(false)}
      >
        <ShapeComponent item={item} highlight={isSelected || hovered} />
      </group>
      {isSelected && groupRef.current && (
        <TransformControls
          ref={transformRef}
          object={groupRef.current}
          mode={transformMode}
          size={0.6}
        />
      )}
    </>
  )
}
