// ============================================================
// AI Agent Tools Registry — All 10 health tools
// ============================================================

import type { ToolDefinition, CarbDayType, CarbonCycleDay } from '@ai-health/shared-types'
import prisma from '../db/client.js'
import * as engine from '../engines/health-calculation.engine.js'
import { todayDate } from '../utils/helpers.js'

export type ToolHandler = (args: Record<string, unknown>, userId: string) => Promise<string>

export const toolDefinitions: ToolDefinition[] = [
  {
    name: 'calculate_bmi',
    description: 'Calculate BMI from height and weight',
    parameters: {
      type: 'object',
      properties: {
        weightKg: { type: 'number', description: 'Weight in kg' },
        heightCm: { type: 'number', description: 'Height in cm' },
      },
      required: ['weightKg', 'heightCm'],
    },
  },
  {
    name: 'calculate_tdee',
    description: 'Calculate TDEE (daily energy expenditure) from user profile',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'analyze_recovery',
    description: 'Analyze recovery status from recent HRV, sleep, and heart rate data',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'generate_carbon_cycle',
    description: 'Generate a weekly carb cycling meal plan based on user profile and recovery',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'analyze_weight_plateau',
    description: 'Check if the user has hit a weight loss plateau and suggest adjustments',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'generate_daily_health_report',
    description: 'Generate a summary of today health metrics',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'generate_weekly_health_report',
    description: 'Generate a summary of the past 7 days health trends',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'query_food_nutrition',
    description: 'Look up nutrition info for a food item (per 100g)',
    parameters: {
      type: 'object',
      properties: {
        foodName: { type: 'string', description: 'Food name to search' },
      },
      required: ['foodName'],
    },
  },
  {
    name: 'generate_workout_plan',
    description: 'Generate a workout plan based on recovery state and carb cycle',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'generate_user_profile',
    description: 'Generate a comprehensive user health profile from stored data',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
]

export const toolHandlers: Record<string, ToolHandler> = {
  calculate_bmi: async (args) => {
    const { weightKg, heightCm } = args as { weightKg: number; heightCm: number }
    const bmi = engine.calculateBMI(weightKg, heightCm)
    const category = engine.classifyBMI(bmi)
    return JSON.stringify({ bmi, category, weightKg, heightCm })
  },

  calculate_tdee: async (_args, userId) => {
    const profile = await prisma.userProfile.findUnique({ where: { userId } })
    if (!profile) return JSON.stringify({ error: 'No user profile found. Please complete onboarding.' })
    const bmi = engine.calculateBMI(profile.currentWeightKg, profile.heightCm)
    const bmr = engine.calculateBMR(profile.currentWeightKg, profile.heightCm, profile.age, profile.gender)
    const tdee = engine.calculateTDEE(bmr, profile.activityLevel)
    const bodyFat = engine.calculateBodyFat(bmi, profile.age, profile.gender)
    return JSON.stringify({
      bmi, bmr, tdee, bodyFat,
      weightKg: profile.currentWeightKg,
      heightCm: profile.heightCm,
      age: profile.age,
      activityLevel: profile.activityLevel,
    })
  },

  analyze_recovery: async (_args, userId) => {
    const recentHealth = await prisma.dailyHealth.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      take: 7,
    })
    if (recentHealth.length === 0) return JSON.stringify({ error: 'No health data. Sync Apple Health first.' })

    const today = recentHealth[0]
    const score = engine.calculateRecoveryScore(today.hrv, today.sleepDurationMin / 60, today.sleepQuality, today.heartRate)

    let status = 'fully_recovered'
    if (score < 40) status = 'severely_fatigued'
    else if (score < 60) status = 'fatigued'
    else if (score < 75) status = 'moderately_recovered'

    const hrvVals = recentHealth.map((d) => d.hrv).filter((v) => v > 0)
    const sleepVals = recentHealth.map((d) => d.sleepDurationMin).filter((v) => v > 0)

    let hrvTrend = 'stable'
    if (hrvVals.length >= 3 && hrvVals[0] > hrvVals[hrvVals.length - 1] * 1.1) hrvTrend = 'improving'
    else if (hrvVals.length >= 3 && hrvVals[0] < hrvVals[hrvVals.length - 1] * 0.9) hrvTrend = 'declining'

    let sleepTrend = 'stable'
    if (sleepVals.length >= 3 && sleepVals[0] > sleepVals[sleepVals.length - 1] * 1.1) sleepTrend = 'improving'
    else if (sleepVals.length >= 3 && sleepVals[0] < sleepVals[sleepVals.length - 1] * 0.9) sleepTrend = 'declining'

    return JSON.stringify({
      score, status, hrvTrend, sleepTrend,
      todayHrv: today.hrv,
      todaySleep: `${(today.sleepDurationMin / 60).toFixed(1)}h`,
      shouldReduceTraining: score < 50,
      suggestedTrainingIntensity: score >= 75 ? 'normal' : score >= 50 ? 'reduced' : 'rest',
    })
  },

  generate_carbon_cycle: async (_args, userId) => {
    const profile = await prisma.userProfile.findUnique({ where: { userId } })
    if (!profile) return JSON.stringify({ error: 'No user profile found.' })

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

    const bmr = engine.calculateBMR(profile.currentWeightKg, profile.heightCm, profile.age, profile.gender)
    const tdee = engine.calculateTDEE(bmr, profile.activityLevel)
    const score = recentHealth.length > 0
      ? engine.calculateRecoveryScore(recentHealth[0].hrv, recentHealth[0].sleepDurationMin / 60, recentHealth[0].sleepQuality, recentHealth[0].heartRate)
      : 50
    const plateau = engine.detectPlateau(weights.map((w) => ({ date: w.date, weight: w.weightKg })))

    const cycle = engine.calculateCarbCycle(tdee, profile.currentWeightKg, score, profile.weeklyTrainingDays, plateau)

    // Build 7-day plan: 2 low → 2 medium → 2 high → 1 flex (medium)
    const pattern: CarbDayType[] = ['low', 'low', 'medium', 'medium', 'high', 'high', 'medium']

    const dayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
    const today = todayDate()
    const days: CarbonCycleDay[] = pattern.map((type, i) => {
      const d = new Date(today)
      d.setDate(d.getDate() + i)
      const macros = type === 'high' ? cycle.highCarb : type === 'medium' ? cycle.mediumCarb : cycle.lowCarb
      return {
        date: d.toISOString().slice(0, 10),
        dayOfWeek: dayNames[i],
        carbDayType: type,
        calories: macros.calories,
        proteinG: macros.protein,
        carbsG: macros.carbs,
        fatG: macros.fat,
        workoutType: type === 'high' ? '力量训练' : type === 'medium' ? '中等强度' : '休息/有氧',
        notes: plateau ? '平台期 — 热量缺口已加大' : '',
      }
    })

    // Save to DB so Carbon Cycle page reflects it
    await prisma.carbonCyclePlan.create({
      data: {
        userId,
        startDate: today,
        endDate: days[days.length - 1].date,
        days: JSON.stringify(days),
        reason: plateau ? 'AI生成-平台期调整' : 'AI生成-常规周期',
      },
    })

    return JSON.stringify({
      tdee, recoveryScore: score, isPlateau: plateau,
      highCarbDay: cycle.highCarb, mediumCarbDay: cycle.mediumCarb, lowCarbDay: cycle.lowCarb,
      proteinG: cycle.highCarb.protein,
      saved: true,
      message: '碳循环方案已生成并保存，可在碳循环页面查看。',
    })
  },

  analyze_weight_plateau: async (_args, userId) => {
    const weights = await prisma.dailyHealth.findMany({
      where: { userId, weightKg: { gt: 0 } },
      orderBy: { date: 'asc' },
      take: 30,
      select: { date: true, weightKg: true },
    })
    const isPlateau = engine.detectPlateau(weights.map((w) => ({ date: w.date, weight: w.weightKg })))
    const vals = weights.map((w) => w.weightKg)
    const weeklyLoss = vals.length >= 7 ? (vals[0] - vals[vals.length - 1]) / Math.floor(vals.length / 7) : 0

    return JSON.stringify({
      isPlateau,
      daysSinceLastChange: isPlateau ? 14 : 0,
      currentTrend: weeklyLoss > 0.3 ? 'losing' : weeklyLoss < -0.3 ? 'gaining' : 'stable',
      avgWeeklyLoss: +weeklyLoss.toFixed(2),
      recommendation: isPlateau
        ? '体重停滞已超过14天，建议增加热量缺口10-15%，或增加有氧运动量'
        : '体重趋势正常，保持当前方案',
    })
  },

  generate_daily_health_report: async (_args, userId) => {
    const today = todayDate()
    const health = await prisma.dailyHealth.findUnique({
      where: { userId_date: { userId, date: today } },
    })
    if (!health) return JSON.stringify({ error: 'No health data for today. Sync Apple Health first.' })

    const profile = await prisma.userProfile.findUnique({ where: { userId } })
    const bmr = profile ? engine.calculateBMR(profile.currentWeightKg, profile.heightCm, profile.age, profile.gender) : 0
    const recoveryScore = engine.calculateRecoveryScore(health.hrv, health.sleepDurationMin / 60, health.sleepQuality, health.heartRate)

    return JSON.stringify({
      date: today,
      steps: health.steps,
      activeCalories: health.activeCalories,
      exerciseMinutes: health.exerciseMinutes,
      sleepDuration: `${(health.sleepDurationMin / 60).toFixed(1)}h`,
      sleepQuality: health.sleepQuality,
      hrv: health.hrv,
      heartRate: health.heartRate,
      weightKg: health.weightKg,
      caloriesConsumed: health.caloriesConsumed,
      proteinG: health.proteinG,
      carbsG: health.carbsG,
      fatG: health.fatG,
      bmr,
      netCalories: +(health.caloriesConsumed - health.activeCalories).toFixed(0),
      recoveryScore,
    })
  },

  generate_weekly_health_report: async (_args, userId) => {
    const weekData = await prisma.dailyHealth.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      take: 7,
    })

    if (weekData.length === 0) return JSON.stringify({ error: 'No health data for this week.' })

    const avgSteps = Math.round(weekData.reduce((s, d) => s + d.steps, 0) / weekData.length)
    const avgSleep = (weekData.reduce((s, d) => s + d.sleepDurationMin, 0) / weekData.length / 60).toFixed(1)
    const avgHrv = +(weekData.reduce((s, d) => s + d.hrv, 0) / weekData.length).toFixed(1)
    const weights = weekData.filter((d) => d.weightKg > 0).map((d) => d.weightKg)
    const weightChange = weights.length >= 2 ? +(weights[0] - weights[weights.length - 1]).toFixed(1) : 0

    return JSON.stringify({
      daysTracked: weekData.length,
      avgSteps,
      avgSleep: `${avgSleep}h`,
      avgHrv,
      weightChange,
      weightTrend: weightChange < -0.3 ? 'gaining' : weightChange > 0.3 ? 'losing' : 'stable',
    })
  },

  query_food_nutrition: async (args) => {
    const { foodName } = args as { foodName: string }
    const usdaKey = process.env.USDA_API_KEY
    if (!usdaKey) {
      return JSON.stringify({
        foodName,
        estimatedCalories: 200,
        estimatedProtein: 10,
        estimatedCarbs: 20,
        estimatedFat: 8,
        note: 'USDA API key not configured. Using estimates.',
      })
    }

    try {
      const response = await fetch(
        `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${usdaKey}&query=${encodeURIComponent(foodName)}&pageSize=1`,
      )
      const data = (await response.json()) as {
        foods?: { description: string; foodNutrients?: { nutrientName: string; value: number }[] }[]
      }

      if (data.foods?.length) {
        const food = data.foods[0]
        const nutrients = food.foodNutrients || []
        const getNutrient = (name: string) => +(nutrients.find((n) => n.nutrientName?.includes(name))?.value || 0).toFixed(1)

        return JSON.stringify({
          foodName: food.description,
          caloriesPer100g: getNutrient('Energy'),
          proteinPer100g: getNutrient('Protein'),
          carbsPer100g: getNutrient('Carbohydrate'),
          fatPer100g: getNutrient('Total lipid'),
          source: 'USDA FoodData Central',
        })
      }
    } catch { /* fallthrough */ }

    return JSON.stringify({ foodName, message: 'Food not found in USDA database' })
  },

  generate_workout_plan: async (_args, userId) => {
    const profile = await prisma.userProfile.findUnique({ where: { userId } })
    if (!profile) return JSON.stringify({ error: 'No user profile found.' })

    const recentHealth = await prisma.dailyHealth.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      take: 3,
    })

    const avgRecovery = recentHealth.length > 0
      ? Math.round(
          recentHealth.reduce((s, h) => {
            return (
              s +
              engine.calculateRecoveryScore(h.hrv, h.sleepDurationMin / 60, h.sleepQuality, h.heartRate)
            )
          }, 0) / recentHealth.length,
        )
      : 50

    const isRecovered = avgRecovery >= 60
    const exercises = isRecovered
      ? [{ name: '深蹲', sets: 4, reps: 10, weightKg: 0 }, { name: '卧推', sets: 4, reps: 10, weightKg: 0 }, { name: '引体向上', sets: 3, reps: 8, weightKg: 0 }, { name: '硬拉', sets: 3, reps: 8, weightKg: 0 }, { name: '肩推', sets: 3, reps: 10, weightKg: 0 }]
      : [{ name: '瑜伽', sets: 1, reps: 1, weightKg: 0 }, { name: '泡沫轴放松', sets: 1, reps: 1, weightKg: 0 }, { name: '散步', sets: 1, reps: 1, weightKg: 0 }]

    // Save to WorkoutLog so it appears in the user's history
    await prisma.workoutLog.create({
      data: {
        userId,
        date: todayDate(),
        workoutType: isRecovered ? 'strength' : 'flexibility',
        durationMin: isRecovered ? 60 : 30,
        caloriesBurned: isRecovered ? 400 : 150,
        exercises: JSON.stringify(exercises),
        notes: isRecovered ? 'AI生成-正常训练日' : 'AI生成-恢复日',
      },
    })

    return JSON.stringify({
      recoveryScore: avgRecovery,
      isRecovered,
      recommendation: isRecovered
        ? '恢复状态良好，可以进行正常训练'
        : '恢复状态偏低，建议进行低强度训练或休息',
      exercises: exercises.map((e) => `${e.name} ${e.sets}x${e.reps}`),
      caloriesBurnedEstimate: isRecovered ? 400 : 150,
      saved: true,
      message: '训练计划已生成并保存。',
    })
  },

  generate_user_profile: async (_args, userId) => {
    const profile = await prisma.userProfile.findUnique({ where: { userId } })
    if (!profile) return JSON.stringify({ error: 'No user profile found.' })

    const bmi = engine.calculateBMI(profile.currentWeightKg, profile.heightCm)
    const bmr = engine.calculateBMR(profile.currentWeightKg, profile.heightCm, profile.age, profile.gender)
    const tdee = engine.calculateTDEE(bmr, profile.activityLevel)
    const bodyFat = engine.calculateBodyFat(bmi, profile.age, profile.gender)
    const ffmi = engine.calculateFFMI(profile.currentWeightKg, profile.heightCm, bodyFat)

    return JSON.stringify({
      age: profile.age,
      gender: profile.gender,
      heightCm: profile.heightCm,
      currentWeightKg: profile.currentWeightKg,
      targetWeightKg: profile.targetWeightKg,
      bmi,
      bmiCategory: engine.classifyBMI(bmi),
      bmr,
      tdee,
      bodyFatPercentage: bodyFat,
      ffmi,
      obesityLevel: engine.classifyBMI(bmi),
      metabolicLevel: engine.classifyBMR(bmr, profile.gender, profile.age),
      trainingExperience: engine.classifyActivity(profile.weeklyTrainingDays, profile.cardioMinutesPerWeek),
      dietStyle: profile.dietStyle,
      sleepHours: profile.sleepHoursPerNight,
    })
  },
}
