// ============================================================
// Health Calculation Engine — Pure math, no dependencies
// ============================================================

export function calculateBMI(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100
  return +(weightKg / (heightM * heightM)).toFixed(1)
}

export function calculateBMR(weightKg: number, heightCm: number, age: number, gender: string): number {
  if (gender === 'female') {
    return +(655 + 9.6 * weightKg + 1.8 * heightCm - 4.7 * age).toFixed(0)
  }
  return +(66 + 13.7 * weightKg + 5 * heightCm - 6.8 * age).toFixed(0)
}

export function calculateTDEE(bmr: number, activityLevel: string): number {
  const multipliers: Record<string, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  }
  return +(bmr * (multipliers[activityLevel] || 1.55)).toFixed(0)
}

export function calculateBodyFat(bmi: number, age: number, gender: string): number {
  if (gender === 'female') {
    return +(1.2 * bmi + 0.23 * age - 5.4).toFixed(1)
  }
  return +(1.2 * bmi + 0.23 * age - 16.2).toFixed(1)
}

export function calculateFFMI(weightKg: number, heightCm: number, bodyFatPercent: number): number {
  const heightM = heightCm / 100
  const leanMass = weightKg * (1 - bodyFatPercent / 100)
  return +(leanMass / (heightM * heightM)).toFixed(1)
}

export function classifyBMI(bmi: number): string {
  if (bmi < 18.5) return 'underweight'
  if (bmi < 24) return 'normal'
  if (bmi < 28) return 'overweight'
  return 'obese'
}

export function classifyBMR(bmr: number, gender: string, age: number): string {
  const expected = gender === 'female' ? 1400 + age * 3 : 1600 + age * 5
  if (bmr > expected * 1.1) return 'high'
  if (bmr < expected * 0.9) return 'low'
  return 'normal'
}

export function classifyActivity(weeklyDays: number, cardioMin: number): string {
  const score = weeklyDays * 10 + cardioMin / 10
  if (score >= 80) return 'advanced'
  if (score >= 50) return 'intermediate'
  if (score >= 20) return 'beginner'
  return 'sedentary'
}

export function calculateRecoveryScore(
  hrv: number,
  sleepHours: number,
  sleepQuality: string,
  restingHR: number,
): number {
  let score = 50
  if (hrv > 50) score += 15
  else if (hrv > 30) score += 5
  else score -= 10

  if (sleepHours >= 8) score += 15
  else if (sleepHours >= 7) score += 10
  else if (sleepHours >= 6) score += 0
  else score -= 15

  const sqScore: Record<string, number> = { excellent: 15, good: 10, fair: 0, poor: -10 }
  score += sqScore[sleepQuality] || 0

  if (restingHR < 60) score += 5
  else if (restingHR > 80) score -= 5

  return Math.max(0, Math.min(100, score))
}

export function calculateCarbCycle(
  tdee: number,
  weightKg: number,
  recoveryScore: number,
  trainingDays: number,
  plateau: boolean,
): {
  highCarb: { protein: number; carbs: number; fat: number; calories: number }
  mediumCarb: { protein: number; carbs: number; fat: number; calories: number }
  lowCarb: { protein: number; carbs: number; fat: number; calories: number }
} {
  const protein = +(weightKg * 2.2).toFixed(0)
  const deficit = plateau ? 1.25 : 1.0 // 25% deeper deficit on plateau

  return {
    highCarb: {
      protein,
      carbs: +(weightKg * 4).toFixed(0),
      fat: +(weightKg * 0.8).toFixed(0),
      calories: +(tdee * deficit).toFixed(0),
    },
    mediumCarb: {
      protein,
      carbs: +(weightKg * 2.5).toFixed(0),
      fat: +(weightKg * 1.0).toFixed(0),
      calories: +(tdee * deficit * 0.85).toFixed(0),
    },
    lowCarb: {
      protein,
      carbs: +(weightKg * 1).toFixed(0),
      fat: +(weightKg * 1.3).toFixed(0),
      calories: +(tdee * deficit * 0.7).toFixed(0),
    },
  }
}

export function detectPlateau(weights: { date: string; weight: number }[], daysThreshold = 14): boolean {
  if (weights.length < 3) return false
  const recent = weights.slice(-3)
  const changes = recent.map((w, i) => (i === 0 ? 0 : Math.abs(w.weight - recent[i - 1].weight)))
  return changes.every((c) => c < 0.3)
}
