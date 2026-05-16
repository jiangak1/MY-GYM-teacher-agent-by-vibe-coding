// ============================================================
// AI Provider Abstraction — supports Claude, OpenAI, DeepSeek, Gemini, compatible
// ============================================================

import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import type { ChatMessage, ToolDefinition } from '@ai-health/shared-types'

export interface ProviderConfig {
  type: 'claude' | 'openai' | 'deepseek' | 'gemini' | 'openai_compatible'
  model: string
  apiKey: string
  baseUrl?: string
}

export interface ChatCompletionRequest {
  messages: Pick<ChatMessage, 'role' | 'content'>[]
  tools?: ToolDefinition[]
  system?: string
  maxTokens?: number
}

export interface ChatCompletionResponse {
  content: string
  toolCalls?: { name: string; arguments: Record<string, unknown> }[]
}

export async function chatCompletion(
  config: ProviderConfig,
  request: ChatCompletionRequest,
): Promise<ChatCompletionResponse> {
  switch (config.type) {
    case 'claude':
      return claudeCompletion(config, request)
    case 'openai':
    case 'deepseek':
    case 'openai_compatible':
      return openaiCompletion(config, request)
    case 'gemini':
      return geminiCompletion(config, request)
    default:
      throw new Error(`Unknown provider: ${config.type}`)
  }
}

async function claudeCompletion(
  config: ProviderConfig,
  request: ChatCompletionRequest,
): Promise<ChatCompletionResponse> {
  const anthropic = new Anthropic({ apiKey: config.apiKey })

  const anthropicTools = request.tools?.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: {
      type: 'object' as const,
      properties: t.parameters.properties || {},
      required: t.parameters.required || [],
    },
  }))

  const msg = await anthropic.messages.create({
    model: config.model,
    max_tokens: request.maxTokens || 4096,
    system: request.system || 'You are an AI health coach. Be warm, professional, and helpful.',
    messages: request.messages.map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    })),
    tools: anthropicTools,
  })

  let content = ''
  const toolCalls: { name: string; arguments: Record<string, unknown> }[] = []

  for (const block of msg.content) {
    if (block.type === 'text') {
      content += block.text
    } else if (block.type === 'tool_use') {
      toolCalls.push({
        name: block.name,
        arguments: block.input as Record<string, unknown>,
      })
    }
  }

  return { content, toolCalls: toolCalls.length > 0 ? toolCalls : undefined }
}

async function openaiCompletion(
  config: ProviderConfig,
  request: ChatCompletionRequest,
): Promise<ChatCompletionResponse> {
  const openai = new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseUrl || (config.type === 'deepseek' ? 'https://api.deepseek.com' : undefined),
  })

  const openaiTools = request.tools?.map((t) => ({
    type: 'function' as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }))

  const completion = await openai.chat.completions.create({
    model: config.model,
    max_tokens: request.maxTokens || 4096,
    messages: [
      ...(request.system ? [{ role: 'system' as const, content: request.system }] : []),
      ...request.messages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ],
    tools: openaiTools,
  })

  const choice = completion.choices[0]
  const content = choice.message.content || ''
  const toolCalls = choice.message.tool_calls?.map((tc) => ({
    name: tc.function.name,
    arguments: JSON.parse(tc.function.arguments),
  }))

  return { content, toolCalls: toolCalls && toolCalls.length > 0 ? toolCalls : undefined }
}

async function geminiCompletion(
  _config: ProviderConfig,
  _request: ChatCompletionRequest,
): Promise<ChatCompletionResponse> {
  // Gemini via OpenAI-compatible endpoint (use openai_compatible type with Gemini base URL)
  throw new Error(
    'Gemini direct API not implemented. Use "openai_compatible" type with Gemini base URL instead.',
  )
}
