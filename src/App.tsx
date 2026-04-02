import { useStore } from './store'
import { Sidebar } from './components/Sidebar'
import { Scene } from './components/Scene'
import { WelcomeScreen } from './components/WelcomeScreen'

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
    </div>
  )
}

export default App
