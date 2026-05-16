import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Footprints, Moon, Heart, TrendingUp, Activity, Zap, Brain,
  Plus, X, Apple, Utensils, Trash2, Weight, Bed, Dumbbell,
} from 'lucide-react'
import { Card, StatCard } from '../components/ui/Card'
import { useHealthStore } from '../stores/healthStore'
import { cn, formatNumber } from '../lib/utils'
import { apiGet, apiPost, apiDelete } from '../api/client'
import { toast } from 'sonner'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import type { NutritionLogEntry, DashboardData } from '@ai-health/shared-types'

type EntryTab = 'health' | 'food'

export default function Dashboard() {
  const { dashboard, isLoading, fetchDashboard } = useHealthStore()
  const [entryTab, setEntryTab] = useState<EntryTab>('health')
  const [showEntry, setShowEntry] = useState(false)

  // Health entry form
  const [weightKg, setWeightKg] = useState('')
  const [steps, setSteps] = useState('')
  const [sleepHours, setSleepHours] = useState('')
  const [sleepQuality, setSleepQuality] = useState('fair')

  // Food entry form
  const [mealType, setMealType] = useState('breakfast')
  const [foodName, setFoodName] = useState('')
  const [servingG, setServingG] = useState('100')
  const [calories, setCalories] = useState('')
  const [proteinG, setProteinG] = useState('')
  const [carbsG, setCarbsG] = useState('')
  const [fatG, setFatG] = useState('')
  const [foodResults, setFoodResults] = useState<{ name: string; category: string; caloriesPer100g: number; proteinPer100g: number; carbsPer100g: number; fatPer100g: number }[]>([])
  const [showFoodDropdown, setShowFoodDropdown] = useState(false)
  const [searchingFood, setSearchingFood] = useState(false)

  // Snapshot for undo
  const prevHealthRef = useRef<{ weightKg: number; steps: number; sleepDurationMin: number; sleepQuality: string } | null>(null)

  useEffect(() => { fetchDashboard() }, [fetchDashboard])

  const today = dashboard?.today
  const recovery = dashboard?.recovery
  const plan = dashboard?.carbonCyclePlan
  const weightTrend = dashboard?.recentWeight || []
  const nutritionLogs = dashboard?.nutritionLogs || []
  const macros = today?.macros

  const recoveryColor =
    (recovery?.score ?? 0) >= 75 ? 'text-success' :
    (recovery?.score ?? 0) >= 50 ? 'text-warning' : 'text-danger'

  // --- Handlers ---

  const handleLogHealth = async () => {
    const w = parseFloat(weightKg)
    const s = parseInt(steps)
    const sh = parseFloat(sleepHours)
    if (isNaN(w) && isNaN(s) && isNaN(sh)) return

    // Snapshot current values for undo
    prevHealthRef.current = {
      weightKg: today?.weightKg ?? 0,
      steps: today?.steps ?? 0,
      sleepDurationMin: today?.sleepDurationMin ?? 0,
      sleepQuality: today?.sleepQuality ?? 'fair',
    }

    await fetch('/api/health/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': 'default-user' },
      body: JSON.stringify({
        weightKg: isNaN(w) ? undefined : w,
        steps: isNaN(s) ? undefined : s,
        sleepDurationMin: isNaN(sh) ? undefined : Math.round(sh * 60),
        sleepQuality,
      }),
    })
    setWeightKg(''); setSteps(''); setSleepHours('')
    fetchDashboard()

    toast.success('健康数据已保存', {
      duration: 5000,
      action: {
        label: '撤销',
        onClick: async () => {
          if (!prevHealthRef.current) return
          await fetch('/api/health/log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-user-id': 'default-user' },
            body: JSON.stringify(prevHealthRef.current),
          })
          fetchDashboard()
        },
      },
    })
  }

  // USDA food search
  const searchFood = async (query: string) => {
    if (query.length < 2) { setFoodResults([]); setShowFoodDropdown(false); return }
    setSearchingFood(true)
    try {
      const res = await fetch(`/api/nutrition/search?q=${encodeURIComponent(query)}`, {
        headers: { 'x-user-id': 'default-user' },
      })
      const json = await res.json()
      if (json.success && json.data?.length > 0) {
        setFoodResults(json.data)
        setShowFoodDropdown(true)
      } else {
        setFoodResults([])
        setShowFoodDropdown(false)
      }
    } catch { setFoodResults([]) }
    setSearchingFood(false)
  }

  const selectFood = (food: typeof foodResults[0]) => {
    setFoodName(food.name)
    const g = parseFloat(servingG) || 100
    setCalories(((food.caloriesPer100g / 100) * g).toFixed(0))
    setProteinG(((food.proteinPer100g / 100) * g).toFixed(1))
    setCarbsG(((food.carbsPer100g / 100) * g).toFixed(1))
    setFatG(((food.fatPer100g / 100) * g).toFixed(1))
    setShowFoodDropdown(false)
  }

  // Recalculate when serving size changes after food is selected
  useEffect(() => {
    if (!foodName || foodResults.length === 0) return
    const match = foodResults.find((f) => f.name === foodName)
    if (match) {
      const g = parseFloat(servingG) || 100
      setCalories(((match.caloriesPer100g / 100) * g).toFixed(0))
      setProteinG(((match.proteinPer100g / 100) * g).toFixed(1))
      setCarbsG(((match.carbsPer100g / 100) * g).toFixed(1))
      setFatG(((match.fatPer100g / 100) * g).toFixed(1))
    }
  }, [servingG])

  const handleLogFood = async () => {
    const cal = parseFloat(calories)
    const p = parseFloat(proteinG)
    const c = parseFloat(carbsG)
    const f = parseFloat(fatG)
    if (!foodName.trim() || isNaN(cal)) return

    const entry = await apiPost<{ id: string }>('/nutrition/log', {
      mealType, foodName: foodName.trim(),
      servingSizeG: parseFloat(servingG) || 100,
      calories: cal, proteinG: isNaN(p) ? 0 : p,
      carbsG: isNaN(c) ? 0 : c, fatG: isNaN(f) ? 0 : f,
    })
    setFoodName(''); setCalories(''); setProteinG(''); setCarbsG(''); setFatG('')
    fetchDashboard()

    toast.success('饮食记录已保存', {
      duration: 5000,
      action: {
        label: '撤销',
        onClick: async () => {
          await apiDelete(`/nutrition/log/${entry.id}`)
          fetchDashboard()
        },
      },
    })
  }

  const handleDeleteFood = async (id: string) => {
    await apiDelete(`/nutrition/log/${id}`)
    fetchDashboard()
  }

  const calorieProgress = macros ? Math.min(100, (macros.consumed.calories / macros.planned.calories) * 100) : 0

  if (isLoading && !dashboard) {
    return (
      <div className="flex items-center justify-center h-full">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
          className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-5 pb-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            早上好<span className="text-muted-foreground">，这是你的健康概览</span>
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {new Date().toLocaleDateString('zh-CN', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button
          onClick={() => setShowEntry(!showEntry)}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all',
            showEntry
              ? 'bg-accent text-accent-foreground'
              : 'bg-accent/10 text-accent hover:bg-accent/20',
          )}
        >
          <Plus className="w-4 h-4" />
          记录数据
        </button>
      </motion.div>

      {/* Entry Panel */}
      <AnimatePresence>
        {showEntry && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <Card className="p-5">
              {/* Tabs */}
              <div className="flex gap-2 mb-4">
                {[
                  { key: 'health' as EntryTab, label: '健康数据', icon: Weight },
                  { key: 'food' as EntryTab, label: '饮食记录', icon: Utensils },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setEntryTab(tab.key)}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all',
                      entryTab === tab.key
                        ? 'bg-accent/15 text-accent border border-accent/30'
                        : 'text-muted-foreground border border-card-border hover:text-foreground',
                    )}
                  >
                    <tab.icon className="w-4 h-4" /> {tab.label}
                  </button>
                ))}
              </div>

              {/* Health Entry Form */}
              {entryTab === 'health' && (
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">体重 (kg)</label>
                    <input type="number" step="0.1" value={weightKg} onChange={(e) => setWeightKg(e.target.value)}
                      placeholder="78.5" className="w-full px-3 py-2 rounded-lg bg-glass border border-card-border text-sm outline-none focus:border-accent/50" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">步数</label>
                    <input type="number" value={steps} onChange={(e) => setSteps(e.target.value)}
                      placeholder="8500" className="w-full px-3 py-2 rounded-lg bg-glass border border-card-border text-sm outline-none focus:border-accent/50" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">睡眠 (小时)</label>
                    <input type="number" step="0.5" value={sleepHours} onChange={(e) => setSleepHours(e.target.value)}
                      placeholder="7.5" className="w-full px-3 py-2 rounded-lg bg-glass border border-card-border text-sm outline-none focus:border-accent/50" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">睡眠质量</label>
                    <select value={sleepQuality} onChange={(e) => setSleepQuality(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-glass border border-card-border text-sm outline-none focus:border-accent/50">
                      <option value="poor">差</option>
                      <option value="fair">一般</option>
                      <option value="good">好</option>
                      <option value="excellent">极好</option>
                    </select>
                  </div>
                  <div className="col-span-4">
                    <button onClick={handleLogHealth}
                      className="w-full py-2.5 rounded-lg bg-accent/15 text-accent hover:bg-accent/25 text-sm font-medium transition-colors">
                      保存健康数据
                    </button>
                  </div>
                </div>
              )}

              {/* Food Entry Form */}
              {entryTab === 'food' && (
                <div>
                  <div className="grid grid-cols-6 gap-3 mb-3">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">餐食</label>
                      <select value={mealType} onChange={(e) => setMealType(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-glass border border-card-border text-sm outline-none focus:border-accent/50">
                        <option value="breakfast">早餐</option>
                        <option value="lunch">午餐</option>
                        <option value="dinner">晚餐</option>
                        <option value="snack">加餐</option>
                      </select>
                    </div>
                    <div className="col-span-2 relative">
                      <label className="text-xs text-muted-foreground mb-1 block">食物名称 (输入后自动搜索)</label>
                      <input type="text" value={foodName}
                        onChange={(e) => { setFoodName(e.target.value); searchFood(e.target.value) }}
                        onBlur={() => setTimeout(() => setShowFoodDropdown(false), 200)}
                        onFocus={() => foodResults.length > 0 && setShowFoodDropdown(true)}
                        placeholder="鸡胸肉、米饭..." className="w-full px-3 py-2 rounded-lg bg-glass border border-card-border text-sm outline-none focus:border-accent/50" />
                      {searchingFood && <span className="absolute right-3 top-8 text-xs text-muted-foreground animate-pulse">搜索中...</span>}
                      {showFoodDropdown && foodResults.length > 0 && (
                        <div className="absolute z-20 w-full mt-1 rounded-lg bg-[hsl(220,15%,6%)] border border-card-border shadow-xl max-h-40 overflow-y-auto">
                          {foodResults.map((f, i) => (
                            <button
                              key={i}
                              type="button"
                              onMouseDown={() => selectFood(f)}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-accent/10 transition-colors flex items-center justify-between"
                            >
                              <span>{f.name}</span>
                              <span className={cn(
                                'text-[10px] px-1.5 py-0.5 rounded-full',
                                f.category === 'meat_egg' ? 'bg-rose-500/15 text-rose-400' :
                                f.category === 'oil_nut' ? 'bg-amber-500/15 text-amber-400' :
                                'bg-blue-500/15 text-blue-400',
                              )}>
                                {f.category === 'meat_egg' ? '蛋白质' : f.category === 'oil_nut' ? '脂肪' : '碳水'}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">份量 (g)</label>
                      <input type="number" value={servingG} onChange={(e) => setServingG(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-glass border border-card-border text-sm outline-none focus:border-accent/50" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">热量 (kcal)</label>
                      <input type="number" value={calories} onChange={(e) => setCalories(e.target.value)}
                        placeholder="300" className="w-full px-3 py-2 rounded-lg bg-glass border border-card-border text-sm outline-none focus:border-accent/50" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">蛋白 (g)</label>
                      <input type="number" step="0.1" value={proteinG} onChange={(e) => setProteinG(e.target.value)}
                        placeholder="30" className="w-full px-3 py-2 rounded-lg bg-glass border border-card-border text-sm outline-none focus:border-accent/50" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">碳水 (g)</label>
                      <input type="number" step="0.1" value={carbsG} onChange={(e) => setCarbsG(e.target.value)}
                        placeholder="40" className="w-full px-3 py-2 rounded-lg bg-glass border border-card-border text-sm outline-none focus:border-accent/50" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">脂肪 (g)</label>
                      <input type="number" step="0.1" value={fatG} onChange={(e) => setFatG(e.target.value)}
                        placeholder="10" className="w-full px-3 py-2 rounded-lg bg-glass border border-card-border text-sm outline-none focus:border-accent/50" />
                    </div>
                  </div>
                  <button onClick={handleLogFood}
                    className="w-full py-2.5 rounded-lg bg-accent/15 text-accent hover:bg-accent/25 text-sm font-medium transition-colors">
                    记录饮食
                  </button>
                </div>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats Grid */}
      <div className="grid grid-cols-6 gap-3">
        <StatCard label="今日步数" value={formatNumber(today?.steps || 0)} unit="步" icon={Footprints} delay={1} />
        <StatCard label="睡眠" value={today?.sleepDurationMin ? (today.sleepDurationMin / 60).toFixed(1) : '0'} unit="小时" icon={Moon} delay={1} />
        <StatCard label="恢复评分" value={recovery?.score || 50} unit="/100" icon={Heart} delay={1}
          trend={recovery?.recommendation?.slice(0, 8)} />
        <StatCard label="今日碳水" value={macros?.remaining.carbsG ?? '—'} unit="g" icon={Zap} delay={1}
          trend={`已摄入 ${macros?.consumed.carbsG || 0}g`} />
        <StatCard label="蛋白质" value={macros?.remaining.proteinG ?? '—'} unit="g" icon={Dumbbell} delay={1}
          trend={`已摄入 ${macros?.consumed.proteinG || 0}g`} />
        <StatCard label="脂肪" value={macros?.remaining.fatG ?? '—'} unit="g" icon={Apple} delay={1}
          trend={`已摄入 ${macros?.consumed.fatG || 0}g`} />
      </div>

      {/* Macro Progress Bars */}
      {macros && macros.planned.calories > 0 && (
        <Card delay={2}>
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-accent" />
            <h3 className="font-medium">今日宏量营养素</h3>
            <span className="text-xs text-muted-foreground ml-auto">
              {macros.consumed.calories} / {macros.planned.calories} kcal
            </span>
          </div>
          <div className="space-y-4">
            {/* Calories */}
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span>热量</span>
                <span className={macros.remaining.calories < 0 ? 'text-danger' : 'text-muted-foreground'}>
                  剩余 {macros.remaining.calories} kcal
                </span>
              </div>
              <div className="h-3 rounded-full bg-card-border overflow-hidden">
                <div className={cn('h-full rounded-full transition-all', calorieProgress > 100 ? 'bg-danger/60' : 'bg-accent/60')}
                  style={{ width: `${Math.min(100, calorieProgress)}%` }} />
              </div>
            </div>
            {/* Protein / Carbs / Fat */}
            {([
              { label: '蛋白质', consumed: macros.consumed.proteinG, planned: macros.planned.proteinG, remaining: macros.remaining.proteinG, color: 'bg-rose-500/60', max: 200 },
              { label: '碳水', consumed: macros.consumed.carbsG, planned: macros.planned.carbsG, remaining: macros.remaining.carbsG, color: 'bg-amber-500/60', max: 300 },
              { label: '脂肪', consumed: macros.consumed.fatG, planned: macros.planned.fatG, remaining: macros.remaining.fatG, color: 'bg-blue-500/60', max: 100 },
            ]).map((m) => (
              <div key={m.label}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-muted-foreground">{m.label}</span>
                  <span className={m.remaining < 0 ? 'text-danger' : 'text-muted-foreground'}>
                    {m.consumed}/{m.planned}g · 剩余 {m.remaining}g
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-card-border overflow-hidden">
                  <div className={cn('h-full rounded-full transition-all', m.color)}
                    style={{ width: `${Math.min(100, (m.consumed / m.planned) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Recovery + Weight */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="col-span-1" delay={3}>
          <div className="flex items-center gap-2 mb-3">
            <Brain className="w-5 h-5 text-accent" />
            <h3 className="font-medium">今日状态</h3>
            <span className="text-xs text-muted-foreground ml-auto">自评</span>
          </div>
          {/* Energy Level Selector */}
          <div className="space-y-2">
            {([
              { level: 'energetic', label: '精力充沛', score: 90, emoji: '⚡', color: 'text-success border-success/30' },
              { level: 'good', label: '状态良好', score: 75, emoji: '😊', color: 'text-success/80 border-success/20' },
              { level: 'normal', label: '一般', score: 55, emoji: '😐', color: 'text-warning border-warning/30' },
              { level: 'tired', label: '有些疲劳', score: 35, emoji: '😫', color: 'text-warning/80 border-warning/20' },
              { level: 'exhausted', label: '非常疲劳', score: 15, emoji: '😵', color: 'text-danger border-danger/30' },
            ]).map((opt) => (
              <button
                key={opt.level}
                onClick={async () => {
                  await fetch('/api/health/recovery-status', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-user-id': 'default-user' },
                    body: JSON.stringify({ level: opt.level }),
                  })
                  fetchDashboard()
                }}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-lg border text-sm transition-all hover:bg-accent/5',
                  (recovery?.score ?? 0) === opt.score
                    ? cn('bg-accent/10', opt.color)
                    : 'border-card-border text-muted-foreground',
                )}
              >
                <span className="text-base">{opt.emoji}</span>
                <span className="flex-1 text-left">{opt.label}</span>
                {(recovery?.score ?? 0) === opt.score && (
                  <span className={cn('text-xs font-medium', opt.color)}>● 当前</span>
                )}
              </button>
            ))}
          </div>
          {/* Score ring */}
          <div className="flex flex-col items-center pt-3 mt-3 border-t border-card-border/50">
            <div className="relative">
              <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="38" fill="none" stroke="currentColor" className="text-card-border" strokeWidth="6" />
                <motion.circle cx="50" cy="50" r="38" fill="none" stroke="currentColor" className={recoveryColor}
                  strokeWidth="6" strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 38}`}
                  initial={{ strokeDashoffset: 2 * Math.PI * 38 }}
                  animate={{ strokeDashoffset: 2 * Math.PI * 38 * (1 - (recovery?.score || 50) / 100) }}
                  transition={{ duration: 0.8, ease: 'easeOut' }} />
              </svg>
              <span className={cn('absolute inset-0 flex items-center justify-center text-lg font-bold', recoveryColor)}>
                {recovery?.score || 50}
              </span>
            </div>
            <span className="text-xs text-muted-foreground mt-2 text-center px-2">
              {recovery?.recommendation || '点击上方选择今日状态'}
            </span>
          </div>
        </Card>

        {/* Weight Chart + Manual Record */}
        <Card className="col-span-2" delay={3}>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-accent" />
            <h3 className="font-medium">体重趋势</h3>
          </div>
          {weightTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={weightTrend}>
                <defs>
                  <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(160, 60%, 50%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(160, 60%, 50%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(220, 15%, 60%)' }} tickFormatter={(v: string) => v.slice(5)} />
                <YAxis domain={['dataMin - 1', 'dataMax + 1']} tick={{ fontSize: 11, fill: 'hsl(220, 15%, 60%)' }} />
                <Tooltip
                  contentStyle={{ background: 'hsla(220, 15%, 9%, 0.95)', border: '1px solid hsl(220, 15%, 18%)', borderRadius: '0.75rem', fontSize: '12px' }}
                  labelFormatter={(v: string) => `日期: ${v}`} />
                <Area type="monotone" dataKey="weight" stroke="hsl(160, 60%, 50%)" strokeWidth={2} fill="url(#weightGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
              暂无体重数据，点击上方"记录数据"开始追踪
            </div>
          )}
        </Card>
      </div>

      {/* Today's Food Logs */}
      {nutritionLogs.length > 0 && (
        <Card delay={4}>
          <div className="flex items-center gap-2 mb-4">
            <Utensils className="w-5 h-5 text-accent" />
            <h3 className="font-medium">今日饮食记录</h3>
            <span className="text-xs text-muted-foreground ml-2">{nutritionLogs.length} 条</span>
          </div>
          <div className="space-y-2">
            {nutritionLogs.map((log: NutritionLogEntry) => (
              <div key={log.id} className="flex items-center gap-4 p-3 rounded-xl bg-glass border border-card-border/50 text-sm group">
                <span className={cn(
                  'text-xs px-2 py-0.5 rounded-full',
                  log.mealType === 'breakfast' ? 'bg-amber-500/15 text-amber-400' :
                  log.mealType === 'lunch' ? 'bg-green-500/15 text-green-400' :
                  log.mealType === 'dinner' ? 'bg-blue-500/15 text-blue-400' :
                  'bg-purple-500/15 text-purple-400',
                )}>
                  {log.mealType === 'breakfast' ? '早餐' : log.mealType === 'lunch' ? '午餐' : log.mealType === 'dinner' ? '晚餐' : '加餐'}
                </span>
                <span className="flex-1 font-medium">{log.foodName}</span>
                <span className="text-muted-foreground">{log.servingSizeG}g</span>
                <span>{log.calories} kcal</span>
                <span className="text-muted-foreground text-xs">蛋白{log.proteinG}g 碳水{log.carbsG}g 脂肪{log.fatG}g</span>
                <button onClick={() => handleDeleteFood(log.id)}
                  className="text-muted-foreground/30 hover:text-danger transition-colors opacity-0 group-hover:opacity-100">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* AI Advice */}
      <Card delay={5}>
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-5 h-5 text-accent" />
          <h3 className="font-medium">AI 今日建议</h3>
        </div>
        <p className="text-muted-foreground text-sm leading-relaxed">
          {today?.aiAdvice || '正在分析你的健康数据...'}
        </p>
      </Card>
    </div>
  )
}
