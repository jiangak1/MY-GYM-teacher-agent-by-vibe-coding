import { create } from 'zustand'
import type { ChatMessage, ToolCall } from '@ai-health/shared-types'
import { apiPost, apiGet } from '../api/client'

interface ChatState {
  messages: ChatMessage[]
  isStreaming: boolean
  isLoading: boolean
  sendMessage: (content: string) => Promise<void>
  loadHistory: () => Promise<void>
  clearMessages: () => void
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isStreaming: false,
  isLoading: false,

  sendMessage: async (content: string) => {
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    }

    set((s) => ({
      messages: [...s.messages, userMsg],
      isLoading: true,
    }))

    try {
      const response = await apiPost<{ content: string; toolCalls?: unknown[] }>('/chat', {
        message: content,
        history: get().messages.slice(-20),
      })

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: response.content,
        toolCalls: response.toolCalls as ToolCall[] | undefined,
        timestamp: new Date().toISOString(),
      }

      set((s) => ({
        messages: [...s.messages, aiMsg],
        isLoading: false,
      }))
    } catch {
      set((s) => ({
        messages: [
          ...s.messages,
          {
            id: `ai-error-${Date.now()}`,
            role: 'assistant',
            content: '抱歉，连接出现问题。请确认后端服务已启动。',
            timestamp: new Date().toISOString(),
          },
        ],
        isLoading: false,
      }))
    }
  },

  loadHistory: async () => {
    try {
      const history = await apiGet<ChatMessage[]>('/chat/history', { limit: '50' })
      if (history && history.length > 0) {
        set({ messages: history })
      }
    } catch { /* no history yet */ }
  },

  clearMessages: () => set({ messages: [] }),
}))
