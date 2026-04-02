import { create } from 'zustand'

export type ShapeType = 'box' | 'lshape' | 'cylinder'
export type Unit = 'in' | 'cm'

export const CM_PER_INCH = 2.54
export const CUBIC_INCHES_PER_CUBIC_FOOT = 1728

/** Convert a value from the given unit to inches (internal unit) */
export function toInches(value: number, unit: Unit): number {
  return unit === 'cm' ? value / CM_PER_INCH : value
}

/** Convert a value from inches (internal) to the given display unit */
export function fromInches(value: number, unit: Unit): number {
  return unit === 'cm' ? value * CM_PER_INCH : value
}

export function unitLabel(unit: Unit): string {
  return unit === 'cm' ? 'cm' : 'in'
}

export interface FurnitureItem {
  id: string
  name: string
  shape: ShapeType
  length: number // always inches internally
  width: number
  height: number
  armWidth?: number
  diameter?: number
  color: string
  position: [number, number, number] // inches
  rotation: [number, number, number] // Euler XYZ in radians
  uboxIndex: number
}

export interface ContainerDims {
  length: number // inches
  width: number  // inches
  height: number // inches
}

export interface Preset {
  name: string
  shape: ShapeType
  length: number // inches
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

// Default U-Box internal dimensions in inches
export const UBOX_DEFAULTS: ContainerDims = {
  length: 95,
  width: 56,
  height: 83.5,
}

const COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#a855f7', '#f59e0b', '#ec4899', '#06b6d4', '#f97316']
let colorIndex = 0

function nextColor() {
  const c = COLORS[colorIndex % COLORS.length]
  colorIndex++
  return c
}

let idCounter = 0

// ─── Project file format ────────────────────────────────────────────────────

export interface ProjectFile {
  version: 1
  projectName: string
  savedAt: string
  container: ContainerDims
  containerUnit: Unit
  itemUnit: Unit
  uboxCount: number
  items: FurnitureItem[]
}

interface UboxStore {
  // Project state
  projectName: string
  projectReady: boolean  // false = show welcome screen

  items: FurnitureItem[]
  selectedId: string | null
  uboxCount: number
  container: ContainerDims
  containerUnit: Unit
  itemUnit: Unit

  transformMode: 'translate' | 'rotate'

  // Project actions
  startNewProject: (name?: string) => void
  loadProject: (data: ProjectFile) => void
  exportProject: () => ProjectFile
  setProjectName: (name: string) => void
  returnToWelcome: () => void

