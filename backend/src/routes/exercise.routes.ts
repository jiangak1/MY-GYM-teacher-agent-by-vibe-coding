import type { FastifyInstance } from 'fastify'

// Chinese → English exercise name dictionary
const CN_EN_EXERCISE: Record<string, string> = {
  '卧推': 'barbell bench press', '杠铃卧推': 'barbell bench press', '哑铃卧推': 'dumbbell bench press',
  '上斜卧推': 'incline bench press', '下斜卧推': 'decline bench press',
  '深蹲': 'barbell squat', '杠铃深蹲': 'barbell squat', '哑铃深蹲': 'dumbbell squat',
  '前蹲': 'front squat', '保加利亚分腿蹲': 'bulgarian split squat',
  '硬拉': 'deadlift', '传统硬拉': 'conventional deadlift', '相扑硬拉': 'sumo deadlift',
  '罗马尼亚硬拉': 'romanian deadlift',
  '引体向上': 'pull-up', '正手引体向上': 'pull-up', '反手引体向上': 'chin-up',
  '俯卧撑': 'push-up', '宽距俯卧撑': 'wide push-up', '钻石俯卧撑': 'diamond push-up',
  '划船': 'barbell row', '杠铃划船': 'barbell row', '哑铃划船': 'dumbbell row',
  '坐姿划船': 'seated cable row', 'T杠划船': 't-bar row',
  '推举': 'overhead press', '杠铃推举': 'barbell overhead press', '哑铃推举': 'dumbbell shoulder press',
  '阿诺德推举': 'arnold press',
  '侧平举': 'lateral raise', '哑铃侧平举': 'dumbbell lateral raise', '前平举': 'front raise',
  '弯举': 'barbell curl', '哑铃弯举': 'dumbbell curl', '锤式弯举': 'hammer curl',
  '牧师凳弯举': 'preacher curl', '集中弯举': 'concentration curl',
  '臂屈伸': 'triceps dip', '双杠臂屈伸': 'triceps dip', '哑铃臂屈伸': 'triceps extension',
  '绳索下压': 'tricep pushdown', '窄距卧推': 'close grip bench press',
  '飞鸟': 'dumbbell fly', '哑铃飞鸟': 'dumbbell fly', '绳索飞鸟': 'cable fly',
  '下拉': 'lat pulldown', '高位下拉': 'lat pulldown', '直臂下拉': 'straight arm pulldown',
  '腿举': 'leg press', '腿屈伸': 'leg extension', '腿弯举': 'leg curl',
  '臀推': 'hip thrust', '臀桥': 'glute bridge',
  '卷腹': 'crunch', '仰卧起坐': 'sit-up', '举腿': 'hanging leg raise',
  '平板支撑': 'plank', '侧平板': 'side plank',
  '农夫行走': 'farmer walk', '推雪橇': 'sled push',
  '波比跳': 'burpee', '开合跳': 'jumping jack',
  '壶铃摆动': 'kettlebell swing', '壶铃': 'kettlebell',
  '高翻': 'power clean', '抓举': 'snatch', '挺举': 'clean and jerk',
  '面拉': 'face pull',
  '耸肩': 'barbell shrug', '哑铃耸肩': 'dumbbell shrug',
  '提踵': 'standing calf raise', '坐姿提踵': 'seated calf raise',
  '二头弯举': 'bicep curl', '三头下压': 'tricep pushdown',
  '背部': 'back', '胸部': 'chest', '肩部': 'shoulder', '腿部': 'legs',
  '手臂': 'arms', '腹肌': 'abs', '核心': 'core',
  '跑步': 'running', '跳绳': 'jump rope', '游泳': 'swimming',
  '战绳': 'battle rope', '跳箱': 'box jump',
}

function hasChinese(text: string): boolean {
  return /[一-鿿]/.test(text)
}

function translateExerciseName(query: string): string {
  if (CN_EN_EXERCISE[query]) return CN_EN_EXERCISE[query]
  for (const [cn, en] of Object.entries(CN_EN_EXERCISE)) {
    if (query.includes(cn) || cn.includes(query)) return en
  }
  return query
}

// Build reverse EN→CN dictionary (pick shortest Chinese name)
const EN_CN_EXERCISE: Record<string, string> = {}
for (const [cn, en] of Object.entries(CN_EN_EXERCISE)) {
  if (!EN_CN_EXERCISE[en] || cn.length < EN_CN_EXERCISE[en].length) {
    EN_CN_EXERCISE[en] = cn
  }
}

