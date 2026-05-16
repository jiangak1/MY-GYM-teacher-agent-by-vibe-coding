// ============================================================
// Carbon Cycle Service — Weekly carb cycling plan management
// ============================================================

import prisma from '../db/client.js'
import * as engine from '../engines/health-calculation.engine.js'
import { todayDate } from '../utils/helpers.js'
import type { CarbonCycleDay, CarbDayType, FoodTemplate } from '@ai-health/shared-types'

const FOOD_TEMPLATES: FoodTemplate[] = [
  {
    carbDayType: 'high',
    label: '高碳日 · 训练日',
    description: '碳水充足，为力量训练提供能量。蛋白质保持高水平，脂肪控制在低位。',
    meals: [
      { meal: '早餐 (7:30)', foods: [
        { name: '燕麦', amount: '60g', note: '慢碳来源' },
        { name: '鸡蛋白', amount: '4个', note: '低脂蛋白质' },
        { name: '香蕉', amount: '1根', note: '训练前快碳' },
        { name: '全脂牛奶', amount: '200ml' },
      ]},
      { meal: '午餐 (12:00)', foods: [
        { name: '糙米饭', amount: '200g', note: '慢碳主食' },
        { name: '鸡胸肉', amount: '180g', note: '高蛋白低脂' },
        { name: '西兰花', amount: '200g' },
        { name: '橄榄油', amount: '5g', note: '健康脂肪' },
      ]},
      { meal: '加餐 (15:30)', foods: [
        { name: '红薯', amount: '150g', note: '补充碳水' },
        { name: '希腊酸奶', amount: '150g' },
      ]},
      { meal: '晚餐 (18:30)', foods: [
        { name: '白米饭', amount: '150g' },
        { name: '瘦牛肉', amount: '150g' },
        { name: '菠菜', amount: '200g' },
        { name: '番茄', amount: '1个' },
      ]},
    ],
  },
  {
    carbDayType: 'medium',
    label: '中碳日 · 维持日',
    description: '碳水适量，维持代谢平衡。适合中等强度训练或日常活动。',
    meals: [
      { meal: '早餐 (7:30)', foods: [
        { name: '全麦面包', amount: '2片' },
        { name: '鸡蛋', amount: '2个' },
        { name: '牛油果', amount: '半个' },
      ]},
      { meal: '午餐 (12:00)', foods: [
        { name: '糙米饭', amount: '120g' },
        { name: '三文鱼', amount: '150g', note: '优质蛋白+Omega3' },
        { name: '西兰花', amount: '200g' },
      ]},
      { meal: '加餐 (15:30)', foods: [
        { name: '苹果', amount: '1个' },
        { name: '杏仁', amount: '15g' },
      ]},
      { meal: '晚餐 (18:30)', foods: [
        { name: '红薯', amount: '120g' },
        { name: '虾仁', amount: '150g' },
        { name: '生菜沙拉', amount: '200g' },
        { name: '橄榄油', amount: '5g' },
      ]},
    ],
  },
  {
    carbDayType: 'low',
    label: '低碳日 · 休息日',
    description: '极低碳水，迫使身体进入燃脂模式。配合低强度有氧或完全休息。',
    meals: [
      { meal: '早餐 (7:30)', foods: [
        { name: '鸡蛋', amount: '3个' },
        { name: '牛油果', amount: '1个', note: '健康脂肪+饱腹感' },
        { name: '培根/瘦火腿', amount: '30g' },
      ]},
      { meal: '午餐 (12:00)', foods: [
        { name: '鸡胸肉', amount: '200g' },
        { name: '菠菜', amount: '250g', note: '大量绿叶菜' },
        { name: '蘑菇', amount: '100g' },
        { name: '橄榄油', amount: '10g' },
        { name: '核桃', amount: '15g' },
      ]},
      { meal: '加餐 (15:30)', foods: [
        { name: '希腊酸奶', amount: '150g' },
        { name: '杏仁', amount: '15g' },
      ]},
      { meal: '晚餐 (18:30)', foods: [
        { name: '三文鱼/鳕鱼', amount: '180g' },
        { name: '西兰花', amount: '250g' },
        { name: '芝麻油', amount: '5g' },
        { name: '黄瓜', amount: '1根' },
      ]},
    ],
  },
]

export async function getCurrentPlan(userId: string) {
  const plan = await prisma.carbonCyclePlan.findFirst({
    where: { userId },
    orderBy: { generatedAt: 'desc' },
  })

  if (plan) {
    return { ...plan, days: JSON.parse(plan.days) as CarbonCycleDay[], foodTemplates: FOOD_TEMPLATES }
  }
  return null
}

export async function generatePlan(userId: string) {
  const profile = await prisma.userProfile.findUnique({ where: { userId } })
  if (!profile) throw new Error('User profile not found')

  const bmr = engine.calculateBMR(profile.currentWeightKg, profile.heightCm, profile.age, profile.gender)
  const tdee = engine.calculateTDEE(bmr, profile.activityLevel)

  const recentHealth = await prisma.dailyHealth.findMany({
    where: { userId },
    orderBy: { date: 'desc' },
    take: 7,
  })

  const weights = await prisma.dailyHealth.findMany({
    where: { userId, weightKg: { gt: 0 } },
    orderBy: { date: 'asc' },
    take: 30,
    select: { date: true, weightKg: true },
  })

  const score = recentHealth.length > 0
    ? engine.calculateRecoveryScore(
        recentHealth[0].hrv,
        recentHealth[0].sleepDurationMin / 60,
        recentHealth[0].sleepQuality,
        recentHealth[0].heartRate,
      )
    : 50

  const isPlateau = engine.detectPlateau(weights.map((w) => ({ date: w.date, weight: w.weightKg })))
  const cycle = engine.calculateCarbCycle(tdee, profile.currentWeightKg, score, profile.weeklyTrainingDays, isPlateau)

  // Generate 7-day plan: 2 low → 2 medium → 2 high → 1 flex
  const pattern: CarbDayType[] = ['low', 'low', 'medium', 'medium', 'high', 'high', 'medium']

  const dayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
  const today = todayDate()
  const days: CarbonCycleDay[] = pattern.map((type, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() + i)
    const macros =
      type === 'high' ? cycle.highCarb : type === 'medium' ? cycle.mediumCarb : cycle.lowCarb
    return {
      date: d.toISOString().slice(0, 10),
      dayOfWeek: dayNames[i],
      carbDayType: type,
      calories: macros.calories,
      proteinG: macros.protein,
      carbsG: macros.carbs,
      fatG: macros.fat,
      workoutType: type === 'high' ? '力量训练' : type === 'medium' ? '中等强度' : '休息/有氧',
      notes: isPlateau ? '平台期 — 热量缺口已加大' : '',
    }
  })

  const endDate = days[days.length - 1].date

  const plan = await prisma.carbonCyclePlan.create({
    data: {
      userId,
      startDate: today,
      endDate,
      days: JSON.stringify(days),
      reason: isPlateau ? '平台期调整' : '常规周期',
    },
  })

  return { ...plan, days, foodTemplates: FOOD_TEMPLATES }
}
