import { create } from 'zustand'

export type ShapeType = 'box' | 'lshape' | 'cylinder'
export type Unit = 'in' | 'cm'

export const CM_PER_INCH = 2.54
export const CUBIC_INCHES_PER_CUBIC_FOOT = 1728

export function toInches(value: number, unit: Unit): number {
  return unit === 'cm' ? value / CM_PER_INCH : value
}

export function fromInches(value: number, unit: Unit): number {
  return unit === 'cm' ? value * CM_PER_INCH : value
}

export function unitLabel(unit: Unit): string {
  return unit === 'cm' ? 'cm' : 'in'
}

// ─── Core types ─────────────────────────────────────────────────────────────

export interface FurnitureItem {
  id: string
  name: string
  shape: ShapeType
  length: number
  width: number
  height: number
  armWidth?: number
  diameter?: number
  color: string
  position: [number, number, number]
  rotation: [number, number, number]
}

export interface ContainerDims {
  length: number
  width: number
  height: number
}

export interface Container {
  id: string
  name: string
  dims: ContainerDims
  items: FurnitureItem[]
}

export interface Preset {
  name: string
  shape: ShapeType
  length: number
  width: number
  height: number
  armWidth?: number
  diameter?: number
}

export const PRESETS: Preset[] = [
  { name: 'King Mattress', shape: 'box', length: 76, width: 80, height: 11 },
  { name: 'Queen Mattress', shape: 'box', length: 60, width: 80, height: 11 },
  { name: '3-Seat Sofa', shape: 'box', length: 84, width: 36, height: 34 },
  { name: 'L-Shaped Sectional', shape: 'lshape', length: 84, width: 84, height: 34, armWidth: 36 },
  { name: 'Bookshelf', shape: 'box', length: 36, width: 12, height: 72 },
  { name: 'Dining Table', shape: 'box', length: 60, width: 36, height: 30 },
  { name: 'Dining Chair', shape: 'box', length: 18, width: 20, height: 36 },
  { name: 'Dresser', shape: 'box', length: 60, width: 18, height: 34 },
  { name: 'Nightstand', shape: 'box', length: 24, width: 16, height: 24 },
  { name: 'TV (55")', shape: 'box', length: 49, width: 4, height: 28 },
  { name: 'Desk', shape: 'box', length: 48, width: 24, height: 30 },
  { name: 'Washer/Dryer', shape: 'box', length: 27, width: 28, height: 36 },
  { name: 'Moving Box (Large)', shape: 'box', length: 18, width: 18, height: 24 },
  { name: 'Moving Box (Medium)', shape: 'box', length: 18, width: 18, height: 16 },
  { name: 'Floor Lamp', shape: 'cylinder', length: 12, width: 12, height: 65, diameter: 12 },
  { name: 'Bar Stool', shape: 'box', length: 15, width: 15, height: 30 },
]

export const UBOX_DEFAULTS: ContainerDims = {
  length: 95,
  width: 56,
  height: 83.5,
}

// ─── Project file format ────────────────────────────────────────────────────

export interface ProjectFile {
  version: 2
  projectName: string
  savedAt: string
  containerUnit: Unit
  itemUnit: Unit
  containers: Container[]
}

// ─── Internal counters ──────────────────────────────────────────────────────

const COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#a855f7', '#f59e0b', '#ec4899', '#06b6d4', '#f97316']
let colorIndex = 0
function nextColor() {
  const c = COLORS[colorIndex % COLORS.length]
  colorIndex++
  return c
}

let itemIdCounter = 0
let containerIdCounter = 0

function newContainerId() { return `c-${++containerIdCounter}` }
function newItemId() { return `item-${++itemIdCounter}` }

// ─── Auto-placement ────────────────────────────────────────────────────────

function itemAABB(cx: number, cy: number, cz: number, item: FurnitureItem) {
  const hx = item.shape === 'cylinder' ? (item.diameter || item.length) / 2 : item.length / 2
  const hy = item.height / 2
  const hz = item.shape === 'cylinder' ? (item.diameter || item.length) / 2 : item.width / 2
  return { minX: cx - hx, maxX: cx + hx, minY: cy - hy, maxY: cy + hy, minZ: cz - hz, maxZ: cz + hz }
}

