import type { FastifyInstance } from 'fastify'
import prisma from '../db/client.js'
import { todayDate } from '../utils/helpers.js'
import { analyzeRecovery } from '../services/recovery.service.js'
import { getCurrentPlan } from '../services/carbon-cycle.service.js'
import type { DashboardData, SleepQuality, CarbDayType } from '@ai-health/shared-types'

export async function dashboardRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { userId?: string } }>('/api/dashboard', async (request, reply) => {
    const uid = request.query.userId || 'default-user'
    const today = todayDate()

    let health = await prisma.dailyHealth.findUnique({
      where: { userId_date: { userId: uid, date: today } },
    })

    const recovery = await analyzeRecovery(uid)
    const carbonCyclePlan = await getCurrentPlan(uid)

    // Get today's nutrition totals from nutrition logs
    const nutritionLogs = await prisma.nutritionLog.findMany({
      where: { userId: uid, date: today },
    })
    const consumed = nutritionLogs.reduce(
      (acc, l) => ({
        calories: acc.calories + l.calories,
        proteinG: acc.proteinG + l.proteinG,
        carbsG: acc.carbsG + l.carbsG,
        fatG: acc.fatG + l.fatG,
      }),
      { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
    )

    // Get planned macros from today's carbon cycle day
    const todayPlan = carbonCyclePlan?.days?.[0]
    const planned = {
      calories: todayPlan?.calories ?? 0,
      proteinG: todayPlan?.proteinG ?? 0,
      carbsG: todayPlan?.carbsG ?? 0,
      fatG: todayPlan?.fatG ?? 0,
    }

    const dailySummary = {
      date: today,
      steps: health?.steps ?? 0,
      sleepDurationMin: health?.sleepDurationMin ?? 0,
      sleepQuality: (health?.sleepQuality as SleepQuality) ?? 'fair',
      weightKg: health?.weightKg ?? 0,
      caloriesConsumed: consumed.calories,
      caloriesBurned: health?.activeCalories ?? 0,
      recoveryScore: recovery.score,
      carbDayType: (todayPlan?.carbDayType as CarbDayType) ?? 'medium',
      aiAdvice: recovery.recommendation,
      // Macro tracking
      macros: {
        consumed,
        planned,
        remaining: {
          calories: planned.calories - consumed.calories,
          proteinG: +(planned.proteinG - consumed.proteinG).toFixed(1),
          carbsG: +(planned.carbsG - consumed.carbsG).toFixed(1),
          fatG: +(planned.fatG - consumed.fatG).toFixed(1),
        },
      },
    }

    const recentWeights = await prisma.dailyHealth.findMany({
      where: { userId: uid, weightKg: { gt: 0 } },
      orderBy: { date: 'asc' },
      take: 30,
      select: { date: true, weightKg: true },
    })

    return reply.send({
      success: true,
      data: {
        today: dailySummary,
        carbonCyclePlan: carbonCyclePlan || undefined,
        recovery,
        recentWeight: recentWeights.map((w) => ({ date: w.date, weight: w.weightKg })),
        nutritionLogs,
      },
    })
  })
}
