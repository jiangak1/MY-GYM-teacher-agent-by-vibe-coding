// ============================================================
// Settings Service — Encrypted API key storage
// ============================================================

import prisma from '../db/client.js'
import { encrypt, decrypt } from '../utils/encryption.js'

export async function getSettings(userId: string) {
  let settings = await prisma.providerSettings.findUnique({ where: { userId } })
  if (!settings) {
    settings = await prisma.providerSettings.create({
      data: {
        userId,
        chatProvider: 'claude',
        chatModel: 'claude-sonnet-4-6',
        sttProvider: 'faster_whisper',
        ttsProvider: 'mimo_v2.5',
        theme: 'dark',
        language: 'zh-CN',
      },
    })
  }

  let apiKeys: Record<string, string> = {}
  try {
    if (settings.encryptedApiKeys && settings.encryptedApiKeys !== '{}') {
      const decrypted = decrypt(settings.encryptedApiKeys)
      apiKeys = JSON.parse(decrypted)
    }
  } catch {
    apiKeys = {}
  }

  return {
    id: settings.id,
    chatProvider: settings.chatProvider,
    chatModel: settings.chatModel,
    sttProvider: settings.sttProvider,
    ttsProvider: settings.ttsProvider,
    theme: settings.theme,
    language: settings.language,
    apiKeys: Object.keys(apiKeys).reduce((acc, k) => {
      acc[k] = apiKeys[k] ? '••••••••' : ''
      return acc
    }, {} as Record<string, string>),
  }
}

export async function updateSettings(userId: string, data: {
  chatProvider?: string
  chatModel?: string
  sttProvider?: string
  ttsProvider?: string
  theme?: string
  language?: string
  apiKeys?: Record<string, string>
}) {
  let encryptedApiKeys: string | undefined
  if (data.apiKeys) {
    // Merge with existing keys
    const existing = await prisma.providerSettings.findUnique({ where: { userId } })
    let currentKeys: Record<string, string> = {}
    try {
      if (existing?.encryptedApiKeys && existing.encryptedApiKeys !== '{}') {
        currentKeys = JSON.parse(decrypt(existing.encryptedApiKeys))
      }
    } catch { /* ignore */ }

    // Merge — only overwrite non-masked values
    for (const [k, v] of Object.entries(data.apiKeys)) {
      if (v && v !== '••••••••') {
        currentKeys[k] = v
      }
    }

    encryptedApiKeys = encrypt(JSON.stringify(currentKeys))
  }

  const updateData: Record<string, unknown> = {}
  if (data.chatProvider !== undefined) updateData.chatProvider = data.chatProvider
  if (data.chatModel !== undefined) updateData.chatModel = data.chatModel
  if (data.sttProvider !== undefined) updateData.sttProvider = data.sttProvider
  if (data.ttsProvider !== undefined) updateData.ttsProvider = data.ttsProvider
  if (data.theme !== undefined) updateData.theme = data.theme
  if (data.language !== undefined) updateData.language = data.language
  if (encryptedApiKeys !== undefined) updateData.encryptedApiKeys = encryptedApiKeys

  return prisma.providerSettings.update({ where: { userId }, data: updateData })
}