function boxesOverlap(
  ax: number, ay: number, az: number, ahx: number, ahy: number, ahz: number,
  bx: number, by: number, bz: number, bhx: number, bhy: number, bhz: number,
): boolean {
  return (
    ax - ahx < bx + bhx && ax + ahx > bx - bhx &&
    ay - ahy < by + bhy && ay + ahy > by - bhy &&
    az - ahz < bz + bhz && az + ahz > bz - bhz
  )
}

function findFreePosition(
  hx: number, hz: number, hy: number,
  dims: ContainerDims, existing: FurnitureItem[],
): [number, number, number] | null {
  const step = 2 // scan in 2-inch increments for better precision
  const y = hy // always place on the floor first

  // Check if item even fits in the container at all
  if (hx * 2 > dims.length || hz * 2 > dims.width || hy * 2 > dims.height) return null

  // Try center first
  if (!hasCollision(0, y, 0, hx, hy, hz, existing)) return [0, y, 0]

  // Scan outward from center in a grid on the floor
  const maxX = dims.length / 2 - hx
  const maxZ = dims.width / 2 - hz
  for (let r = step; r <= Math.max(dims.length, dims.width); r += step) {
    for (let x = -maxX; x <= maxX; x += step) {
      for (let z = -maxZ; z <= maxZ; z += step) {
        if (Math.abs(x) > r && Math.abs(z) > r) continue // expand outward
        if (!hasCollision(x, y, z, hx, hy, hz, existing)) return [x, y, z]
      }
    }
  }

  // Try stacking: scan Y layers above the floor
  for (let ly = hy + step; ly <= dims.height - hy; ly += step) {
    for (let x = -maxX; x <= maxX; x += step) {
      for (let z = -maxZ; z <= maxZ; z += step) {
        if (!hasCollision(x, ly, z, hx, hy, hz, existing)) return [x, ly, z]
      }
    }
  }

  // No free position found
  return null
}

function hasCollision(
  cx: number, cy: number, cz: number,
  hx: number, hy: number, hz: number,
  existing: FurnitureItem[],
): boolean {
  for (const other of existing) {
    const ob = itemAABB(other.position[0], other.position[1], other.position[2], other)
    const ohx = (ob.maxX - ob.minX) / 2
    const ohy = (ob.maxY - ob.minY) / 2
    const ohz = (ob.maxZ - ob.minZ) / 2
    const ocx = (ob.minX + ob.maxX) / 2
    const ocy = (ob.minY + ob.maxY) / 2
    const ocz = (ob.minZ + ob.maxZ) / 2
    if (boxesOverlap(cx, cy, cz, hx, hy, hz, ocx, ocy, ocz, ohx, ohy, ohz)) return true
  }
  return false
}

// ─── Store ──────────────────────────────────────────────────────────────────

interface UboxStore {
  projectName: string
  projectReady: boolean

  containers: Container[]
  activeContainerId: string | null  // null = "All" overview mode
  selectedItemId: string | null
  containerUnit: Unit
  itemUnit: Unit
  transformMode: 'translate' | 'rotate'

  // Toast notification
  toast: string | null
  showToast: (msg: string) => void

  // Project
  startNewProject: (name?: string) => void
  loadProject: (data: ProjectFile) => void
  exportProject: () => ProjectFile
  setProjectName: (name: string) => void
  returnToWelcome: () => void

  // Container management
  addContainer: (name: string) => void
  removeContainer: (id: string) => void
  renameContainer: (id: string, name: string) => void
  setContainerDims: (id: string, dims: ContainerDims) => void
  setActiveContainer: (id: string | null) => void
  resetContainerDims: (id: string) => void

  // Item management (operates on active container)
  addItem: (item: Omit<FurnitureItem, 'id' | 'position' | 'rotation' | 'color'> & { color?: string }) => void
  removeItem: (id: string) => void
  selectItem: (id: string | null) => void
  updateItemPosition: (id: string, position: [number, number, number]) => void
  updateItemRotation: (id: string, rotation: [number, number, number]) => void
  rotateSelectedAxis: (axis: 'x' | 'y' | 'z') => void
  duplicateSelected: () => void
  deleteSelected: () => void

