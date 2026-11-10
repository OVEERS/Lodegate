import { useState } from 'react'
import Sidebar from './components/Sidebar'
import type { Page } from './components/Sidebar'
import { TunnelsPage } from './pages/Pages'
import ServersPage from './pages/ServersPage'
import SettingsPage from './pages/SettingsPage'

export default function App() {
  const [page, setPage] = useState<Page>('servers')

  return (
    <div className="flex h-full">
      <Sidebar current={page} onChange={setPage} />
      <main className="h-full flex-1 overflow-y-auto">
        {page === 'tunnels' && <TunnelsPage />}
        {page === 'servers' && <ServersPage />}
        {page === 'settings' && <SettingsPage />}
      </main>
    </div>
  )
}