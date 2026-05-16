import { Routes, Route } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { Toaster } from 'sonner'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Chat from './pages/Chat'
import CarbonCycle from './pages/CarbonCycle'
import Analytics from './pages/Analytics'
import Settings from './pages/Settings'
import Exercise from './pages/Exercise'

export default function App() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6">
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/carbon" element={<CarbonCycle />} />
            <Route path="/exercise" element={<Exercise />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </AnimatePresence>
      </main>
      <Toaster theme="dark" position="bottom-center" />
    </div>
  )
}
