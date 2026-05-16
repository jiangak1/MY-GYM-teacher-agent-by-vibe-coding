import { create } from 'zustand'
import type { DashboardData, DailyHealthSummary, RecoveryAnalysis, CarbonCyclePlan, AnalyticsData } from '@ai-health/shared-types'
import { apiGet } from '../api/client'

interface HealthState {
  dashboard: DashboardData | null
  analytics: AnalyticsData | null
  isLoading: boolean
  fetchDashboard: () => Promise<void>
  fetchAnalytics: (days?: number) => Promise<void>
}

export const useHealthStore = create<HealthState>((set) => ({
  dashboard: null,
  analytics: null,
  isLoading: false,

  fetchDashboard: async () => {
    set({ isLoading: true })
    try {
      const data = await apiGet<DashboardData>('/dashboard')
      set({ dashboard: data, isLoading: false })
    } catch {
      set({ isLoading: false })
    }
  },

  fetchAnalytics: async (days = 30) => {
    try {
      const data = await apiGet<AnalyticsData>('/analytics', { days: String(days) })
      set({ analytics: data })
    } catch { /* ignore */ }
  },
}))
