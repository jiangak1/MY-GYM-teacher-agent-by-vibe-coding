// ============================================================
// Exercise Service — Workout plan generation via ExerciseDB API
// ============================================================

import prisma from '../db/client.js'
import type { WorkoutLogEntry, ExerciseEntry } from '@ai-health/shared-types'

export async function getWorkoutPlan(userId: string, targetMuscle?: string) {
  const apiKey = process.env.EXERCISEDB_API_KEY
  if (!apiKey) {
    // Return default exercises when API key not configured
    return defaultExercises(userId)
  }

  try {
    const muscle = targetMuscle || 'chest'
    const response = await fetch(
      `https://exercisedb.p.rapidapi.com/exercises/target/${muscle}?limit=6`,
      {
        headers: {
          'X-RapidAPI-Key': apiKey,
          'X-RapidAPI-Host': 'exercisedb.p.rapidapi.com',
        },
      },
    )
    const exercises = (await response.json()) as {
      name: string; bodyPart: string; equipment: string; target: string
    }[]

    return exercises.slice(0, 6).map((e) => ({
      name: e.name,
      sets: 4,
      reps: 10,
      weightKg: 20,
      bodyPart: e.bodyPart,
      equipment: e.equipment,
    }))
  } catch (e) {
    console.error('ExerciseDB API error:', e)
    return defaultExercises(userId)
  }
}

async function defaultExercises(userId: string) {
  const profile = await prisma.userProfile.findUnique({ where: { userId } })
  const isBeginner = profile?.trainingExperience === 'beginner' || profile?.trainingExperience === 'sedentary'

  return isBeginner
    ? [
        { name: '自重深蹲', sets: 3, reps: 15, weightKg: 0, bodyPart: '腿部', equipment: '无' },
        { name: '俯卧撑', sets: 3, reps: 10, weightKg: 0, bodyPart: '胸部', equipment: '无' },
        { name: '弹力带划船', sets: 3, reps: 12, weightKg: 0, bodyPart: '背部', equipment: '弹力带' },
        { name: '平板支撑', sets: 3, reps: 1, weightKg: 0, bodyPart: '核心', equipment: '无' },
        { name: '臀桥', sets: 3, reps: 15, weightKg: 0, bodyPart: '臀部', equipment: '无' },
        { name: '开合跳', sets: 3, reps: 30, weightKg: 0, bodyPart: '全身', equipment: '无' },
      ]
    : [
        { name: '杠铃深蹲', sets: 4, reps: 8, weightKg: 60, bodyPart: '腿部', equipment: '杠铃' },
        { name: '卧推', sets: 4, reps: 8, weightKg: 50, bodyPart: '胸部', equipment: '杠铃' },
        { name: '引体向上', sets: 3, reps: 8, weightKg: 0, bodyPart: '背部', equipment: '单杠' },
        { name: '硬拉', sets: 3, reps: 6, weightKg: 80, bodyPart: '全身', equipment: '杠铃' },
        { name: '哑铃肩推', sets: 3, reps: 10, weightKg: 16, bodyPart: '肩部', equipment: '哑铃' },
        { name: '悬垂举腿', sets: 3, reps: 12, weightKg: 0, bodyPart: '核心', equipment: '单杠' },
      ]
}

export async function logWorkout(
  userId: string,
  data: { date: string; workoutType: string; durationMin: number; caloriesBurned: number; exercises: ExerciseEntry[]; notes?: string },
): Promise<WorkoutLogEntry> {
  const log = await prisma.workoutLog.create({
    data: {
      userId,
      date: data.date,
      workoutType: data.workoutType,
      durationMin: data.durationMin,
      caloriesBurned: data.caloriesBurned,
      exercises: JSON.stringify(data.exercises),
      notes: data.notes,
    },
  })

  return {
    id: log.id,
    date: log.date,
    workoutType: log.workoutType as WorkoutLogEntry['workoutType'],
    durationMin: log.durationMin,
    caloriesBurned: log.caloriesBurned,
    exercises: data.exercises,
    notes: log.notes || undefined,
  }
}
