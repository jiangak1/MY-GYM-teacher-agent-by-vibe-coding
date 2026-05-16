// ============================================================
// AI Agent Orchestrator — Coordinates tool use and memory access
// ============================================================

import { chat } from '../services/ai.service.js'
import { remember, recall } from '../memory/health-memory.js'
import prisma from '../db/client.js'
import type { ChatMessage } from '@ai-health/shared-types'

export interface AgentContext {
  userId: string
  conversationHistory: ChatMessage[]
}

export async function runAgent(context: AgentContext, userMessage: string) {
  // Retrieve relevant memories for context
  const relevantMemories = await recall(context.userId)
  const memoryContext = relevantMemories
    .slice(0, 10)
    .map((m) => `[记忆: ${m.category}/${m.key}] ${JSON.stringify(m.value)}`)
    .join('\n')

  // Check if user is new (no profile or onboarding not complete)
  const profile = await prisma.userProfile.findUnique({ where: { userId: context.userId } })
  const isNewUser = !profile || !profile.onboardingComplete

  // Augment system message for new users
  let augmentedMessage = userMessage
  if (isNewUser) {
    augmentedMessage = `[新用户引导模式] 用户尚未完成健康评估。请通过自然对话引导用户提供以下信息：
- 年龄、性别、身高、体重、目标体重
- 训练经验和频率
- 有氧运动情况
- 睡眠和饮食习惯

用户说: ${userMessage}`
  }

  // Add memory context if available
  if (memoryContext) {
    augmentedMessage = `[用户健康记忆]\n${memoryContext}\n\n[用户消息]\n${augmentedMessage}`
  }

  const response = await chat(context.userId, augmentedMessage, context.conversationHistory)

  // After each exchange, update relevant memories
  await remember(context.userId, 'general', 'last_interaction', {
    timestamp: new Date().toISOString(),
    topic: userMessage.slice(0, 50),
  })

  return response
}

export async function getOrCreateDefaultUser(): Promise<string> {
  let user = await prisma.user.findUnique({ where: { id: 'default-user' } })
  if (!user) {
    user = await prisma.user.create({ data: { id: 'default-user', name: 'Default User' } })
    await prisma.providerSettings.create({
      data: {
        userId: user.id,
        chatProvider: 'claude',
        chatModel: 'claude-sonnet-4-6',
        sttProvider: 'faster_whisper',
        ttsProvider: 'mimo_v2.5',
        theme: 'dark',
        language: 'zh-CN',
      },
    })
  }
  return user.id
}
