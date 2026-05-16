// ============================================================
// Health Sync Service — Receives iPhone Shortcut data, normalizes, stores
// ============================================================

import prisma from '../db/client.js'
import { todayDate } from '../utils/helpers.js'
import type { HealthSyncPayload } from '@ai-health/shared-types'

export async function syncHealthData(userId: string, payload: HealthSyncPayload) {
  const date = payload.date || todayDate()

  const existing = await prisma.dailyHealth.findUnique({
    where: { userId_date: { userId, date } },
  })

  const data = {
    userId,
    date,
    steps: payload.steps ?? existing?.steps ?? 0,
    walkingDistanceM: payload.walking_distance ?? existing?.walkingDistanceM ?? 0,
    activeCalories: payload.active_calories ?? existing?.activeCalories ?? 0,
    exerciseMinutes: payload.exercise_minutes ?? existing?.exerciseMinutes ?? 0,
    sleepDurationMin: payload.sleep_duration ?? existing?.sleepDurationMin ?? 0,
    hrv: payload.hrv ?? existing?.hrv ?? 0,
    heartRate: payload.heart_rate ?? existing?.heartRate ?? 0,
    weightKg: payload.weight ?? existing?.weightKg ?? 0,
    sleepQuality: existing?.sleepQuality ?? 'fair',
    caloriesConsumed: existing?.caloriesConsumed ?? 0,
    proteinG: existing?.proteinG ?? 0,
    carbsG: existing?.carbsG ?? 0,
    fatG: existing?.fatG ?? 0,
  }

  if (existing) {
    await prisma.dailyHealth.update({ where: { id: existing.id }, data })
  } else {
    await prisma.dailyHealth.create({ data: { ...data, sleepQuality: data.sleepQuality } })
  }

  // Update AI Health Memory
  await updateHealthMemory(userId, data)

  return data
}

async function updateHealthMemory(
  userId: string,
  data: {
    date: string
    steps: number
    hrv: number
    sleepDurationMin: number
    weightKg: number
    heartRate: number
  },
) {
  const memories = [
    { category: 'sleep', key: 'latest_duration', value: JSON.stringify({ value: data.sleepDurationMin, date: data.date }) },
    { category: 'sleep', key: 'sleep_duration_history', value: JSON.stringify({ value: data.sleepDurationMin, date: data.date }) },
    { category: 'recovery', key: 'latest_hrv', value: JSON.stringify({ value: data.hrv, date: data.date }) },
    { category: 'recovery', key: 'latest_hr', value: JSON.stringify({ value: data.heartRate, date: data.date }) },
    { category: 'weight', key: 'latest_weight', value: JSON.stringify({ value: data.weightKg, date: data.date }) },
  ]

  for (const m of memories) {
    const existing = await prisma.aIHealthMemory.findUnique({
      where: { userId_category_key: { userId, category: m.category, key: m.key } },
    })
    if (existing) {
      await prisma.aIHealthMemory.update({ where: { id: existing.id }, data: { value: m.value, lastUpdated: new Date() } })
    } else {
      await prisma.aIHealthMemory.create({ data: { userId, ...m } })
    }
  }
}
