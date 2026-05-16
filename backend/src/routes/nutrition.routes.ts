import type { FastifyInstance } from 'fastify'
import prisma from '../db/client.js'
import { todayDate } from '../utils/helpers.js'

// Chinese → English food name dictionary
const CN_EN_FOOD: Record<string, string> = {
  '鸡胸肉': 'chicken breast raw', '鸡胸': 'chicken breast raw', '鸡肉': 'chicken breast raw',
  '鸡腿': 'chicken leg', '鸡腿肉': 'chicken leg',
  '鸡蛋': 'egg whole', '鸡蛋白': 'egg white', '蛋白': 'egg white',
  '鸭蛋': 'duck egg', '猪肉': 'pork', '瘦猪肉': 'pork lean',
  '牛肉': 'beef lean', '瘦牛肉': 'beef lean', '牛排': 'beef steak',
  '羊肉': 'lamb', '三文鱼': 'salmon', '鳕鱼': 'cod', '虾': 'shrimp', '虾仁': 'shrimp',
  '金枪鱼': 'tuna', '鲈鱼': 'sea bass', '鱿鱼': 'squid', '螃蟹': 'crab',
  '猪肝': 'pork liver', '五花肉': 'pork belly', '排骨': 'pork ribs',
  '橄榄油': 'olive oil', '花生油': 'peanut oil', '黄油': 'butter', '猪油': 'lard',
  '核桃': 'walnut', '杏仁': 'almond', '腰果': 'cashew', '花生': 'peanut',
  '开心果': 'pistachio', '瓜子': 'sunflower seed', '芝麻': 'sesame seed',
  '花生酱': 'peanut butter', '牛油果': 'avocado',
  '米饭': 'rice white cooked', '白米饭': 'rice white cooked', '糙米饭': 'brown rice',
  '馒头': 'steamed bread', '面条': 'noodle', '挂面': 'noodle dry',
  '全麦面包': 'whole wheat bread', '面包': 'bread', '白面包': 'white bread',
  '燕麦': 'oat', '红薯': 'sweet potato', '紫薯': 'purple sweet potato',
  '土豆': 'potato', '玉米': 'corn', '山药': 'yam', '芋头': 'taro',
  '小米': 'millet', '黑米': 'black rice', '薏米': 'pearl barley',
  '意面': 'pasta', '荞麦面': 'buckwheat noodle', '米粉': 'rice noodle',
  '饺子': 'dumpling', '包子': 'steamed bun', '馄饨': 'wonton',
  '西兰花': 'broccoli', '菠菜': 'spinach', '生菜': 'lettuce',
  '白菜': 'chinese cabbage', '黄瓜': 'cucumber', '番茄': 'tomato', '西红柿': 'tomato',
  '胡萝卜': 'carrot', '白萝卜': 'daikon radish', '青椒': 'green pepper',
  '茄子': 'eggplant', '冬瓜': 'winter melon', '南瓜': 'pumpkin',
  '豆芽': 'bean sprout', '芹菜': 'celery', '洋葱': 'onion',
  '蘑菇': 'mushroom', '香菇': 'shiitake mushroom', '金针菇': 'enoki mushroom',
  '莲藕': 'lotus root', '秋葵': 'okra',
  '苹果': 'apple', '香蕉': 'banana', '橙子': 'orange', '葡萄': 'grape',
  '西瓜': 'watermelon', '草莓': 'strawberry', '蓝莓': 'blueberry',
  '猕猴桃': 'kiwi', '梨': 'pear', '桃子': 'peach', '芒果': 'mango',
  '菠萝': 'pineapple', '柚子': 'grapefruit', '火龙果': 'dragon fruit',
  '樱桃': 'cherry', '荔枝': 'lychee',
  '豆腐': 'tofu', '豆浆': 'soy milk', '豆腐干': 'dried tofu', '毛豆': 'edamame',
  '黄豆': 'soybean', '绿豆': 'mung bean', '红豆': 'red bean',
  '牛奶': 'milk whole', '酸奶': 'yogurt', '希腊酸奶': 'greek yogurt', '奶酪': 'cheese',
  '蛋糕': 'cake', '饼干': 'biscuit', '巧克力': 'chocolate', '蜂蜜': 'honey',
  '啤酒': 'beer', '可乐': 'cola', '果汁': 'fruit juice',
}

function hasChinese(text: string): boolean {
  return /[一-鿿]/.test(text)
}

function translateFoodName(query: string): string {
  // Direct dictionary lookup
  if (CN_EN_FOOD[query]) return CN_EN_FOOD[query]

  // Partial match
  for (const [cn, en] of Object.entries(CN_EN_FOOD)) {
    if (query.includes(cn) || cn.includes(query)) return en
  }

  // Couldn't translate — return as-is (USDA handles some simple terms like "rice")
  return query
}

