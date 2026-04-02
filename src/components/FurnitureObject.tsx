import { useRef, useState, useEffect } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { TransformControls } from '@react-three/drei'
import * as THREE from 'three'
import { useStore } from '../store'
import type { FurnitureItem, ContainerDims } from '../store'

const S = 0.02
const WALL_SNAP_THRESHOLD = 3
const ITEM_SNAP_THRESHOLD = 3

interface FurnitureObjectProps {
  item: FurnitureItem
  containerDims: ContainerDims
  otherItems: FurnitureItem[]
}

interface AABB {
  minX: number; maxX: number
  minY: number; maxY: number
  minZ: number; maxZ: number
}

function getItemHalfSizes(item: FurnitureItem): { halfL: number; halfW: number; halfH: number } {
  const hx = item.shape === 'cylinder' ? (item.diameter || item.length) / 2 : item.length / 2
  const hy = item.height / 2
  const hz = item.shape === 'cylinder' ? (item.diameter || item.length) / 2 : item.width / 2

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
  return { minX: cx - halfL, maxX: cx + halfL, minY: cy - halfH, maxY: cy + halfH, minZ: cz - halfW, maxZ: cz + halfW }
}

function aabbOverlap(a: AABB, b: AABB): boolean {
  return a.minX < b.maxX && a.maxX > b.minX && a.minY < b.maxY && a.maxY > b.minY && a.minZ < b.maxZ && a.maxZ > b.minZ
}

