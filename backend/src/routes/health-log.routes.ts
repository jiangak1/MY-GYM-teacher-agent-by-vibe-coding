import type { FastifyInstance } from 'fastify'
import prisma from '../db/client.js'
import { syncHealthData } from '../services/health-sync.service.js'
import { todayDate } from '../utils/helpers.js'

// User-selectable energy levels → recovery score mapping
const ENERGY_LEVELS: Record<string, { score: number; status: string; recommendation: string }> = {
  energetic: { score: 90, status: 'fully_recovered', recommendation: '精力充沛，可以全力训练。今天适合高碳日+大重量训练。' },
  good: { score: 75, status: 'fully_recovered', recommendation: '状态良好，可以正常训练。保持当前节奏。' },
  normal: { score: 55, status: 'moderately_recovered', recommendation: '感觉一般，建议中等强度训练，关注睡眠质量。' },
  tired: { score: 35, status: 'fatigued', recommendation: '有些疲劳，建议降低训练强度，增加休息时间。' },
  exhausted: { score: 15, status: 'severely_fatigued', recommendation: '极度疲劳！建议完全休息1-2天，补充碳水、保证睡眠。' },
}

export async function healthLogRoutes(app: FastifyInstance) {
  // Manual health data entry from Dashboard UI
  app.post<{ Body: { weightKg?: number; steps?: number; sleepDurationMin?: number; sleepQuality?: string; hrv?: number; heartRate?: number; date?: string } }>(
    '/api/health/log',
    async (request, reply) => {
      const userId = (request.headers['x-user-id'] as string) || 'default-user'
      const { weightKg, steps, sleepDurationMin, sleepQuality, hrv, heartRate, date } = request.body

      const payload = {
        steps: steps ?? 0,
        walking_distance: undefined,
        active_calories: undefined,
        exercise_minutes: undefined,
        sleep_duration: sleepDurationMin ?? 0,
        hrv: hrv ?? 0,
        heart_rate: heartRate ?? 0,
        weight: weightKg ?? 0,
        date,
      }

      const data = await syncHealthData(userId, payload)
      return reply.send({ success: true, data })
    },
  )

  // Set user-perceived recovery / energy level
  app.post('/api/health/recovery-status', async (request, reply) => {
    const userId = (request.headers['x-user-id'] as string) || 'default-user'
    const { level } = request.body as { level: string }
    const today = todayDate()

    if (!ENERGY_LEVELS[level]) {
      return reply.status(400).send({ success: false, error: 'Invalid level. Use: energetic, good, normal, tired, exhausted' })
    }

    const { score } = ENERGY_LEVELS[level]

    // Update or create today's dailyHealth with the user-selected recovery score
    const existing = await prisma.dailyHealth.findUnique({
      where: { userId_date: { userId, date: today } },
    })
    if (existing) {
      await prisma.dailyHealth.update({ where: { id: existing.id }, data: { recoveryScore: score } })
    } else {
      await prisma.dailyHealth.create({ data: { userId, date: today, recoveryScore: score } })
    }

    return reply.send({ success: true, data: ENERGY_LEVELS[level] })
  })

  // Get weight history
  app.get('/api/health/weights', async (request, reply) => {
    const userId = (request.headers['x-user-id'] as string) || 'default-user'
    const weights = await prisma.dailyHealth.findMany({
      where: { userId, weightKg: { gt: 0 } },
      orderBy: { date: 'desc' },
      take: 30,
      select: { date: true, weightKg: true },
    })
    return reply.send({ success: true, data: weights.map((w) => ({ date: w.date, weight: w.weightKg })) })
  })
}
