import { useStore } from './store'
import { Sidebar } from './components/Sidebar'
import { Scene } from './components/Scene'
import { WelcomeScreen } from './components/WelcomeScreen'

function Toast() {
  const toast = useStore((s) => s.toast)
  if (!toast) return null
  return (
    <div style={{
      position: 'fixed',
      top: 20,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 9999,
      background: '#dc2626',
      color: 'white',
      padding: '10px 24px',
      borderRadius: 8,
      fontSize: 14,
      fontWeight: 500,
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      pointerEvents: 'none',
    }}>
      {toast}
    </div>
  )
}

function App() {
  const projectReady = useStore((s) => s.projectReady)

  if (!projectReady) {
    return <WelcomeScreen />
  }

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />
      <div style={{ flex: 1, position: 'relative' }}>
        <Scene />
      </div>
      <Toast />
    </div>
  )
}

export default App
