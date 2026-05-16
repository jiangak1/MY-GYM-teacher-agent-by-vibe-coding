// ============================================================
// Health Memory System — Long-term AI memory layer
// ============================================================

import prisma from '../db/client.js'

export type MemoryCategory = 'sleep' | 'training' | 'nutrition' | 'recovery' | 'weight' | 'general'

export async function remember(
  userId: string,
  category: MemoryCategory,
  key: string,
  value: unknown,
  confidence = 1.0,
) {
  return prisma.aIHealthMemory.upsert({
    where: { userId_category_key: { userId, category, key } },
    create: {
      userId,
      category,
      key,
      value: JSON.stringify(value),
      confidence,
    },
    update: {
      value: JSON.stringify(value),
      confidence,
      lastUpdated: new Date(),
    },
  })
}

export async function recall(userId: string, category?: MemoryCategory, key?: string) {
  const where: Record<string, unknown> = { userId }
  if (category) where.category = category
  if (key) where.key = key

  const memories = await prisma.aIHealthMemory.findMany({
    where,
    orderBy: { lastUpdated: 'desc' },
  })

  return memories.map((m) => ({
    ...m,
    value: JSON.parse(m.value),
  }))
}

export async function forget(userId: string, category: MemoryCategory, key: string) {
  return prisma.aIHealthMemory.deleteMany({ where: { userId, category, key } })
}

// Trend analysis helpers
export async function getWeightTrend(userId: string, days = 30) {
  const healthData = await prisma.dailyHealth.findMany({
    where: { userId, weightKg: { gt: 0 } },
    orderBy: { date: 'asc' },
    take: days,
    select: { date: true, weightKg: true },
  })
  return healthData.map((d) => ({ date: d.date, weight: d.weightKg }))
}

export async function getSleepTrend(userId: string, days = 30) {
  const healthData = await prisma.dailyHealth.findMany({
    where: { userId, sleepDurationMin: { gt: 0 } },
    orderBy: { date: 'asc' },
    take: days,
    select: { date: true, sleepDurationMin: true, sleepQuality: true },
  })
  return healthData.map((d) => ({ date: d.date, sleepHours: +(d.sleepDurationMin / 60).toFixed(1), quality: d.sleepQuality }))
}

export async function getRecoveryTrend(userId: string, days = 30) {
  const healthData = await prisma.dailyHealth.findMany({
    where: { userId },
    orderBy: { date: 'asc' },
    take: days,
    select: { date: true, hrv: true, heartRate: true, sleepDurationMin: true, sleepQuality: true },
  })
  const engines = await import('../engines/health-calculation.engine.js')
  return healthData.map((d) => ({
    date: d.date,
    score: engines.calculateRecoveryScore(d.hrv, d.sleepDurationMin / 60, d.sleepQuality, d.heartRate),
  }))
}
