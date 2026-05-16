// ============================================================
// Weight Analysis Service — Plateau detection & trend analysis
// ============================================================

import prisma from '../db/client.js'
import * as engine from '../engines/health-calculation.engine.js'
import type { WeightPlateauAnalysis } from '@ai-health/shared-types'

export async function analyzeWeight(userId: string): Promise<WeightPlateauAnalysis & { weightTrend: { date: string; weight: number }[] }> {
  const records = await prisma.dailyHealth.findMany({
    where: { userId, weightKg: { gt: 0 } },
    orderBy: { date: 'asc' },
    take: 30,
    select: { date: true, weightKg: true },
  })

  const weights = records.map((r) => ({ date: r.date, weight: r.weightKg }))
  const isPlateau = engine.detectPlateau(weights)
  const vals = weights.map((w) => w.weight)
  const weeklyLoss = vals.length >= 7
    ? (vals[0] - vals[vals.length - 1]) / Math.max(1, Math.floor(vals.length / 7))
    : 0

  let trend: WeightPlateauAnalysis['currentTrend'] = 'stable'
  if (weeklyLoss > 0.3) trend = 'losing'
  else if (weeklyLoss < -0.3) trend = 'gaining'
  else if (isPlateau) trend = 'plateau'

  let recommendation = '体重趋势正常，保持当前方案。'
  let adjustedCalories: number | undefined
  let adjustedCarbs: number | undefined

  if (isPlateau) {
    recommendation = '检测到体重平台期（超过14天无明显变化）。建议：1) 增加热量缺口至25%；2) 增加有氧至每周180分钟；3) 减少低碳日碳水20g；4) 确保每日饮水3L+。'
    const profile = await prisma.userProfile.findUnique({ where: { userId } })
    if (profile) {
      const bmr = engine.calculateBMR(profile.currentWeightKg, profile.heightCm, profile.age, profile.gender)
      const tdee = engine.calculateTDEE(bmr, profile.activityLevel)
      adjustedCalories = +(tdee * 0.75).toFixed(0)
      adjustedCarbs = +(profile.currentWeightKg * 0.8).toFixed(0)
    }
  } else if (trend === 'gaining') {
    recommendation = '体重在上升，建议重新评估热量摄入和运动量。'
  }

  return {
    isPlateau,
    daysSinceLastChange: isPlateau ? 14 : 0,
    currentTrend: trend,
    avgWeeklyLoss: +weeklyLoss.toFixed(2),
    recommendation,
    adjustedCalories,
    adjustedCarbs,
    weightTrend: weights,
  }
}
