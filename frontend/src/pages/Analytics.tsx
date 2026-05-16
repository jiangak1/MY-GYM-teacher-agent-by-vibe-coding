import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, Moon, Footprints, Heart } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { useHealthStore } from '../stores/healthStore'
import { cn } from '../lib/utils'
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'

type TimeRange = 7 | 14 | 30

export default function Analytics() {
  const { analytics, fetchAnalytics } = useHealthStore()
  const [range, setRange] = useState<TimeRange>(14)

  useEffect(() => {
    fetchAnalytics(range)
  }, [fetchAnalytics, range])

  const chartTooltipStyle = {
    background: 'hsla(220, 15%, 9%, 0.95)',
    border: '1px solid hsl(220, 15%, 18%)',
    borderRadius: '0.75rem',
    fontSize: '12px',
  }

  const commonAxisProps = {
    tick: { fontSize: 11, fill: 'hsl(220, 15%, 60%)' },
    axisLine: { stroke: 'hsl(220, 15%, 18%)' },
    tickLine: false,
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-semibold">健康分析</h1>
          <p className="text-sm text-muted-foreground mt-1">长期趋势追踪</p>
        </div>
        <div className="flex gap-1 p-1 glass-sm rounded-xl">
          {([7, 14, 30] as TimeRange[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm transition-colors',
                range === r ? 'bg-accent/20 text-accent' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {r}天
            </button>
          ))}
        </div>
      </motion.div>

      {/* Charts Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Weight */}
        <Card delay={1}>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-accent" />
            <h3 className="text-sm font-medium">体重 (kg)</h3>
          </div>
          {analytics?.weightTrend && analytics.weightTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={analytics.weightTrend}>
                <defs>
                  <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(160, 60%, 50%)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="hsl(160, 60%, 50%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" {...commonAxisProps} tickFormatter={(v: string) => v.slice(5)} />
                <YAxis {...commonAxisProps} domain={['dataMin - 1', 'dataMax + 1']} />
                <Tooltip contentStyle={chartTooltipStyle} labelFormatter={(v: string) => `日期: ${v}`} />
                <Area type="monotone" dataKey="value" stroke="hsl(160, 60%, 50%)" strokeWidth={2} fill="url(#weightGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </Card>

        {/* Sleep */}
        <Card delay={2}>
          <div className="flex items-center gap-2 mb-4">
            <Moon className="w-4 h-4 text-accent" />
            <h3 className="text-sm font-medium">睡眠 (小时)</h3>
          </div>
          {analytics?.sleepTrend && analytics.sleepTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={analytics.sleepTrend}>
                <defs>
                  <linearGradient id="sleepGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(260, 50%, 60%)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="hsl(260, 50%, 60%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" {...commonAxisProps} tickFormatter={(v: string) => v.slice(5)} />
                <YAxis {...commonAxisProps} domain={[0, 12]} />
                <Tooltip contentStyle={chartTooltipStyle} labelFormatter={(v: string) => `日期: ${v}`} />
                <Area type="monotone" dataKey="value" stroke="hsl(260, 50%, 60%)" strokeWidth={2} fill="url(#sleepGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </Card>

        {/* Steps */}
        <Card delay={3}>
          <div className="flex items-center gap-2 mb-4">
            <Footprints className="w-4 h-4 text-accent" />
            <h3 className="text-sm font-medium">步数</h3>
          </div>
          {analytics?.stepsTrend && analytics.stepsTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={analytics.stepsTrend}>
                <defs>
                  <linearGradient id="stepsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(40, 80%, 55%)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="hsl(40, 80%, 55%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" {...commonAxisProps} tickFormatter={(v: string) => v.slice(5)} />
                <YAxis {...commonAxisProps} />
                <Tooltip contentStyle={chartTooltipStyle} labelFormatter={(v: string) => `日期: ${v}`} />
                <Area type="monotone" dataKey="value" stroke="hsl(40, 80%, 55%)" strokeWidth={2} fill="url(#stepsGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </Card>

        {/* Recovery */}
        <Card delay={4}>
          <div className="flex items-center gap-2 mb-4">
            <Heart className="w-4 h-4 text-accent" />
            <h3 className="text-sm font-medium">恢复评分</h3>
          </div>
          {analytics?.recoveryTrend && analytics.recoveryTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={analytics.recoveryTrend}>
                <XAxis dataKey="date" {...commonAxisProps} tickFormatter={(v: string) => v.slice(5)} />
                <YAxis {...commonAxisProps} domain={[0, 100]} />
                <Tooltip contentStyle={chartTooltipStyle} labelFormatter={(v: string) => `日期: ${v}`} />
                <Line type="monotone" dataKey="value" stroke="hsl(0, 80%, 60%)" strokeWidth={2} dot={{ r: 3, fill: 'hsl(0, 80%, 60%)' }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </Card>
      </div>
    </div>
  )
}

function EmptyChart() {
  return (
    <div className="flex items-center justify-center h-[220px] text-xs text-muted-foreground">
      暂无数据
    </div>
  )
}
