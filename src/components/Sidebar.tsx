import { useState, useEffect } from 'react'
import { useStore, PRESETS, UBOX_DEFAULTS, toInches, fromInches, unitLabel, CUBIC_INCHES_PER_CUBIC_FOOT, CM_PER_INCH } from '../store'
import type { ShapeType, Unit } from '../store'
import { ContainerTabs } from './ContainerTabs'

const COLOR_SWATCHES = ['#3b82f6', '#ef4444', '#22c55e', '#a855f7', '#f59e0b', '#ec4899', '#06b6d4', '#f97316']

const inputClass = "w-full bg-gray-700 text-gray-200 rounded px-2 py-1 text-sm border border-gray-600 focus:border-amber-500 focus:outline-none"
const inputClassTall = "w-full bg-gray-700 text-gray-200 rounded px-2 py-1.5 text-sm border border-gray-600 focus:border-amber-500 focus:outline-none"

function UnitToggle({ value, onChange, size = 'sm' }: { value: Unit; onChange: (u: Unit) => void; size?: 'sm' | 'xs' }) {
  const py = size === 'sm' ? 'py-0.5' : 'py-px'
  return (
    <div className="inline-flex rounded overflow-hidden border border-gray-600">
      {(['in', 'cm'] as const).map((u) => (
        <button
          key={u}
          onClick={() => onChange(u)}
          className={`px-1.5 ${py} text-xs font-medium transition-colors ${
            value === u ? 'bg-amber-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
          }`}
        >
          {u}
        </button>
      ))}
    </div>
  )
}

function ContainerPanel() {
  const containers = useStore((s) => s.containers)
  const activeContainerId = useStore((s) => s.activeContainerId)
  const containerUnit = useStore((s) => s.containerUnit)
  const setContainerDims = useStore((s) => s.setContainerDims)
  const setContainerUnit = useStore((s) => s.setContainerUnit)
  const resetContainerDims = useStore((s) => s.resetContainerDims)

  const activeContainer = containers.find((c) => c.id === activeContainerId)
  if (!activeContainer) return null
  const dims = activeContainer.dims

  const displayL = +fromInches(dims.length, containerUnit).toFixed(1)
  const displayW = +fromInches(dims.width, containerUnit).toFixed(1)
  const displayH = +fromInches(dims.height, containerUnit).toFixed(1)

  const handleChange = (field: 'length' | 'width' | 'height', displayVal: number) => {
    const inches = toInches(displayVal, containerUnit)
    setContainerDims(activeContainer.id, { ...dims, [field]: inches })
  }

  const isDefault =
    dims.length === UBOX_DEFAULTS.length &&
    dims.width === UBOX_DEFAULTS.width &&
    dims.height === UBOX_DEFAULTS.height

  return (
    <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-300">Container Dimensions</h3>
        <UnitToggle value={containerUnit} onChange={setContainerUnit} />
      </div>

      <div className="grid grid-cols-3 gap-1 mb-2">
        <div>
          <label className="block text-xs text-gray-400 mb-0.5">L ({unitLabel(containerUnit)})</label>
          <input
            type="number"
            value={displayL}
            onChange={(e) => handleChange('length', +e.target.value)}
            className={inputClass}
            step={containerUnit === 'cm' ? 1 : 0.5}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-0.5">W ({unitLabel(containerUnit)})</label>
          <input
            type="number"
            value={displayW}
            onChange={(e) => handleChange('width', +e.target.value)}
            className={inputClass}
            step={containerUnit === 'cm' ? 1 : 0.5}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-0.5">H ({unitLabel(containerUnit)})</label>
          <input
            type="number"
            value={displayH}
            onChange={(e) => handleChange('height', +e.target.value)}
            className={inputClass}
            step={containerUnit === 'cm' ? 1 : 0.5}
          />
        </div>
      </div>

      {!isDefault && (
        <button
          onClick={() => resetContainerDims(activeContainer.id)}
          className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
        >
          Reset to U-Box defaults
        </button>
      )}
    </div>
  )
}

