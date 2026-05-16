// ============================================================
// User Profile Service — Auto profile generation from conversation data
// ============================================================

import prisma from '../db/client.js'
import * as engine from '../engines/health-calculation.engine.js'
import type { UserProfileData } from '@ai-health/shared-types'

export async function getProfile(userId: string) {
  const profile = await prisma.userProfile.findUnique({ where: { userId } })
  if (!profile) return null
  return profile
}

export async function upsertProfile(userId: string, data: Partial<UserProfileData>) {
  const existing = await prisma.userProfile.findUnique({ where: { userId } })

  const merged = {
    userId,
    age: data.age ?? existing?.age ?? 30,
    gender: data.gender ?? existing?.gender ?? 'male',
    heightCm: data.heightCm ?? existing?.heightCm ?? 170,
    currentWeightKg: data.currentWeightKg ?? existing?.currentWeightKg ?? 70,
    targetWeightKg: data.targetWeightKg ?? existing?.targetWeightKg ?? 65,
    hasTrainingExperience: data.hasTrainingExperience ?? existing?.hasTrainingExperience ?? false,
    weeklyTrainingDays: data.weeklyTrainingDays ?? existing?.weeklyTrainingDays ?? 0,
    cardioMinutesPerWeek: data.cardioMinutesPerWeek ?? existing?.cardioMinutesPerWeek ?? 0,
    sleepHoursPerNight: data.sleepHoursPerNight ?? existing?.sleepHoursPerNight ?? 7,
    dietStyle: data.dietStyle ?? existing?.dietStyle ?? 'omnivore',
    activityLevel: data.activityLevel ?? existing?.activityLevel ?? 'moderate',
    onboardingComplete: existing?.onboardingComplete ?? false,
  }

  // Compute derived fields
  const bmi = engine.calculateBMI(merged.currentWeightKg, merged.heightCm)
  const bmr = engine.calculateBMR(merged.currentWeightKg, merged.heightCm, merged.age, merged.gender)
  const tdee = engine.calculateTDEE(bmr, merged.activityLevel)
  const bodyFat = engine.calculateBodyFat(bmi, merged.age, merged.gender)
  const ffmi = engine.calculateFFMI(merged.currentWeightKg, merged.heightCm, bodyFat)

  const profileData = {
    ...merged,
    bmi,
    bmr,
    tdee,
    bodyFatPercentage: bodyFat,
    ffmi,
    obesityLevel: engine.classifyBMI(bmi),
    metabolicLevel: engine.classifyBMR(bmr, merged.gender, merged.age),
    trainingExperience: engine.classifyActivity(merged.weeklyTrainingDays, merged.cardioMinutesPerWeek),
    fatLossPhase: bmi > 28 ? 'cutting_aggressive' : bmi > 24 ? 'cutting_moderate' : 'maintenance',
  }

  if (existing) {
    return prisma.userProfile.update({ where: { userId }, data: profileData })
  }
  return prisma.userProfile.create({ data: profileData })
}

export async function completeOnboarding(userId: string) {
  return prisma.userProfile.update({
    where: { userId },
    data: { onboardingComplete: true },
  })
}

export async function getOnboardingStatus(userId: string): Promise<boolean> {
  const profile = await prisma.userProfile.findUnique({ where: { userId } })
  return profile?.onboardingComplete ?? false
}
