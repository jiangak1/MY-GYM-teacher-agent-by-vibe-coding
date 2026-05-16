import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { RefreshCw, Dumbbell, Apple, BookOpen, ChevronDown, ChevronUp } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { cn } from '../lib/utils'
import { apiGet, apiPost } from '../api/client'
import type { CarbonCyclePlan, FoodTemplate } from '@ai-health/shared-types'

const carbDayColors: Record<string, string> = {
  high: 'bg-gradient-to-br from-amber-500/20 to-orange-500/20 border-amber-500/30',
  medium: 'bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-blue-500/30',
  low: 'bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-500/30',
}

const carbDayLabels: Record<string, string> = {
  high: '高碳日', medium: '中碳日', low: '低碳日',
}

const carbDayIcons: Record<string, string> = {
  high: '🔥', medium: '⚡', low: '🌿',
}

export default function CarbonCycle() {
  const [plan, setPlan] = useState<CarbonCyclePlan | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null)

  useEffect(() => { loadPlan() }, [])

  const loadPlan = async () => {
    try {
      const data = await apiGet<CarbonCyclePlan>('/carbon-cycle')
      setPlan(data)
    } catch { /* ignore */ }
  }

  const handleGenerate = async () => {
    setIsGenerating(true)
    try {
      const data = await apiPost<CarbonCyclePlan>('/carbon-cycle/generate')
      setPlan(data)
    } catch { /* ignore */ }
    setIsGenerating(false)
  }

  const todayDay = plan?.days?.[0]
  const templates = plan?.foodTemplates || []

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">碳循环方案</h1>
          <p className="text-sm text-muted-foreground mt-1">2天低碳 → 2天中碳 → 2天高碳 · 第七天灵活日</p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent/15 text-accent hover:bg-accent/25 transition-colors text-sm font-medium disabled:opacity-50"
        >
          <RefreshCw className={cn('w-4 h-4', isGenerating && 'animate-spin')} />
          重新生成
        </button>
      </motion.div>

      {/* Today Highlight */}
      {todayDay && (
        <Card delay={1} className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">今天</p>
              <h2 className="text-xl font-semibold">
                {carbDayLabels[todayDay.carbDayType]} <span className="text-lg">{carbDayIcons[todayDay.carbDayType]}</span>
              </h2>
              <p className="text-sm text-muted-foreground mt-1">{todayDay.notes || todayDay.workoutType}</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold gradient-text">{todayDay.calories}</div>
              <div className="text-sm text-muted-foreground">kcal / 天</div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-6">
            {[
              { label: '蛋白质', value: todayDay.proteinG, max: 200, color: 'bg-rose-500/60' },
              { label: '碳水', value: todayDay.carbsG, max: 300, color: 'bg-amber-500/60' },
              { label: '脂肪', value: todayDay.fatG, max: 100, color: 'bg-blue-500/60' },
            ].map((m) => (
              <div key={m.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">{m.label}</span>
                  <span>{m.value}g</span>
                </div>
                <div className="h-2 rounded-full bg-card-border overflow-hidden">
                  <div className={cn('h-full rounded-full', m.color)} style={{ width: `${Math.min(100, (m.value / m.max) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Weekly Plan */}
      <h3 className="text-lg font-medium flex items-center gap-2">
        <Apple className="w-5 h-5 text-accent" />
        本周计划
      </h3>

      <div className="grid grid-cols-7 gap-3">
        {plan?.days?.map((day, i) => (
          <motion.div
            key={day.date}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.05 }}
            className={cn(
              'rounded-xl border p-4 text-center transition-all',
              carbDayColors[day.carbDayType] || 'glass-sm',
              i === 0 && 'ring-1 ring-accent/50',
            )}
          >
            <p className="text-xs text-muted-foreground mb-1">{day.dayOfWeek}</p>
            <p className="text-lg mb-2">{carbDayIcons[day.carbDayType]}</p>
            <p className="text-xs font-medium">{carbDayLabels[day.carbDayType]}</p>
            <div className="mt-3 space-y-1">
              <p className="text-lg font-semibold">{day.calories}</p>
              <p className="text-[10px] text-muted-foreground">kcal</p>
            </div>
            <div className="mt-2 pt-2 border-t border-card-border space-y-0.5">
              <p className="text-[10px] text-muted-foreground">
                <span className="text-foreground">{day.proteinG}g</span> 蛋白
              </p>
              <p className="text-[10px] text-muted-foreground">
                <span className="text-foreground">{day.carbsG}g</span> 碳水
              </p>
              <p className="text-[10px] text-muted-foreground">
                <span className="text-foreground">{day.fatG}g</span> 脂肪
              </p>
            </div>
            <div className="mt-2 pt-2 border-t border-card-border flex items-center justify-center gap-1">
              <Dumbbell className="w-3 h-3 text-muted-foreground" />
              <p className="text-[10px] text-muted-foreground">{day.workoutType}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-amber-500/40" /> 高碳日 = 力量训练
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-blue-500/40" /> 中碳日 = 中等强度
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-green-500/40" /> 低碳日 = 休息/有氧
        </div>
      </div>

      {/* Food Template Reference */}
      {templates.length > 0 && (
        <>
          <h3 className="text-lg font-medium flex items-center gap-2 mt-8">
            <BookOpen className="w-5 h-5 text-accent" />
            饮食模版参考
          </h3>
          <p className="text-sm text-muted-foreground">按碳循环类型分类的食物搭配建议，可作为每日备餐参考</p>

          <div className="grid grid-cols-3 gap-4">
            {templates.map((tmpl) => (
              <motion.div
                key={tmpl.carbDayType}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <Card
                  className={cn(
                    'p-4',
                    expandedTemplate === tmpl.carbDayType && 'ring-1 ring-accent/30',
                  )}
                >
                  <button
                    onClick={() => setExpandedTemplate(expandedTemplate === tmpl.carbDayType ? null : tmpl.carbDayType)}
                    className="w-full text-left"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{carbDayIcons[tmpl.carbDayType]}</span>
                        <div>
                          <h4 className="font-medium text-sm">{tmpl.label}</h4>
                        </div>
                      </div>
                      {expandedTemplate === tmpl.carbDayType ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{tmpl.description}</p>
                  </button>

                  {expandedTemplate === tmpl.carbDayType && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-4 space-y-3"
                    >
                      {tmpl.meals.map((meal, i) => (
                        <div key={i} className="p-3 rounded-lg bg-glass border border-card-border/50">
                          <p className="text-xs font-medium text-accent mb-2">{meal.meal}</p>
                          <div className="space-y-1.5">
                            {meal.foods.map((food, j) => (
                              <div key={j} className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-accent/40" />
                                  <span>{food.name}</span>
                                </div>
                                <span className="text-muted-foreground">
                                  {food.amount}
                                  {food.note && <span className="ml-1 text-[10px] text-muted-foreground/50">({food.note})</span>}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </Card>
              </motion.div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