function AddFurniturePanel() {
  const addItem = useStore((s) => s.addItem)
  const activeContainerId = useStore((s) => s.activeContainerId)
  const itemUnit = useStore((s) => s.itemUnit)
  const setItemUnit = useStore((s) => s.setItemUnit)
  const [preset, setPreset] = useState('')
  const [name, setName] = useState('')
  const [shape, setShape] = useState<ShapeType>('box')
  const [length, setLength] = useState(24)
  const [width, setWidth] = useState(24)
  const [height, setHeight] = useState(24)
  const [armWidth, setArmWidth] = useState(24)
  const [diameter, setDiameter] = useState(12)
  const [color, setColor] = useState(COLOR_SWATCHES[0])

  // Disable if in All mode
  if (!activeContainerId) {
    return (
      <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700 opacity-50">
        <h3 className="text-sm font-semibold text-gray-300 mb-2">Add Furniture</h3>
        <p className="text-xs text-gray-500 italic">Select a container to add items</p>
      </div>
    )
  }

  const handlePreset = (presetName: string) => {
    setPreset(presetName)
    const p = PRESETS.find((pr) => pr.name === presetName)
    if (p) {
      setName(p.name)
      setShape(p.shape)
      setLength(+fromInches(p.length, itemUnit).toFixed(1))
      setWidth(+fromInches(p.width, itemUnit).toFixed(1))
      setHeight(+fromInches(p.height, itemUnit).toFixed(1))
      if (p.armWidth) setArmWidth(+fromInches(p.armWidth, itemUnit).toFixed(1))
      if (p.diameter) setDiameter(+fromInches(p.diameter, itemUnit).toFixed(1))
    }
  }

  const handleUnitChange = (newUnit: Unit) => {
    const oldUnit = itemUnit
    if (oldUnit === newUnit) return
    const convertVal = (v: number) => +fromInches(toInches(v, oldUnit), newUnit).toFixed(1)
    setLength(convertVal(length))
    setWidth(convertVal(width))
    setHeight(convertVal(height))
    setArmWidth(convertVal(armWidth))
    setDiameter(convertVal(diameter))
    setItemUnit(newUnit)
  }

  const handleAdd = () => {
    if (!name.trim()) return
    const lIn = toInches(shape === 'cylinder' ? diameter : length, itemUnit)
    const wIn = toInches(shape === 'cylinder' ? diameter : width, itemUnit)
    const hIn = toInches(height, itemUnit)
    const armIn = toInches(armWidth, itemUnit)
    const diaIn = toInches(diameter, itemUnit)

    addItem({
      name: name.trim(),
      shape,
      length: lIn,
      width: wIn,
      height: hIn,
      armWidth: shape === 'lshape' ? armIn : undefined,
      diameter: shape === 'cylinder' ? diaIn : undefined,
      color,
    })
  }

  const uLabel = unitLabel(itemUnit)

  return (
    <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-300">Add Furniture</h3>
        <UnitToggle value={itemUnit} onChange={handleUnitChange} />
      </div>

      <label className="block text-xs text-gray-400 mb-1">Preset</label>
      <select
        value={preset}
        onChange={(e) => handlePreset(e.target.value)}
        className={inputClassTall + " mb-2"}
      >
        <option value="">Custom...</option>
        {PRESETS.map((p) => (
          <option key={p.name} value={p.name}>{p.name}</option>
        ))}
      </select>

      <label className="block text-xs text-gray-400 mb-1">Name</label>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Item name"
        className={inputClassTall + " mb-2"}
      />

      <label className="block text-xs text-gray-400 mb-1">Shape</label>
      <div className="flex gap-1 mb-2">
        {(['box', 'lshape', 'cylinder'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setShape(s)}
            className={`flex-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
              shape === s ? 'bg-amber-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {s === 'lshape' ? 'L-Shape' : s === 'cylinder' ? 'Cylinder' : 'Box'}
          </button>
        ))}
      </div>

      {shape !== 'cylinder' ? (
        <div className="grid grid-cols-3 gap-1 mb-2">
          <div>
            <label className="block text-xs text-gray-400 mb-0.5">L ({uLabel})</label>
            <input type="number" value={length} onChange={(e) => setLength(+e.target.value)}
              className={inputClass} />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-0.5">W ({uLabel})</label>
            <input type="number" value={width} onChange={(e) => setWidth(+e.target.value)}
              className={inputClass} />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-0.5">H ({uLabel})</label>
            <input type="number" value={height} onChange={(e) => setHeight(+e.target.value)}
              className={inputClass} />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-1 mb-2">
          <div>
            <label className="block text-xs text-gray-400 mb-0.5">Dia ({uLabel})</label>
            <input type="number" value={diameter} onChange={(e) => setDiameter(+e.target.value)}
              className={inputClass} />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-0.5">H ({uLabel})</label>
            <input type="number" value={height} onChange={(e) => setHeight(+e.target.value)}
              className={inputClass} />
          </div>
        </div>
      )}

      {shape === 'lshape' && (
        <div className="mb-2">
          <label className="block text-xs text-gray-400 mb-0.5">Arm Width ({uLabel})</label>
          <input type="number" value={armWidth} onChange={(e) => setArmWidth(+e.target.value)}
            className={inputClass} />
        </div>
      )}

      <label className="block text-xs text-gray-400 mb-1">Color</label>
      <div className="flex gap-1.5 mb-3">
        {COLOR_SWATCHES.map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            className={`w-6 h-6 rounded-full border-2 transition-transform ${
              color === c ? 'border-white scale-110' : 'border-transparent hover:scale-105'
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>

      <button
        onClick={handleAdd}
        className="w-full bg-amber-600 hover:bg-amber-500 text-white font-medium py-1.5 rounded text-sm transition-colors"
      >
        Add Item
      </button>
    </div>
  )
}

function ItemsList() {
  const containers = useStore((s) => s.containers)
  const activeContainerId = useStore((s) => s.activeContainerId)
  const selectedItemId = useStore((s) => s.selectedItemId)
  const selectItem = useStore((s) => s.selectItem)
  const removeItem = useStore((s) => s.removeItem)
  const itemUnit = useStore((s) => s.itemUnit)

  const isAllMode = activeContainerId === null
  const activeContainer = containers.find((c) => c.id === activeContainerId)
  const items = isAllMode
    ? containers.flatMap((c) => c.items.map((i) => ({ ...i, _containerName: c.name })))
    : (activeContainer?.items || []).map((i) => ({ ...i, _containerName: '' }))

  const fmt = (v: number) => +fromInches(v, itemUnit).toFixed(1)
  const u = unitLabel(itemUnit)

  if (items.length === 0) {
    return (
      <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
        <h3 className="text-sm font-semibold text-gray-300 mb-2">Items</h3>
        <p className="text-xs text-gray-500 italic">No items added yet</p>
      </div>
    )
  }

  return (
    <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
      <h3 className="text-sm font-semibold text-gray-300 mb-2">Items ({items.length})</h3>
      <div className="space-y-1 max-h-48 overflow-y-auto sidebar-scroll">
        {items.map((item) => (
          <div
            key={item.id}
            onClick={() => selectItem(item.id)}
            className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-sm transition-colors ${
              selectedItemId === item.id ? 'bg-amber-600/30 border border-amber-500/50' : 'hover:bg-gray-700/50 border border-transparent'
            }`}
          >
            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
            <div className="flex-1 min-w-0">
              <span className="block truncate text-gray-200">{item.name}</span>
              {isAllMode && item._containerName && (
                <span className="block text-[10px] text-gray-500 truncate">{item._containerName}</span>
              )}
            </div>
            <span className="text-xs text-gray-400 shrink-0">
              {item.shape === 'cylinder'
                ? `${fmt(item.diameter || item.length)}d x ${fmt(item.height)}h ${u}`
                : `${fmt(item.length)}x${fmt(item.width)}x${fmt(item.height)} ${u}`}
            </span>
            {!isAllMode && (
              <button
                onClick={(e) => { e.stopPropagation(); removeItem(item.id) }}
                className="text-gray-500 hover:text-red-400 text-xs px-1"
                title="Remove"
              >
                x
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function StatsPanel() {
  const containers = useStore((s) => s.containers)
  const activeContainerId = useStore((s) => s.activeContainerId)
  const containerUnit = useStore((s) => s.containerUnit)

  const isAllMode = activeContainerId === null
  const visibleContainers = isAllMode
    ? containers
    : containers.filter((c) => c.id === activeContainerId)

  const allItems = visibleContainers.flatMap((c) => c.items)

  const totalVolumeCuIn = allItems.reduce((sum, item) => {
    if (item.shape === 'cylinder') {
      const r = (item.diameter || item.length) / 2
      return sum + Math.PI * r * r * item.height
    }
    if (item.shape === 'lshape') {
      const armW = item.armWidth || 24
      const backVol = item.length * armW * item.height
      const sideVol = armW * item.width * item.height
      const overlap = armW * armW * item.height
      return sum + backVol + sideVol - overlap
    }
    return sum + item.length * item.width * item.height
  }, 0)

  const totalCapacityCuIn = visibleContainers.reduce(
    (sum, c) => sum + c.dims.length * c.dims.width * c.dims.height, 0
  )
  const pct = totalCapacityCuIn > 0 ? Math.min(100, (totalVolumeCuIn / totalCapacityCuIn) * 100) : 0

  const isMetric = containerUnit === 'cm'
  const itemsVol = isMetric
    ? (totalVolumeCuIn * CM_PER_INCH * CM_PER_INCH * CM_PER_INCH / 1_000_000).toFixed(2)
    : (totalVolumeCuIn / CUBIC_INCHES_PER_CUBIC_FOOT).toFixed(1)
  const capVol = isMetric
    ? (totalCapacityCuIn * CM_PER_INCH * CM_PER_INCH * CM_PER_INCH / 1_000_000).toFixed(2)
    : (totalCapacityCuIn / CUBIC_INCHES_PER_CUBIC_FOOT).toFixed(0)
  const volUnit = isMetric ? 'm3' : 'ft3'

  return (
    <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
      <h3 className="text-sm font-semibold text-gray-300 mb-2">
        Stats {isAllMode ? '(All Containers)' : ''}
      </h3>

      <div className="text-xs text-gray-400 space-y-1.5">
        <div className="flex justify-between">
          <span>Containers</span>
          <span className="text-gray-200 font-medium">{visibleContainers.length}</span>
        </div>
        <div className="flex justify-between">
          <span>Items</span>
          <span className="text-gray-200 font-medium">{allItems.length}</span>
        </div>
        <div className="flex justify-between">
          <span>Volume</span>
          <span className="text-gray-200 font-medium">
            {itemsVol} / {capVol} {volUnit} ({pct.toFixed(1)}%)
          </span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2 mt-1">
          <div
            className="h-2 rounded-full transition-all duration-300"
            style={{
              width: `${pct}%`,
              backgroundColor: pct > 90 ? '#ef4444' : pct > 70 ? '#f59e0b' : '#22c55e',
            }}
          />
        </div>
      </div>
    </div>
  )
}

function ControlsPanel() {
  const selectedItemId = useStore((s) => s.selectedItemId)
  const rotateSelectedAxis = useStore((s) => s.rotateSelectedAxis)
  const deleteSelected = useStore((s) => s.deleteSelected)
  const duplicateSelected = useStore((s) => s.duplicateSelected)
  const transformMode = useStore((s) => s.transformMode)
  const setTransformMode = useStore((s) => s.setTransformMode)

  const btnBase = "px-2 py-1.5 rounded text-xs font-medium transition-colors"
  const btnDisabled = "disabled:opacity-30 disabled:cursor-not-allowed"

  return (
    <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
      <h3 className="text-sm font-semibold text-gray-300 mb-2">Controls</h3>

      <label className="block text-xs text-gray-400 mb-1">Gizmo Mode (T / R)</label>
      <div className="flex gap-1 mb-2">
        <button
          onClick={() => setTransformMode('translate')}
          className={`flex-1 ${btnBase} ${
            transformMode === 'translate' ? 'bg-amber-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Move
        </button>
        <button
          onClick={() => setTransformMode('rotate')}
          className={`flex-1 ${btnBase} ${
            transformMode === 'rotate' ? 'bg-amber-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Rotate
        </button>
      </div>

      <label className="block text-xs text-gray-400 mb-1">Rotate 90deg</label>
      <div className="grid grid-cols-3 gap-1 mb-2">
        {(['x', 'y', 'z'] as const).map((axis) => (
          <button
            key={axis}
            onClick={() => rotateSelectedAxis(axis)}
            disabled={!selectedItemId}
            className={`${btnBase} bg-gray-700 text-gray-300 hover:bg-gray-600 ${btnDisabled}`}
          >
            {axis.toUpperCase()} axis
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-1">
        <button
          onClick={deleteSelected}
          disabled={!selectedItemId}
          className={`${btnBase} bg-gray-700 text-gray-300 hover:bg-red-600 hover:text-white ${btnDisabled}`}
        >
          Delete
        </button>
        <button
          onClick={duplicateSelected}
          disabled={!selectedItemId}
          className={`${btnBase} bg-gray-700 text-gray-300 hover:bg-gray-600 ${btnDisabled}`}
        >
          Duplicate
        </button>
      </div>
      <div className="mt-2 text-xs text-gray-500 space-y-0.5">
        <p>T = move mode | R = rotate mode</p>
        <p>X/Y/Z = rotate 90deg | Del = remove</p>
      </div>
    </div>
  )
}

function ProjectHeader() {
  const projectName = useStore((s) => s.projectName)
  const setProjectName = useStore((s) => s.setProjectName)
  const exportProject = useStore((s) => s.exportProject)
  const returnToWelcome = useStore((s) => s.returnToWelcome)
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(projectName)

  const handleSave = () => {
    const data = exportProject()
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${data.projectName.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const commitName = () => {
    const trimmed = editName.trim()
    if (trimmed) setProjectName(trimmed)
    setEditing(false)
  }

  return (
    <div className="pb-2 border-b border-gray-700">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-5 h-5 bg-amber-500 rounded shrink-0" />
        {editing ? (
          <input
            autoFocus
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => e.key === 'Enter' && commitName()}
            className="flex-1 bg-gray-700 text-gray-100 rounded px-2 py-0.5 text-sm border border-amber-500 focus:outline-none"
          />
        ) : (
          <h1
            className="flex-1 text-sm font-bold text-gray-100 truncate cursor-pointer hover:text-amber-400 transition-colors"
            onClick={() => { setEditName(projectName); setEditing(true) }}
            title="Click to rename"
          >
            {projectName}
          </h1>
        )}
      </div>
      <div className="flex gap-1.5">
        <button
          onClick={handleSave}
          className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-medium py-1.5 rounded text-xs transition-colors"
        >
          Save Project
        </button>
        <button
          onClick={returnToWelcome}
          className="px-3 bg-gray-700 hover:bg-gray-600 text-gray-300 font-medium py-1.5 rounded text-xs transition-colors border border-gray-600"
        >
          Home
        </button>
      </div>
    </div>
  )
}

export function Sidebar() {
  const activeContainerId = useStore((s) => s.activeContainerId)
  const rotateSelectedAxis = useStore((s) => s.rotateSelectedAxis)
  const deleteSelected = useStore((s) => s.deleteSelected)
  const setTransformMode = useStore((s) => s.setTransformMode)

  const isAllMode = activeContainerId === null

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return
      if (e.key === 'Delete') deleteSelected()
      if (e.key === 't' || e.key === 'T') setTransformMode('translate')
      if (e.key === 'r' || e.key === 'R') setTransformMode('rotate')
      if (e.key === 'x' || e.key === 'X') rotateSelectedAxis('x')
      if (e.key === 'y' || e.key === 'Y') rotateSelectedAxis('y')
      if (e.key === 'z' || e.key === 'Z') rotateSelectedAxis('z')
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [rotateSelectedAxis, deleteSelected, setTransformMode])

  return (
    <div className="w-80 shrink-0 bg-gray-900 border-r border-gray-700 flex flex-col h-full overflow-y-auto sidebar-scroll p-3 gap-3">
      <ProjectHeader />
      <ContainerTabs />
      {!isAllMode && <ContainerPanel />}
      <AddFurniturePanel />
      <ItemsList />
      <StatsPanel />
      <ControlsPanel />
    </div>
  )
}
