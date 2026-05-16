import { create } from 'zustand'
import type { ProviderSettingsData } from '@ai-health/shared-types'
import { apiGet, apiPut } from '../api/client'

interface SettingsState {
  settings: ProviderSettingsData | null
  isLoading: boolean
  fetchSettings: () => Promise<void>
  updateSettings: (data: Partial<ProviderSettingsData>) => Promise<void>
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: null,
  isLoading: false,

  fetchSettings: async () => {
    set({ isLoading: true })
    try {
      const data = await apiGet<ProviderSettingsData>('/settings')
      set({ settings: data, isLoading: false })
    } catch {
      set({ isLoading: false })
    }
  },

  updateSettings: async (data) => {
    await apiPut('/settings', data)
    set((s) => ({
      settings: s.settings ? { ...s.settings, ...data } : null,
    }))
  },
}))
