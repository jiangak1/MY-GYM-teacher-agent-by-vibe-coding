// ============================================================
// TTS Provider — MIMO-v2.5-tts via OpenAI-compatible chat/completions
// ============================================================

export interface TTSConfig {
  type: 'mimo_v2.5'
  apiKey?: string
  voice?: string
  baseUrl?: string
}

export async function synthesize(text: string, config: TTSConfig): Promise<Buffer> {
  switch (config.type) {
    case 'mimo_v2.5':
      return mimov25Synthesize(text, config)
    default:
      throw new Error(`Unknown TTS provider: ${config.type}`)
  }
}

async function mimov25Synthesize(text: string, config: TTSConfig): Promise<Buffer> {
  const baseUrl = config.baseUrl || process.env.MIMO_TTS_URL || 'https://api.xiaomimimo.com/v1'

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (config.apiKey) {
    headers['api-key'] = config.apiKey
  }

  const body = {
    model: 'mimo-v2.5-tts',
    messages: [
      { role: 'user', content: '用自然亲切的声音朗读以下内容' },
      { role: 'assistant', content: text },
    ],
    audio: {
      voice: config.voice || 'mimo_default',
      format: 'wav',
    },
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    throw new Error(
      `MIMO TTS server returned ${response.status}${errorText ? ': ' + errorText.slice(0, 200) : ''}. ` +
      `Endpoint: ${baseUrl}/chat/completions`,
    )
  }

  const data = (await response.json()) as {
    choices?: { message?: { audio?: { data?: string } } }[]
  }

  const audioBase64 = data.choices?.[0]?.message?.audio?.data
  if (!audioBase64) {
    throw new Error('MIMO TTS response did not contain audio data')
  }

  return Buffer.from(audioBase64, 'base64')
}
