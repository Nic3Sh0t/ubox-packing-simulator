import { useState, useRef } from 'react'
import { useStore } from '../store'
import type { ProjectFile } from '../store'

export function WelcomeScreen() {
  const startNewProject = useStore((s) => s.startNewProject)
  const loadProject = useStore((s) => s.loadProject)
  const fileRef = useRef<HTMLInputElement>(null)
  const [newName, setNewName] = useState('')
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)

  const handleNew = () => {
    startNewProject(newName.trim() || undefined)
  }

  const handleFile = (file: File) => {
    setError('')
    if (!file.name.endsWith('.json')) {
      setError('Please select a .json file')
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string) as ProjectFile
        if (!data.items || !Array.isArray(data.items)) {
          setError('Invalid project file: missing items array')
          return
        }
        loadProject(data)
      } catch {
        setError('Failed to parse JSON file')
      }
    }
    reader.readAsText(file)
  }

  const handleUploadClick = () => {
    fileRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  return (
    <div className="w-screen h-screen flex items-center justify-center"
      style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #1a1a2e 100%)' }}
    >
      <div className="w-full max-w-lg px-6">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/20 mb-4">
            <div className="w-8 h-8 bg-amber-500 rounded-lg" />
          </div>
          <h1 className="text-3xl font-bold text-gray-100 mb-2">U-Box Packing Simulator</h1>
          <p className="text-gray-400 text-sm">Plan your move layout in 3D</p>
        </div>

        {/* Two cards side by side */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* New Project */}
          <div className="bg-gray-800/60 rounded-xl border border-gray-700 p-5 flex flex-col">
            <h2 className="text-lg font-semibold text-gray-100 mb-1">New Project</h2>
            <p className="text-xs text-gray-400 mb-4">Start with an empty container</p>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Project name (optional)"
              onKeyDown={(e) => e.key === 'Enter' && handleNew()}
              className="w-full bg-gray-700 text-gray-200 rounded-lg px-3 py-2 text-sm border border-gray-600 focus:border-amber-500 focus:outline-none mb-4 placeholder-gray-500"
            />
            <button
              onClick={handleNew}
              className="mt-auto w-full bg-amber-600 hover:bg-amber-500 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
            >
              Create
            </button>
          </div>

          {/* Upload Project */}
          <div
            className={`bg-gray-800/60 rounded-xl border p-5 flex flex-col transition-colors ${
              dragOver ? 'border-amber-500 bg-amber-500/10' : 'border-gray-700'
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <h2 className="text-lg font-semibold text-gray-100 mb-1">Open Project</h2>
            <p className="text-xs text-gray-400 mb-4">Load a saved .json layout file</p>

            <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-600 rounded-lg py-4 mb-4">
              <svg className="w-8 h-8 text-gray-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-xs text-gray-500">Drag & drop or click below</p>
            </div>

            <input
              ref={fileRef}
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              onClick={handleUploadClick}
              className="w-full bg-gray-700 hover:bg-gray-600 text-gray-200 font-medium py-2.5 rounded-lg text-sm transition-colors border border-gray-600"
            >
              Choose File
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg px-4 py-2 text-sm text-red-300 text-center">
            {error}
          </div>
        )}
      </div>
    </div>
  )
}
