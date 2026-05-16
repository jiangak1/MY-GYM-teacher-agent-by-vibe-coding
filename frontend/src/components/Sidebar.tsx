import { NavLink, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  MessageCircle,
  Flame,
  Dumbbell,
  BarChart3,
  Settings,
  Heart,
} from 'lucide-react'
import { cn } from '../lib/utils'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/chat', icon: MessageCircle, label: 'AI Chat' },
  { to: '/carbon', icon: Flame, label: 'Carbon' },
  { to: '/exercise', icon: Dumbbell, label: 'Exercise' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export default function Sidebar() {
  const location = useLocation()

  return (
    <aside className="w-20 h-full flex flex-col items-center py-6 border-r border-card-border bg-glass backdrop-blur-glass">
      {/* Logo */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="mb-8"
      >
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-accent to-info flex items-center justify-center shadow-glow">
          <Heart className="w-5 h-5 text-white" fill="white" />
        </div>
      </motion.div>

      {/* Navigation */}
      <nav className="flex flex-col gap-2 flex-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className="relative flex items-center justify-center"
            >
              <div
                className={cn(
                  'w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200',
                  isActive
                    ? 'bg-accent/15 text-accent'
                    : 'text-muted-foreground hover:text-foreground hover:bg-foreground/5',
                )}
              >
                <item.icon className="w-5 h-5" />
              </div>
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute -right-3 top-1/2 -translate-y-1/2 w-1 h-7 rounded-full bg-accent"
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                />
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Version */}
      <span className="text-xs text-muted-foreground/40 mt-auto">v1.0</span>
    </aside>
  )
}