function solvePosition(
  item: FurnitureItem, container: ContainerDims, otherItems: FurnitureItem[],
  rawX: number, rawY: number, rawZ: number,
): [number, number, number] {
  const { halfL, halfW, halfH } = getItemHalfSizes(item)
  let x = Math.max(-container.length / 2 + halfL, Math.min(container.length / 2 - halfL, rawX))
  let y = Math.max(halfH, Math.min(container.height - halfH, rawY))
  let z = Math.max(-container.width / 2 + halfW, Math.min(container.width / 2 - halfW, rawZ))

  const wallMinX = -container.length / 2 + halfL, wallMaxX = container.length / 2 - halfL
  const wallMinZ = -container.width / 2 + halfW, wallMaxZ = container.width / 2 - halfW
  const wallMinY = halfH, wallMaxY = container.height - halfH

  if (Math.abs(x - wallMinX) < WALL_SNAP_THRESHOLD) x = wallMinX
  else if (Math.abs(x - wallMaxX) < WALL_SNAP_THRESHOLD) x = wallMaxX
  if (Math.abs(z - wallMinZ) < WALL_SNAP_THRESHOLD) z = wallMinZ
  else if (Math.abs(z - wallMaxZ) < WALL_SNAP_THRESHOLD) z = wallMaxZ
  if (Math.abs(y - wallMinY) < WALL_SNAP_THRESHOLD) y = wallMinY
  else if (Math.abs(y - wallMaxY) < WALL_SNAP_THRESHOLD) y = wallMaxY

  for (let pass = 0; pass < 3; pass++) {
    const myBox = getAABB(x, y, z, item)
    for (const other of otherItems) {
      const { halfL: oHL, halfW: oHW, halfH: oHH } = getItemHalfSizes(other)
      const [ox, oy, oz] = other.position
      const otherBox = getAABB(ox, oy, oz, other)
      const oX = myBox.minX < otherBox.maxX && myBox.maxX > otherBox.minX
      const oY = myBox.minY < otherBox.maxY && myBox.maxY > otherBox.minY
      const oZ = myBox.minZ < otherBox.maxZ && myBox.maxZ > otherBox.minZ

      if (oY && oZ && !oX) {
        const gR = myBox.minX - otherBox.maxX, gL = otherBox.minX - myBox.maxX
        if (gR >= 0 && gR < ITEM_SNAP_THRESHOLD) x = ox + oHL + halfL
        else if (gL >= 0 && gL < ITEM_SNAP_THRESHOLD) x = ox - oHL - halfL
      }
      if (oY && oX && !oZ) {
        const gF = myBox.minZ - otherBox.maxZ, gB = otherBox.minZ - myBox.maxZ
        if (gF >= 0 && gF < ITEM_SNAP_THRESHOLD) z = oz + oHW + halfW
        else if (gB >= 0 && gB < ITEM_SNAP_THRESHOLD) z = oz - oHW - halfW
      }
      if (oX && oZ && !oY) {
        const gA = myBox.minY - otherBox.maxY, gBl = otherBox.minY - myBox.maxY
        if (gA >= 0 && gA < ITEM_SNAP_THRESHOLD) y = oy + oHH + halfH
        else if (gBl >= 0 && gBl < ITEM_SNAP_THRESHOLD) y = oy - oHH - halfH
      }
    }

    const myBoxSnap = getAABB(x, y, z, item)
    for (const other of otherItems) {
      const [ox, oy, oz] = other.position
      const otherBox = getAABB(ox, oy, oz, other)
      if (!aabbOverlap(myBoxSnap, otherBox)) continue
      const oXL = myBoxSnap.maxX - otherBox.minX, oXR = otherBox.maxX - myBoxSnap.minX
      const oYD = myBoxSnap.maxY - otherBox.minY, oYU = otherBox.maxY - myBoxSnap.minY
      const oZB = myBoxSnap.maxZ - otherBox.minZ, oZF = otherBox.maxZ - myBoxSnap.minZ
      const min = Math.min(oXL, oXR, oYD, oYU, oZB, oZF)
      const eps = 0.01
      if (min === oXL) x -= oXL + eps; else if (min === oXR) x += oXR + eps
      else if (min === oYD) y -= oYD + eps; else if (min === oYU) y += oYU + eps
      else if (min === oZB) z -= oZB + eps; else if (min === oZF) z += oZF + eps
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
      {highlight && <lineSegments><edgesGeometry args={[geo]} /><lineBasicMaterial color="white" /></lineSegments>}
    </mesh>
  )
}

function LShapeShape({ item, highlight }: { item: FurnitureItem; highlight: boolean }) {
  const armW = (item.armWidth || 24) * S, L = item.length * S, W = item.width * S, H = item.height * S
  const backPos: [number, number, number] = [0, 0, -W / 2 + armW / 2]
  const sidePos: [number, number, number] = [-L / 2 + armW / 2, 0, 0]
  return (
    <group>
      <mesh position={backPos}><boxGeometry args={[L, H, armW]} /><meshStandardMaterial color={item.color} transparent opacity={0.85} /></mesh>
      <mesh position={sidePos}><boxGeometry args={[armW, H, W]} /><meshStandardMaterial color={item.color} transparent opacity={0.85} /></mesh>
      {highlight && <>
        <lineSegments position={backPos}><edgesGeometry args={[new THREE.BoxGeometry(L, H, armW)]} /><lineBasicMaterial color="white" /></lineSegments>
        <lineSegments position={sidePos}><edgesGeometry args={[new THREE.BoxGeometry(armW, H, W)]} /><lineBasicMaterial color="white" /></lineSegments>
      </>}
    </group>
  )
}

function CylinderShape({ item, highlight }: { item: FurnitureItem; highlight: boolean }) {
  const r = ((item.diameter || item.length) / 2) * S, h = item.height * S
  return (
    <mesh>
      <cylinderGeometry args={[r, r, h, 24]} />
      <meshStandardMaterial color={item.color} transparent opacity={0.85} />
      {highlight && <lineSegments><edgesGeometry args={[new THREE.CylinderGeometry(r, r, h, 24)]} /><lineBasicMaterial color="white" /></lineSegments>}
    </mesh>
  )
}

// ─── Main component ─────────────────────────────────────────────────────────

export function FurnitureObject({ item, containerDims, otherItems }: FurnitureObjectProps) {
  const selectedItemId = useStore((s) => s.selectedItemId)
  const selectItem = useStore((s) => s.selectItem)
  const updateItemPosition = useStore((s) => s.updateItemPosition)
  const updateItemRotation = useStore((s) => s.updateItemRotation)
  const transformMode = useStore((s) => s.transformMode)
  const isSelected = selectedItemId === item.id
  const groupRef = useRef<THREE.Group>(null!)
  const transformRef = useRef<any>(null!)
  const [hovered, setHovered] = useState(false)
  const isDragging = useRef(false)

  const scenePos: [number, number, number] = [
    item.position[0] * S,
    item.position[1] * S,
    item.position[2] * S,
  ]

  useEffect(() => {
    if (!isSelected || !transformRef.current) return
    const controls = transformRef.current
    const onObjectChange = () => {
      if (!groupRef.current) return
      isDragging.current = true
      if (transformMode === 'translate') {
        const pos = groupRef.current.position
        const [sx, sy, sz] = solvePosition(item, containerDims, otherItems, pos.x / S, pos.y / S, pos.z / S)
        pos.set(sx * S, sy * S, sz * S)
      }
    }
    const onDragEnd = () => {
      if (!groupRef.current || !isDragging.current) return
      isDragging.current = false
      if (transformMode === 'translate') {
        const pos = groupRef.current.position
        updateItemPosition(item.id, [pos.x / S, pos.y / S, pos.z / S])
      } else {
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
  }, [isSelected, item, containerDims, otherItems, updateItemPosition, updateItemRotation, transformMode])

  const onClick = (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); selectItem(item.id) }
  const Shape = item.shape === 'lshape' ? LShapeShape : item.shape === 'cylinder' ? CylinderShape : BoxShape

  return (
    <>
      <group ref={groupRef} position={scenePos} rotation={item.rotation}
        onClick={onClick}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true) }}
        onPointerOut={() => setHovered(false)}
      >
        <Shape item={item} highlight={isSelected || hovered} />
      </group>
      {isSelected && groupRef.current && (
        <TransformControls ref={transformRef} object={groupRef.current} mode={transformMode} size={0.6} />
      )}
    </>
  )
}