// USDA food search with Chinese translation and category auto-detection
async function searchUSDA(query: string) {
  const usdaKey = process.env.USDA_API_KEY
  if (!usdaKey) {
    return { error: 'USDA_API_KEY not configured. Set it in .env to enable food search.' }
  }

  // Translate Chinese to English
  const translated = hasChinese(query) ? translateFoodName(query) : query

  try {
    const response = await fetch(
      `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${usdaKey}&query=${encodeURIComponent(translated)}&pageSize=5&dataType=Foundation,SR Legacy`,
      { signal: AbortSignal.timeout(8000) },
    )
    const data = (await response.json()) as {
      foods?: { description: string; foodNutrients?: { nutrientName: string; value: number }[]; foodCategory?: string }[]
    }

    if (!data.foods?.length) return null

    return data.foods.map((food) => {
      const nutrients = food.foodNutrients || []
      const getN = (name: string) => +(nutrients.find((n) => n.nutrientName?.includes(name))?.value || 0).toFixed(1)

      const protein = getN('Protein')
      const carbs = getN('Carbohydrate, by difference')
      const fat = getN('Total lipid (fat)')
      const calories = getN('Energy')

      // Category detection by keywords in food description/category
      const desc = (food.description + ' ' + (food.foodCategory || '')).toLowerCase()
      const isMeatEgg = /meat|beef|pork|chicken|fish|egg|seafood|lamb|turkey|duck|shrimp|crab|sausage|bacon/i.test(desc)
      const isOilNut = /oil|butter|nut|seed|almond|walnut|peanut|avocado|olive|margarine/i.test(desc)

      let category: 'meat_egg' | 'oil_nut' | 'carb' = 'carb'
      if (isMeatEgg) category = 'meat_egg'
      else if (isOilNut) category = 'oil_nut'

      // Apply rules: meat/egg → protein only, oil/nut → fat only, carb → carbs only
      return {
        name: food.description,
        category,
        caloriesPer100g: calories,
        proteinPer100g: category === 'meat_egg' ? protein : 0,
        carbsPer100g: category === 'carb' ? carbs : 0,
        fatPer100g: category === 'oil_nut' ? fat : 0,
      }
    })
  } catch (err: any) {
    console.error('[USDA] API request failed:', err?.message || err)
    return { error: `USDA API request failed: ${err?.message || 'unknown error'}` }
  }
}

export async function nutritionRoutes(app: FastifyInstance) {
  // USDA food search
  app.get('/api/nutrition/search', async (request, reply) => {
    const q = (request.query as { q?: string }).q?.trim()
    if (!q || q.length < 2) return reply.send({ success: true, data: [] })

    const result = await searchUSDA(q)
    if (!result) return reply.send({ success: true, data: [] })
    if ('error' in result) return reply.send({ success: false, error: result.error, data: [] })

    return reply.send({ success: true, data: result })
  })

  // Log a food entry
  app.post<{ Body: { mealType: string; foodName: string; servingSizeG: number; calories: number; proteinG: number; carbsG: number; fatG: number; date?: string } }>(
    '/api/nutrition/log',
    async (request, reply) => {
      const userId = (request.headers['x-user-id'] as string) || 'default-user'
      const date = request.body.date || todayDate()
      const { mealType, foodName, servingSizeG, calories, proteinG, carbsG, fatG } = request.body

      const entry = await prisma.nutritionLog.create({
        data: { userId, date, mealType, foodName, servingSizeG, calories, proteinG, carbsG, fatG },
      })

      // Update daily totals
      await updateDailyTotals(userId, date)

      return reply.send({ success: true, data: entry })
    },
  )

  // Get food logs for a date
  app.get('/api/nutrition/logs', async (request, reply) => {
    const userId = (request.headers['x-user-id'] as string) || 'default-user'
    const date = (request.query as { date?: string }).date || todayDate()

    const logs = await prisma.nutritionLog.findMany({
      where: { userId, date },
      orderBy: { createdAt: 'desc' },
    })

    const totals = logs.reduce(
      (acc, l) => ({
        calories: acc.calories + l.calories,
        proteinG: acc.proteinG + l.proteinG,
        carbsG: acc.carbsG + l.carbsG,
        fatG: acc.fatG + l.fatG,
      }),
      { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
    )

    return reply.send({ success: true, data: { logs, totals } })
  })

  // Delete a food log
  app.delete('/api/nutrition/log/:id', async (request, reply) => {
    const userId = (request.headers['x-user-id'] as string) || 'default-user'
    const { id } = request.params as { id: string }

    const existing = await prisma.nutritionLog.findFirst({ where: { id, userId } })
    if (!existing) return reply.status(404).send({ success: false, error: 'Not found' })

    await prisma.nutritionLog.delete({ where: { id } })
    await updateDailyTotals(userId, existing.date)

    return reply.send({ success: true })
  })
}

async function updateDailyTotals(userId: string, date: string) {
  const logs = await prisma.nutritionLog.findMany({ where: { userId, date } })
  const totals = logs.reduce(
    (acc, l) => ({
      caloriesConsumed: acc.caloriesConsumed + l.calories,
      proteinG: acc.proteinG + l.proteinG,
      carbsG: acc.carbsG + l.carbsG,
      fatG: acc.fatG + l.fatG,
    }),
    { caloriesConsumed: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  )

  const existing = await prisma.dailyHealth.findUnique({ where: { userId_date: { userId, date } } })
  if (existing) {
    await prisma.dailyHealth.update({ where: { id: existing.id }, data: totals })
  } else {
    await prisma.dailyHealth.create({ data: { userId, date, ...totals } })
  }
}
