import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Loader2, ChevronDown, ChevronUp, Dumbbell, Target, Wrench } from 'lucide-react'
import { cn } from '../lib/utils'

interface ExerciseResult {
  id: string
  name: string
  nameEn: string
  bodyPart: string
  equipment: string
  target: string
  instructions: string[]
}

export default function Exercise() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ExerciseResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [translatedMap, setTranslatedMap] = useState<Record<string, string[]>>({})
  const [translatingId, setTranslatingId] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const translateInstructions = async (exId: string, instructions: string[]) => {
    if (translatedMap[exId]) return // already translated
    setTranslatingId(exId)
    try {
      const res = await fetch('/api/exercises/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': 'default-user' },
        body: JSON.stringify({ instructions }),
      })
      const json = await res.json()
      if (json.success) {
        setTranslatedMap((prev) => ({ ...prev, [exId]: json.data.translated }))
      }
    } catch { /* keep original if translation fails */ }
    setTranslatingId(null)
  }

  const handleExpand = (exId: string, instructions: string[]) => {
    if (expandedId === exId) {
      setExpandedId(null)
    } else {
      setExpandedId(exId)
      translateInstructions(exId, instructions)
    }
  }

  const searchExercises = async (q: string) => {
    if (q.length < 2) {
      setResults([])
      setError('')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/exercises/search?q=${encodeURIComponent(q)}`, {
        headers: { 'x-user-id': 'default-user' },
      })
      const json = await res.json()
      if (json.success) {
        setResults(json.data || [])
        if (json.data?.length === 0) setError('未找到匹配动作，尝试其他关键词')
      } else {
        setError(json.error || '搜索失败')
        setResults([])
      }
    } catch {
      setError('搜索请求失败，请检查网络')
      setResults([])
    }
    setLoading(false)
  }

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => searchExercises(query.trim()), 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query])

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.2 }}
      className="max-w-5xl mx-auto space-y-5 pb-8"
    >
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-semibold">训练动作库</h1>
        <p className="text-muted-foreground mt-1 text-sm">搜索训练动作名称，查看动画示范和详细说明</p>
      </motion.div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="输入训练动作名称，如：卧推、深蹲、硬拉..."
          className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-glass border border-card-border text-sm outline-none focus:border-accent/50 transition-colors"
        />
        {loading && (
          <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground animate-spin" />
        )}
      </div>

      {/* Error */}
      {error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="text-center py-8 text-sm text-muted-foreground">
          {error}
        </motion.div>
      )}

      {/* Empty state */}
      {!loading && !error && results.length === 0 && query.length < 2 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-accent/20 to-info/20 flex items-center justify-center mb-4">
            <Dumbbell className="w-10 h-10 text-accent" />
          </div>
          <h2 className="text-lg font-medium mb-2">训练动作库</h2>
          <p className="text-sm text-muted-foreground max-w-xs">
            输入训练动作的中文名称，搜索对应的动画示范
          </p>
        </motion.div>
      )}

      {/* Results Grid */}
      <AnimatePresence>
        {results.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {results.map((ex, i) => (
              <motion.div
                key={ex.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-2xl bg-glass border border-card-border overflow-hidden hover:border-accent/20 transition-colors"
              >
                {/* GIF */}
                <div className="aspect-square bg-[hsl(220,15%,4%)] flex items-center justify-center relative">
                  <img
                    src={`/api/exercises/image/${ex.id}?resolution=180`}
                    alt={ex.name}
                    className="w-full h-full object-contain"
                    loading="lazy"
                  />
                </div>

                {/* Info */}
                <div className="p-4">
                  <h3 className="font-medium text-sm">{ex.name}</h3>
                  {ex.name !== ex.nameEn && (
                    <p className="text-xs text-muted-foreground mt-0.5 capitalize">{ex.nameEn}</p>
                  )}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400">
                      <Target className="w-2.5 h-2.5" />
                      {ex.bodyPart}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400">
                      <Wrench className="w-2.5 h-2.5" />
                      {ex.equipment}
                    </span>
                  </div>

                  {/* Instructions toggle */}
                  {ex.instructions.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-card-border/50">
                      <button
                        onClick={() => handleExpand(ex.id, ex.instructions)}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
                      >
                        {expandedId === ex.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        {expandedId === ex.id ? '收起说明' : '动作说明'}
                        {translatingId === ex.id && <Loader2 className="w-3 h-3 animate-spin ml-1" />}
                      </button>
                      <AnimatePresence>
                        {expandedId === ex.id && (
                          <motion.ol
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden mt-2 space-y-1 list-decimal list-inside text-xs text-muted-foreground"
                          >
                            {(translatedMap[ex.id] || ex.instructions).map((step, j) => (
                              <li key={j}>{step}</li>
                            ))}
                          </motion.ol>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