  // Settings
  setContainerUnit: (unit: Unit) => void
  setItemUnit: (unit: Unit) => void
  setTransformMode: (mode: 'translate' | 'rotate') => void

  // Helpers
  getActiveContainer: () => Container | undefined
  getActiveItems: () => FurnitureItem[]
}

export const useStore = create<UboxStore>((set, get) => ({
  projectName: '',
  projectReady: false,
  containers: [],
  activeContainerId: null,
  selectedItemId: null,
  containerUnit: 'in',
  itemUnit: 'in',
  transformMode: 'translate' as 'translate' | 'rotate',
  toast: null,
  showToast: (msg: string) => {
    set({ toast: msg })
    setTimeout(() => set({ toast: null }), 3000)
  },

  // ── Project ─────────────────────────────────────────────────────────────

  startNewProject: (name) => {
    itemIdCounter = 0
    containerIdCounter = 0
    colorIndex = 0
    const firstId = newContainerId()
    set({
      projectReady: true,
      projectName: name || 'Untitled Project',
      containers: [{
        id: firstId,
        name: 'Container 1',
        dims: { ...UBOX_DEFAULTS },
        items: [],
      }],
      activeContainerId: firstId,
      selectedItemId: null,
      containerUnit: 'in',
      itemUnit: 'in',
      transformMode: 'translate',
    })
  },

  loadProject: (data) => {
    // Restore counters
    let maxItem = 0
    let maxContainer = 0
    for (const c of data.containers) {
      const cNum = parseInt(c.id.replace('c-', ''), 10)
      if (!isNaN(cNum) && cNum > maxContainer) maxContainer = cNum
      for (const item of c.items) {
        const iNum = parseInt(item.id.replace('item-', ''), 10)
        if (!isNaN(iNum) && iNum > maxItem) maxItem = iNum
      }
    }
    itemIdCounter = maxItem
    containerIdCounter = maxContainer
    const totalItems = data.containers.reduce((n, c) => n + c.items.length, 0)
    colorIndex = totalItems % COLORS.length

    set({
      projectReady: true,
      projectName: data.projectName || 'Imported Project',
      containers: data.containers,
      activeContainerId: data.containers[0]?.id || null,
      selectedItemId: null,
      containerUnit: data.containerUnit || 'in',
      itemUnit: data.itemUnit || 'in',
      transformMode: 'translate',
    })
  },

  exportProject: () => {
    const s = get()
    return {
      version: 2,
      projectName: s.projectName,
      savedAt: new Date().toISOString(),
      containerUnit: s.containerUnit,
      itemUnit: s.itemUnit,
      containers: s.containers,
    }
  },

  setProjectName: (name) => set({ projectName: name }),

  returnToWelcome: () => set({ projectReady: false, selectedItemId: null }),

  // ── Container management ────────────────────────────────────────────────

  addContainer: (name) => {
    const id = newContainerId()
    const newC: Container = {
      id,
      name,
      dims: { ...UBOX_DEFAULTS },
      items: [],
    }
    set((s) => ({
      containers: [...s.containers, newC],
      activeContainerId: id,
      selectedItemId: null,
    }))
  },

  removeContainer: (id) => {
    set((s) => {
      const filtered = s.containers.filter((c) => c.id !== id)
      if (filtered.length === 0) return s // don't delete the last one
      const newActive = s.activeContainerId === id
        ? filtered[0].id
        : s.activeContainerId
      return {
        containers: filtered,
        activeContainerId: newActive,
        selectedItemId: null,
      }
    })
  },

  renameContainer: (id, name) => {
    set((s) => ({
      containers: s.containers.map((c) => c.id === id ? { ...c, name } : c),
    }))
  },

  setContainerDims: (id, dims) => {
    set((s) => ({
      containers: s.containers.map((c) => c.id === id ? { ...c, dims } : c),
    }))
  },

  setActiveContainer: (id) => set({ activeContainerId: id, selectedItemId: null }),

  resetContainerDims: (id) => {
    set((s) => ({
      containers: s.containers.map((c) =>
        c.id === id ? { ...c, dims: { ...UBOX_DEFAULTS } } : c
      ),
    }))
  },

  // ── Item management ─────────────────────────────────────────────────────

  addItem: (item) => {
    const { activeContainerId, containers } = get()
    if (!activeContainerId) return
    const container = containers.find((c) => c.id === activeContainerId)
    if (!container) return
    const id = newItemId()
    const color = item.color || nextColor()

    // Calculate item half-sizes for placement
    const hx = item.shape === 'cylinder' ? (item.diameter || item.length) / 2 : item.length / 2
    const hy = item.height / 2
    const hz = item.shape === 'cylinder' ? (item.diameter || item.length) / 2 : item.width / 2

    // Find a non-overlapping position by scanning the container floor
    const dims = container.dims
    const existing = container.items
    const position = findFreePosition(hx, hz, hy, dims, existing)

    if (!position) {
      get().showToast('Container is full — no space for this item')
      return
    }

    const newItem: FurnitureItem = {
      ...item,
      id,
      color,
      position,
      rotation: [0, 0, 0],
    }
    set((s) => ({
      containers: s.containers.map((c) =>
        c.id === activeContainerId
          ? { ...c, items: [...c.items, newItem] }
          : c
      ),
    }))
  },

  removeItem: (id) => {
    set((s) => ({
      containers: s.containers.map((c) => ({
        ...c,
        items: c.items.filter((i) => i.id !== id),
      })),
      selectedItemId: s.selectedItemId === id ? null : s.selectedItemId,
    }))
  },

  selectItem: (id) => set({ selectedItemId: id }),

  updateItemPosition: (id, position) => {
    set((s) => ({
      containers: s.containers.map((c) => ({
        ...c,
        items: c.items.map((i) => i.id === id ? { ...i, position } : i),
      })),
    }))
  },

  updateItemRotation: (id, rotation) => {
    set((s) => ({
      containers: s.containers.map((c) => ({
        ...c,
        items: c.items.map((i) => i.id === id ? { ...i, rotation } : i),
      })),
    }))
  },

  rotateSelectedAxis: (axis) => {
    const { selectedItemId } = get()
    if (!selectedItemId) return
    const step = Math.PI / 2
    set((s) => ({
      containers: s.containers.map((c) => ({
        ...c,
        items: c.items.map((i) => {
          if (i.id !== selectedItemId) return i
          const rot: [number, number, number] = [...i.rotation]
          const idx = axis === 'x' ? 0 : axis === 'y' ? 1 : 2
          rot[idx] += step
          return { ...i, rotation: rot }
        }),
      })),
    }))
  },

  duplicateSelected: () => {
    const { selectedItemId, containers } = get()
    if (!selectedItemId) return
    // Find which container has this item
    for (const c of containers) {
      const source = c.items.find((i) => i.id === selectedItemId)
      if (!source) continue
      const id = newItemId()
      const newItem: FurnitureItem = {
        ...source,
        id,
        position: [source.position[0] + 10, source.position[1], source.position[2] + 10],
      }
      set((s) => ({
        containers: s.containers.map((ct) =>
          ct.id === c.id ? { ...ct, items: [...ct.items, newItem] } : ct
        ),
        selectedItemId: id,
      }))
      return
    }
  },

  deleteSelected: () => {
    const { selectedItemId } = get()
    if (!selectedItemId) return
    get().removeItem(selectedItemId)
  },

  // ── Settings ────────────────────────────────────────────────────────────

  setContainerUnit: (unit) => set({ containerUnit: unit }),
  setItemUnit: (unit) => set({ itemUnit: unit }),
  setTransformMode: (mode) => set({ transformMode: mode }),

  // ── Helpers ─────────────────────────────────────────────────────────────

  getActiveContainer: () => {
    const { containers, activeContainerId } = get()
    return containers.find((c) => c.id === activeContainerId)
  },

  getActiveItems: () => {
    const c = get().getActiveContainer()
    return c ? c.items : []
  },
}))