// Also add some common ExerciseDB response names
const EN_CN_EXTRA: Record<string, string> = {
  'barbell bench press': '杠铃卧推',
  'dumbbell bench press': '哑铃卧推',
  'incline bench press': '上斜卧推',
  'decline bench press': '下斜卧推',
  'barbell squat': '杠铃深蹲',
  'dumbbell squat': '哑铃深蹲',
  'front squat': '前蹲',
  'deadlift': '硬拉',
  'sumo deadlift': '相扑硬拉',
  'romanian deadlift': '罗马尼亚硬拉',
  'pull-up': '引体向上',
  'chin-up': '反手引体向上',
  'push-up': '俯卧撑',
  'barbell row': '杠铃划船',
  'dumbbell row': '哑铃划船',
  'seated cable row': '坐姿划船',
  'overhead press': '杠铃推举',
  'dumbbell shoulder press': '哑铃推举',
  'lateral raise': '哑铃侧平举',
  'front raise': '前平举',
  'barbell curl': '杠铃弯举',
  'dumbbell curl': '哑铃弯举',
  'hammer curl': '锤式弯举',
  'preacher curl': '牧师凳弯举',
  'triceps dip': '双杠臂屈伸',
  'triceps extension': '哑铃臂屈伸',
  'tricep pushdown': '绳索下压',
  'dumbbell fly': '哑铃飞鸟',
  'cable fly': '绳索飞鸟',
  'lat pulldown': '高位下拉',
  'leg press': '腿举',
  'leg extension': '腿屈伸',
  'leg curl': '腿弯举',
  'hip thrust': '臀推',
  'glute bridge': '臀桥',
  'crunch': '卷腹',
  'sit-up': '仰卧起坐',
  'hanging leg raise': '举腿',
  'plank': '平板支撑',
  'side plank': '侧平板',
  'barbell shrug': '杠铃耸肩',
  'standing calf raise': '站姿提踵',
  'seated calf raise': '坐姿提踵',
  'bicep curl': '二头弯举',
  'burpee': '波比跳',
  'jumping jack': '开合跳',
  'kettlebell swing': '壶铃摆动',
  'power clean': '高翻',
  'snatch': '抓举',
  'face pull': '面拉',
  'close grip bench press': '窄距卧推',
  'arnold press': '阿诺德推举',
  'farmer walk': '农夫行走',
  'sled push': '推雪橇',
  'battle rope': '战绳',
  'box jump': '跳箱',
  'jump rope': '跳绳',
  'concentration curl': '集中弯举',
  'bulgarian split squat': '保加利亚分腿蹲',
  't-bar row': 'T杠划船',
  'straight arm pulldown': '直臂下拉',
  'wide push-up': '宽距俯卧撑',
  'diamond push-up': '钻石俯卧撑',
  'conventional deadlift': '传统硬拉',
  'dumbbell lateral raise': '哑铃侧平举',
}
Object.assign(EN_CN_EXERCISE, EN_CN_EXTRA)

function translateToChinese(englishName: string): string {
  const lower = englishName.toLowerCase()
  // Direct match
  if (EN_CN_EXERCISE[lower]) return EN_CN_EXERCISE[lower]
  // Partial match — check if any English key is contained in the result name
  for (const [en, cn] of Object.entries(EN_CN_EXERCISE)) {
    if (lower.includes(en)) return cn
  }
  // Fallback: return original English name
  return englishName
}

// Body part translations
const BODY_PART_CN: Record<string, string> = {
  chest: '胸部', back: '背部', legs: '腿部', shoulders: '肩部',
  arms: '手臂', waist: '核心', cardio: '有氧', neck: '颈部',
  'upper arms': '上臂', 'lower arms': '前臂', 'upper legs': '大腿',
  'lower legs': '小腿', glutes: '臀部', abdominals: '腹肌',
}

// Equipment translations
const EQUIPMENT_CN: Record<string, string> = {
  barbell: '杠铃', dumbbell: '哑铃', cable: '绳索', kettlebell: '壶铃',
  'body weight': '自重', bands: '弹力带', 'e-z curl bar': '曲杠',
  'medicine ball': '药球', 'stability ball': '健身球', machine: '器械',
  'smith machine': '史密斯机', 'trap bar': '六角杠', 'battle rope': '战绳',
  'exercise ball': '健身球', 'foam roll': '泡沫轴', 'resistance band': '弹力带',
}

interface ExerciseDBItem {
  id: string
  name: string
  bodyPart: string
  equipment: string
  target: string
  secondaryMuscles?: string[]
  instructions?: string[]
  gifUrl?: string
}

