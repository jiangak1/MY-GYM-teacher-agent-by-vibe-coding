import { motion } from 'framer-motion'
import { cn } from '../../lib/utils'

interface CardProps {
  children: React.ReactNode
  className?: string
  delay?: number
  hover?: boolean
}

export function Card({ children, className, delay = 0, hover = true }: CardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.1, duration: 0.4, ease: 'easeOut' }}
      className={cn(
        'glass-card',
        hover && 'cursor-pointer hover:border-accent/30',
        className,
      )}
    >
      {children}
    </motion.div>
  )
}

export function StatCard({
  label,
  value,
  unit,
  icon: Icon,
  trend,
  color = 'accent',
  delay,
}: {
  label: string
  value: string | number
  unit?: string
  icon?: React.ComponentType<{ className?: string }>
  trend?: string
  color?: string
  delay?: number
}) {
  return (
    <Card className="flex flex-col gap-2" hover={false} delay={delay}>
      <div className="flex items-center justify-between">
        <span className="stat-label">{label}</span>
        {Icon && <Icon className="w-4 h-4 text-muted-foreground" />}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="stat-value">{value}</span>
        {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
      </div>
      {trend && (
        <span className="text-xs text-muted-foreground">{trend}</span>
      )}
    </Card>
  )
}
