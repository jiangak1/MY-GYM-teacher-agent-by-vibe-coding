// ============================================================
// Nutrition Service — USDA FoodData Central integration
// ============================================================

import prisma from '../db/client.js'
import type { NutritionLogEntry, FoodNutritionResult } from '@ai-health/shared-types'

export async function searchFood(query: string): Promise<FoodNutritionResult | null> {
  const usdaKey = process.env.USDA_API_KEY
  if (!usdaKey) return null

  try {
    const response = await fetch(
      `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${usdaKey}&query=${encodeURIComponent(query)}&pageSize=1`,
    )
    const data = (await response.json()) as {
      foods?: { description: string; foodNutrients?: { nutrientName: string; value: number }[] }[]
    }

    if (data.foods?.length) {
      const food = data.foods[0]
      const nutrients = food.foodNutrients || []
      const getNutrient = (name: string) =>
        +(nutrients.find((n) => n.nutrientName?.includes(name))?.value || 0).toFixed(1)

      return {
        foodName: food.description,
        caloriesPer100g: getNutrient('Energy'),
        proteinPer100g: getNutrient('Protein'),
        carbsPer100g: getNutrient('Carbohydrate'),
        fatPer100g: getNutrient('Total lipid'),
      }
    }
  } catch (e) {
    console.error('USDA API error:', e)
  }
  return null
}

export async function logNutrition(userId: string, entry: Omit<NutritionLogEntry, 'id'>) {
  return prisma.nutritionLog.create({
    data: {
      userId,
      date: entry.date,
      mealType: entry.mealType,
      foodName: entry.foodName,
      servingSizeG: entry.servingSizeG,
      calories: entry.calories,
      proteinG: entry.proteinG,
      carbsG: entry.carbsG,
      fatG: entry.fatG,
    },
  })
}

export async function getTodayNutrition(userId: string, date: string) {
  return prisma.nutritionLog.findMany({
    where: { userId, date },
    orderBy: { createdAt: 'desc' },
  })
}