export async function exerciseRoutes(app: FastifyInstance) {
  app.get('/api/exercises/search', async (request, reply) => {
    const q = (request.query as { q?: string }).q?.trim()
    if (!q || q.length < 2) return reply.send({ success: true, data: [] })

    const apiKey = process.env.EXERCISEDB_API_KEY
    if (!apiKey) {
      return reply.send({ success: false, error: 'EXERCISEDB_API_KEY not configured. Set it in .env to enable exercise search.', data: [] })
    }

    const translated = hasChinese(q) ? translateExerciseName(q) : q

    try {
      const response = await fetch(
        `https://exercisedb.p.rapidapi.com/exercises/name/${encodeURIComponent(translated)}?limit=10`,
        {
          headers: {
            'X-RapidAPI-Key': apiKey,
            'X-RapidAPI-Host': 'exercisedb.p.rapidapi.com',
          },
          signal: AbortSignal.timeout(8000),
        },
      )
      const data = (await response.json()) as ExerciseDBItem[]

      if (!Array.isArray(data) || data.length === 0) {
        return reply.send({ success: true, data: [] })
      }

      const results = data.slice(0, 10).map((ex) => ({
        id: ex.id,
        name: translateToChinese(ex.name),
        nameEn: ex.name,
        bodyPart: BODY_PART_CN[ex.bodyPart] || ex.bodyPart,
        equipment: EQUIPMENT_CN[ex.equipment] || ex.equipment,
        target: ex.target,
        instructions: ex.instructions || [],
      }))

      return reply.send({ success: true, data: results })
    } catch (err: any) {
      console.error('[ExerciseDB] API request failed:', err?.message || err)
      return reply.send({ success: false, error: `ExerciseDB API request failed: ${err?.message || 'unknown error'}`, data: [] })
    }
  })

  // Translate exercise instructions to Chinese using DeepSeek
  app.post('/api/exercises/translate', async (request, reply) => {
    const { instructions } = request.body as { instructions: string[] }
    if (!instructions?.length) {
      return reply.send({ success: true, data: { translated: [] } })
    }

    const apiKey = process.env.DEEPSEEK_API_KEY
    if (!apiKey) {
      // No translation provider configured — return original text
      return reply.send({ success: true, data: { translated: instructions } })
    }

    const steps = instructions.map((s, i) => `${i + 1}. ${s}`).join('\n')

    try {
      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: '你是一个健身翻译助手。将以下英文训练动作说明翻译成中文。保持编号格式，每条翻译简洁准确，使用健身术语。只返回翻译后的中文文本，不要加任何解释。',
            },
            { role: 'user', content: steps },
          ],
          max_tokens: 1024,
          temperature: 0.1,
        }),
        signal: AbortSignal.timeout(15000),
      })

      if (!response.ok) {
        console.error('[Translate] DeepSeek API error:', response.status)
        return reply.send({ success: true, data: { translated: instructions } })
      }

      const data = await response.json() as { choices?: { message?: { content?: string } }[] }
      const content = data.choices?.[0]?.message?.content || ''

      // Parse translated lines back into array
      const lines = content
        .split('\n')
        .map((l: string) => l.replace(/^\d+[\.\)]\s*/, '').trim())
        .filter((l: string) => l.length > 0)

      return reply.send({
        success: true,
        data: { translated: lines.length === instructions.length ? lines : instructions },
      })
    } catch (err: any) {
      console.error('[Translate] Failed:', err?.message || err)
      return reply.send({ success: true, data: { translated: instructions } })
    }
  })

  // Proxy GIF images — ExerciseDB image endpoint requires API key, so we fetch server-side
  app.get('/api/exercises/image/:id', async (request, reply) => {
    const apiKey = process.env.EXERCISEDB_API_KEY
    if (!apiKey) {
      return reply.status(400).send({ success: false, error: 'EXERCISEDB_API_KEY not configured.' })
    }

    const { id } = request.params as { id: string }
    const resolution = (request.query as { resolution?: string }).resolution || '180'

    try {
      const response = await fetch(
        `https://exercisedb.p.rapidapi.com/image?exerciseId=${encodeURIComponent(id)}&resolution=${resolution}`,
        {
          headers: {
            'X-RapidAPI-Key': apiKey,
            'X-RapidAPI-Host': 'exercisedb.p.rapidapi.com',
          },
          signal: AbortSignal.timeout(10000),
        },
      )

      if (!response.ok) {
        return reply.status(response.status).send({ success: false, error: 'Image not found' })
      }

      const buffer = await response.arrayBuffer()
      return reply
        .header('Content-Type', 'image/gif')
        .header('Cache-Control', 'public, max-age=86400')
        .send(Buffer.from(buffer))
    } catch (err: any) {
      console.error('[ExerciseDB] Image fetch failed:', err?.message || err)
      return reply.status(500).send({ success: false, error: 'Image fetch failed' })
    }
  })
}
