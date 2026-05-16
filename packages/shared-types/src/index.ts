// ============================================================
// @ai-health/shared-types — Shared TypeScript definitions
// ============================================================

// --- Enums ---

export type Gender = 'male' | 'female' | 'other'
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
export type DietStyle = 'omnivore' | 'vegetarian' | 'vegan' | 'keto' | 'paleo' | 'mediterranean' | 'other'
export type CarbDayType = 'high' | 'medium' | 'low'
export type SleepQuality = 'poor' | 'fair' | 'good' | 'excellent'
export type RecoveryStatus = 'fully_recovered' | 'moderately_recovered' | 'fatigued' | 'severely_fatigued'
export type WeightTrend = 'losing' | 'stable' | 'gaining' | 'plateau'
export type ChatRole = 'user' | 'assistant' | 'system' | 'tool'
export type ChatProviderType = 'claude' | 'openai' | 'deepseek' | 'gemini' | 'openai_compatible'
export type STTProviderType = 'faster_whisper' | 'deepgram' | 'openai_whisper' | 'groq_whisper'
export type TTSProviderType = 'mimo_v2.5'

// --- User & Profile ---

export interface UserProfileData {
  age: number
  gender: Gender
  heightCm: number
  currentWeightKg: number
  targetWeightKg: number
  hasTrainingExperience: boolean
  weeklyTrainingDays: number
  cardioMinutesPerWeek: number
  sleepHoursPerNight: number
  dietStyle: DietStyle
  activityLevel: ActivityLevel
  // Computed by engine
  bmi?: number
  bmr?: number
  tdee?: number
  bodyFatPercentage?: number
  ffmi?: number
  obesityLevel?: string
  metabolicLevel?: string
  trainingExperience?: string
  fatLossPhase?: string
}

// --- Daily Health Data ---

export interface DailyHealthData {
  date: string // ISO date YYYY-MM-DD
  steps: number
  walkingDistanceM: number
  activeCalories: number
  exerciseMinutes: number
  sleepDurationMin: number
  sleepQuality: SleepQuality
  hrv: number
  heartRate: number
  weightKg: number
  caloriesConsumed: number
  proteinG: number
  carbsG: number
  fatG: number
  notes?: string
}

export interface MacroTotals {
  calories: number
  proteinG: number
  carbsG: number
  fatG: number
}

export interface DailyHealthSummary {
  date: string
  steps: number
  sleepDurationMin: number
  sleepQuality: SleepQuality
  weightKg: number
  caloriesConsumed: number
  caloriesBurned: number
  recoveryScore: number
  carbDayType: CarbDayType
  aiAdvice: string
  macros?: {
    consumed: MacroTotals
    planned: MacroTotals
    remaining: MacroTotals
  }
}

// --- Nutrition ---

export interface NutritionLogEntry {
  id: string
  date: string
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  foodName: string
  servingSizeG: number
  calories: number
  proteinG: number
  carbsG: number
  fatG: number
}

export interface FoodNutritionResult {
  foodName: string
  caloriesPer100g: number
  proteinPer100g: number
  carbsPer100g: number
  fatPer100g: number
}

// --- Workout ---

export interface WorkoutLogEntry {
  id: string
  date: string
  workoutType: 'strength' | 'cardio' | 'hiit' | 'flexibility' | 'other'
  durationMin: number
  caloriesBurned: number
  exercises: ExerciseEntry[]
  notes?: string
}

export interface ExerciseEntry {
  name: string
  sets: number
  reps: number
  weightKg: number
}

// --- Carbon Cycle ---

export interface FoodTemplateMeal {
  meal: string
  foods: { name: string; amount: string; note?: string }[]
}

export interface FoodTemplate {
  carbDayType: CarbDayType
  label: string
  description: string
  meals: FoodTemplateMeal[]
}

export interface CarbonCycleDay {
  date: string
  dayOfWeek: string
  carbDayType: CarbDayType
  calories: number
  proteinG: number
  carbsG: number
  fatG: number
  workoutType: string
  notes: string
}

export interface CarbonCyclePlan {
  id: string
  userId: string
  startDate: string
  endDate: string
  days: CarbonCycleDay[]
  generatedAt: string
  reason?: string
  foodTemplates?: FoodTemplate[]
}

// --- Recovery ---

export interface RecoveryAnalysis {
  score: number // 0-100
  status: RecoveryStatus
  hrvTrend: 'improving' | 'stable' | 'declining'
  sleepTrend: 'improving' | 'stable' | 'declining'
  recommendation: string
  shouldReduceTraining: boolean
  suggestedTrainingIntensity: 'normal' | 'reduced' | 'rest'
}

// --- Weight Analysis ---

export interface WeightPlateauAnalysis {
  isPlateau: boolean
  daysSinceLastChange: number
  currentTrend: WeightTrend
  avgWeeklyLoss: number
  recommendation: string
  adjustedCalories?: number
  adjustedCarbs?: number
}

// --- AI Chat ---

export interface ChatMessage {
  id: string
  role: ChatRole
  content: string
  toolCalls?: ToolCall[]
  timestamp: string
  isStreaming?: boolean
}

export interface ToolCall {
  name: string
  arguments: Record<string, unknown>
  result?: string
}

// --- Agent Tools ---

export interface ToolDefinition {
  name: string
  description: string
  parameters: Record<string, unknown>
}

// --- Health Sync (iPhone Shortcut) ---

export interface HealthSyncPayload {
  steps?: number
  walking_distance?: number
  active_calories?: number
  exercise_minutes?: number
  sleep_duration?: number
  hrv?: number
  heart_rate?: number
  weight?: number
  date?: string
}

// --- API Responses ---

export interface APIResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

export interface DashboardData {
  today: DailyHealthSummary
  carbonCyclePlan?: CarbonCyclePlan | null
  recovery: RecoveryAnalysis
  recentWeight: { date: string; weight: number }[]
  nutritionLogs?: NutritionLogEntry[]
}

export interface AnalyticsData {
  weightTrend: { date: string; value: number }[]
  sleepTrend: { date: string; value: number }[]
  calorieTrend: { date: string; value: number }[]
  stepsTrend: { date: string; value: number }[]
  recoveryTrend: { date: string; value: number }[]
}

export interface OnboardingState {
  isComplete: boolean
  currentStep: number
  answers: Partial<UserProfileData>
}

// --- Settings ---

export interface ProviderSettingsData {
  chatProvider: ChatProviderType
  chatModel: string
  sttProvider: STTProviderType
  ttsProvider: TTSProviderType
  apiKeys: Record<string, string>
  theme: 'dark' | 'light'
  language: string
}
