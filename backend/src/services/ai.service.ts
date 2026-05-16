// ============================================================
// AI Service — Orchestrates AI chat with tool calling
// ============================================================

import { chatCompletion } from '../providers/chat-provider.js'
import { toolDefinitions, toolHandlers } from '../tools/index.js'
import type { ChatMessage, ChatProviderType } from '@ai-health/shared-types'
import prisma from '../db/client.js'
import { decrypt } from '../utils/encryption.js'

const SYSTEM_PROMPT = `你是一个专业的AI私人健康教练，名叫"小安"。

你的风格：
- 温和、专业、像私人教练一样亲切
- 使用"你"来称呼用户，让人觉得你在真正关心他们
- 给出具体、可操作的建议，不是泛泛而谈
- 记住用户的健康数据，建立长期关系
- 如果用户是第一次聊天，主动引导他们完成健康评估

你的专业领域：
- 减脂与碳循环饮食方案
- 力量训练与有氧运动
- 睡眠优化与恢复管理
- 情绪陪伴与习惯养成
- 营养分析与饮食建议

碳循环方案规则：
- 当用户请求碳循环方案时，必须使用 generate_carbon_cycle 工具来生成并保存
- 碳循环模式为6天周期：2天低碳 → 2天中碳 → 2天高碳，第7天为灵活日
- 在生成方案前，先通过对话了解用户的：体重、身高、年龄、性别、运动频率
- 如果用户信息不全，使用 generate_user_profile 工具获取已有数据

重要规则：
1. 始终基于用户的真实数据给出建议（使用工具获取数据）
2. 如果用户是新用户，主动引导他们填写身高、体重、年龄、运动习惯等健康信息
3. 在给出运动或饮食建议前，先分析用户的恢复状态
4. 保持积极鼓励的态度，但也要诚实指出问题
5. 用中文回复
6. 当用户说"生成碳循环""给我方案""碳循环"等关键词时，直接调用 generate_carbon_cycle 工具`

export async function chat(
  userId: string,
  userMessage: string,
  history: ChatMessage[],
  providerOverride?: { type: ChatProviderType; model: string; apiKey: string },
) {
  // Get provider config
  const settings = await prisma.providerSettings.findUnique({ where: { userId } })
  const providerType = providerOverride?.type || (settings?.chatProvider as ChatProviderType) || 'claude'
  const model = providerOverride?.model || settings?.chatModel || 'claude-sonnet-4-6'

  // Get API key
  const apiKey = providerOverride?.apiKey || getApiKeyForProvider(providerType, settings?.encryptedApiKeys)

  if (!apiKey || apiKey === '') {
    return {
      content: `请先在设置页面配置 ${providerType} 的 API Key。在左侧菜单点击"设置"，然后填入你的 API Key 即可开始使用。`,
      toolCalls: undefined,
    }
  }

  // Build messages
  const messages: Pick<ChatMessage, 'role' | 'content'>[] = [
    ...history.slice(-20).map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: userMessage },
  ]

  try {
    // Iterative tool calling loop — keeps calling the AI until it stops requesting tools
    const allToolCalls: { name: string; arguments: Record<string, unknown> }[] = []
    let currentMessages = [...messages]
    let maxIterations = 5

    while (maxIterations-- > 0) {
      const response = await chatCompletion(
        { type: providerType, model, apiKey },
        { messages: currentMessages, tools: toolDefinitions, system: SYSTEM_PROMPT, maxTokens: 4096 },
      )

      // No tool calls — return final content
      if (!response.toolCalls || response.toolCalls.length === 0) {
        return { content: response.content, toolCalls: allToolCalls.length > 0 ? allToolCalls : undefined }
      }

      // Execute tool calls
      const toolResults: { name: string; result: string }[] = []
      for (const tc of response.toolCalls) {
        allToolCalls.push(tc)
        const handler = toolHandlers[tc.name]
        if (handler) {
          try {
            const result = await handler(tc.arguments, userId)
            toolResults.push({ name: tc.name, result })
          } catch (e) {
            toolResults.push({ name: tc.name, result: `Error: ${e}` })
          }
        }
      }

      // Append assistant message + tool results to conversation
      currentMessages = [
        ...currentMessages,
        {
          role: 'assistant' as const,
          content: response.content || '正在查询你的健康数据...',
        },
        {
          role: 'user' as const,
          content: `工具调用结果:\n${toolResults.map((t) => `${t.name}: ${t.result}`).join('\n')}`,
        },
      ]
    }

    // Fallback — should not reach here
    return { content: '抱歉，工具调用次数过多，请简化你的请求。', toolCalls: allToolCalls }
  } catch (error) {
    console.error('AI chat error:', error)
    return {
      content: '抱歉，我现在有点连接问题。请检查你的网络连接和 API Key 配置后重试。',
      toolCalls: undefined,
    }
  }
}

function getApiKeyForProvider(provider: string, encryptedKeys?: string): string {
  // Priority: encrypted DB → .env → empty
  if (encryptedKeys && encryptedKeys !== '{}') {
    try {
      const decrypted = decrypt(encryptedKeys)
      const keys = JSON.parse(decrypted)
      const keyMap: Record<string, string> = {
        claude: keys.ANTHROPIC_API_KEY || '',
        openai: keys.OPENAI_API_KEY || '',
        deepseek: keys.DEEPSEEK_API_KEY || '',
        gemini: keys.GEMINI_API_KEY || '',
      }
      if (keyMap[provider]) return keyMap[provider]
    } catch {
      // decrypt failed, fall through to env
    }
  }

  // Fallback to .env
  const envMap: Record<string, string> = {
    claude: process.env.ANTHROPIC_API_KEY || '',
    openai: process.env.OPENAI_API_KEY || '',
    deepseek: process.env.DEEPSEEK_API_KEY || '',
    gemini: process.env.GEMINI_API_KEY || '',
  }
  return envMap[provider] || ''
}