  setContainerUnit: (unit: Unit) => void
  setItemUnit: (unit: Unit) => void
  setContainer: (dims: ContainerDims) => void
  resetContainer: () => void
  setTransformMode: (mode: 'translate' | 'rotate') => void
  addItem: (item: Omit<FurnitureItem, 'id' | 'position' | 'rotation' | 'uboxIndex' | 'color'> & { color?: string }) => void
  removeItem: (id: string) => void
  selectItem: (id: string | null) => void
  updateItemPosition: (id: string, position: [number, number, number]) => void
  updateItemRotation: (id: string, rotation: [number, number, number]) => void
  rotateSelectedAxis: (axis: 'x' | 'y' | 'z') => void
  duplicateSelected: () => void
  deleteSelected: () => void
  setUboxCount: (count: number) => void
  moveItemToUbox: (id: string, uboxIndex: number) => void
}

export const useStore = create<UboxStore>((set, get) => ({
  projectName: '',
  projectReady: false,

  items: [],
  selectedId: null,
  uboxCount: 1,
  container: { ...UBOX_DEFAULTS },
  containerUnit: 'in',
  itemUnit: 'in',
  transformMode: 'translate' as 'translate' | 'rotate',

  startNewProject: (name) => {
    idCounter = 0
    colorIndex = 0
    set({
      projectReady: true,
      projectName: name || 'Untitled Project',
      items: [],
      selectedId: null,
      uboxCount: 1,
      container: { ...UBOX_DEFAULTS },
      containerUnit: 'in',
      itemUnit: 'in',
      transformMode: 'translate',
    })
  },

  loadProject: (data) => {
    // Restore idCounter so new items don't collide
    const maxId = data.items.reduce((max, item) => {
      const num = parseInt(item.id.replace('item-', ''), 10)
      return isNaN(num) ? max : Math.max(max, num)
    }, 0)
    idCounter = maxId
    colorIndex = data.items.length % COLORS.length
    set({
      projectReady: true,
      projectName: data.projectName || 'Imported Project',
      items: data.items,
      selectedId: null,
      uboxCount: data.uboxCount || 1,
      container: data.container || { ...UBOX_DEFAULTS },
      containerUnit: data.containerUnit || 'in',
      itemUnit: data.itemUnit || 'in',
      transformMode: 'translate',
    })
  },

  exportProject: () => {
    const s = get()
    return {
      version: 1,
      projectName: s.projectName,
      savedAt: new Date().toISOString(),
      container: s.container,
      containerUnit: s.containerUnit,
      itemUnit: s.itemUnit,
      uboxCount: s.uboxCount,
      items: s.items,
    }
  },

  setProjectName: (name) => set({ projectName: name }),

  returnToWelcome: () => {
    set({ projectReady: false, selectedId: null })
  },

  setContainerUnit: (unit) => set({ containerUnit: unit }),
  setItemUnit: (unit) => set({ itemUnit: unit }),

  setContainer: (dims) => set({ container: dims }),

  resetContainer: () => set({ container: { ...UBOX_DEFAULTS } }),

  setTransformMode: (mode) => set({ transformMode: mode }),

  addItem: (item) => {
    const id = `item-${++idCounter}`
    const color = item.color || nextColor()
    const yPos = item.height / 2
    const newItem: FurnitureItem = {
      ...item,
      id,
      color,
      position: [0, yPos, 0],
      rotation: [0, 0, 0],
      uboxIndex: 0,
    }
    set((state) => ({ items: [...state.items, newItem] }))
  },

  removeItem: (id) => {
    set((state) => ({
      items: state.items.filter((i) => i.id !== id),
      selectedId: state.selectedId === id ? null : state.selectedId,
    }))
  },

  selectItem: (id) => set({ selectedId: id }),

  updateItemPosition: (id, position) => {
    set((state) => ({
      items: state.items.map((i) => (i.id === id ? { ...i, position } : i)),
    }))
  },

  updateItemRotation: (id, rotation) => {
    set((state) => ({
      items: state.items.map((i) => (i.id === id ? { ...i, rotation } : i)),
    }))
  },

  rotateSelectedAxis: (axis) => {
    const { selectedId } = get()
    if (!selectedId) return
    const step = Math.PI / 2
    set((state) => ({
      items: state.items.map((i) => {
        if (i.id !== selectedId) return i
        const rot: [number, number, number] = [...i.rotation]
        const idx = axis === 'x' ? 0 : axis === 'y' ? 1 : 2
        rot[idx] += step
        return { ...i, rotation: rot }
      }),
    }))
  },

  duplicateSelected: () => {
    const { selectedId, items } = get()
    if (!selectedId) return
    const source = items.find((i) => i.id === selectedId)
    if (!source) return
    const id = `item-${++idCounter}`
    const newItem: FurnitureItem = {
      ...source,
      id,
      position: [source.position[0] + 10, source.position[1], source.position[2] + 10],
    }
    set((state) => ({ items: [...state.items, newItem], selectedId: id }))
  },

  deleteSelected: () => {
    const { selectedId } = get()
    if (!selectedId) return
    get().removeItem(selectedId)
  },

  setUboxCount: (count) => set({ uboxCount: count }),

  moveItemToUbox: (id, uboxIndex) => {
    set((state) => ({
      items: state.items.map((i) => (i.id === id ? { ...i, uboxIndex } : i)),
    }))
  },
}))
