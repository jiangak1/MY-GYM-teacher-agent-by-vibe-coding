import type { FastifyInstance } from 'fastify'
import prisma from '../db/client.js'
import { getWeightTrend, getSleepTrend, getRecoveryTrend } from '../memory/health-memory.js'
import type { AnalyticsData } from '@ai-health/shared-types'

export async function analyticsRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { userId?: string; days?: string } }>('/api/analytics', async (request, reply) => {
    const uid = request.query.userId || 'default-user'
    const days = parseInt(request.query.days || '30', 10)

    const weightTrend = (await getWeightTrend(uid, days)).map((w) => ({ date: w.date, value: w.weight }))
    const sleepTrend = (await getSleepTrend(uid, days)).map((s) => ({ date: s.date, value: s.sleepHours }))

    const healthData = await prisma.dailyHealth.findMany({
      where: { userId: uid },
      orderBy: { date: 'asc' },
      take: days,
      select: { date: true, steps: true, activeCalories: true },
    })

    const stepsTrend = healthData.map((h) => ({ date: h.date, value: h.steps }))
    const calorieTrend = healthData.map((h) => ({ date: h.date, value: h.activeCalories }))

    const recoveryTrend = (await getRecoveryTrend(uid, days))
      .filter((r) => r.score > 0)
      .map((r) => ({ date: r.date, value: r.score }))

    return reply.send({
      success: true,
      data: { weightTrend, sleepTrend, calorieTrend, stepsTrend, recoveryTrend } satisfies AnalyticsData,
    })
  })
}
