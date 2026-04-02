import { useState, useRef, useEffect } from 'react'
import { useStore } from '../store'

export function ContainerTabs() {
  const containers = useStore((s) => s.containers)
  const activeContainerId = useStore((s) => s.activeContainerId)
  const setActiveContainer = useStore((s) => s.setActiveContainer)
  const addContainer = useStore((s) => s.addContainer)
  const removeContainer = useStore((s) => s.removeContainer)
  const renameContainer = useStore((s) => s.renameContainer)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const addInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (showAdd && addInputRef.current) addInputRef.current.focus()
  }, [showAdd])

  const startRename = (id: string, currentName: string) => {
    setEditingId(id)
    setEditName(currentName)
  }

  const commitRename = () => {
    if (editingId && editName.trim()) {
      renameContainer(editingId, editName.trim())
    }
    setEditingId(null)
  }

  const handleAdd = () => {
    const name = newName.trim() || `Container ${containers.length + 1}`
    addContainer(name)
    setNewName('')
    setShowAdd(false)
  }

  const isAllMode = activeContainerId === null

  return (
    <div className="bg-gray-800/50 rounded-lg p-2 border border-gray-700">
      <div className="flex items-center gap-1 flex-wrap">
        {/* All overview tab */}
        <button
          onClick={() => setActiveContainer(null)}
          className={`px-2.5 py-1 rounded text-xs font-medium transition-colors shrink-0 ${
            isAllMode
              ? 'bg-amber-600 text-white'
              : 'bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-gray-200'
          }`}
        >
          All
        </button>

        {/* Container tabs */}
        {containers.map((c) => {
          const isActive = c.id === activeContainerId
          const isEditing = editingId === c.id

          return (
            <div key={c.id} className="relative group flex items-center shrink-0">
              {isEditing ? (
                <input
                  autoFocus
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitRename()
                    if (e.key === 'Escape') setEditingId(null)
                  }}
                  className="px-2 py-0.5 rounded text-xs bg-gray-700 text-gray-100 border border-amber-500 focus:outline-none w-24"
                />
              ) : (
                <button
                  onClick={() => setActiveContainer(c.id)}
                  onDoubleClick={() => startRename(c.id, c.name)}
                  className={`px-2.5 py-1 rounded-l text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-amber-600 text-white'
                      : 'bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-gray-200'
                  }`}
                  title="Click to switch, double-click to rename"
                >
                  {c.name}
                  <span className="ml-1 text-[10px] opacity-60">({c.items.length})</span>
                </button>
              )}
              {!isEditing && containers.length > 1 && (
                <button
                  onClick={(e) => { e.stopPropagation(); removeContainer(c.id) }}
                  className={`px-1 py-1 rounded-r text-[10px] transition-colors ${
                    isActive
                      ? 'bg-amber-700 text-amber-200 hover:bg-red-600 hover:text-white'
                      : 'bg-gray-700 text-gray-500 hover:bg-red-600 hover:text-white'
                  }`}
                  title="Delete container"
                >
                  x
                </button>
              )}
            </div>
          )
        })}

        {/* Add button */}
        {showAdd ? (
          <div className="flex items-center gap-1 shrink-0">
            <input
              ref={addInputRef}
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAdd()
                if (e.key === 'Escape') { setShowAdd(false); setNewName('') }
              }}
              onBlur={() => { if (!newName.trim()) setShowAdd(false) }}
              placeholder={`Container ${containers.length + 1}`}
              className="px-2 py-0.5 rounded text-xs bg-gray-700 text-gray-100 border border-gray-600 focus:border-amber-500 focus:outline-none w-24"
            />
            <button
              onClick={handleAdd}
              className="px-1.5 py-0.5 rounded text-xs bg-green-600 text-white hover:bg-green-500"
            >
              OK
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowAdd(true)}
            className="px-2 py-1 rounded text-xs font-medium bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-gray-200 transition-colors shrink-0"
            title="Add new container"
          >
            +
          </button>
        )}
      </div>
    </div>
  )
}
