import type { FastifyInstance } from 'fastify'
import prisma from '../db/client.js'
import { decrypt } from '../utils/encryption.js'

async function getMimoApiKey(userId: string): Promise<string> {
  // Priority: encrypted DB settings > .env
  try {
    const settings = await prisma.providerSettings.findUnique({ where: { userId } })
    if (settings?.encryptedApiKeys && settings.encryptedApiKeys !== '{}') {
      const keys = JSON.parse(decrypt(settings.encryptedApiKeys))
      if (keys.MIMO_TTS_API_KEY) return keys.MIMO_TTS_API_KEY
    }
  } catch { /* fall through */ }
  return process.env.MIMO_TTS_API_KEY || ''
}

export async function ttsRoutes(app: FastifyInstance) {
  app.post<{ Body: { text: string; userId?: string } }>(
    '/api/tts/synthesize',
    async (request, reply) => {
      const { text } = request.body
      const uid = request.body.userId || (request.headers['x-user-id'] as string) || 'default-user'

      if (!text || text.trim().length === 0) {
        return reply.status(400).send({ success: false, error: 'No text provided' })
      }

      const apiKey = await getMimoApiKey(uid)
      const baseUrl = process.env.MIMO_TTS_URL || 'https://api.xiaomimimo.com/v1'

      if (!apiKey) {
        return reply.status(503).send({
          success: false,
          error: 'MIMO_TTS_API_KEY not configured. Set it in Settings or .env.',
        })
      }

      try {
        const response = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': apiKey,
          },
          body: JSON.stringify({
            model: 'mimo-v2.5-tts',
            messages: [
              { role: 'user', content: '用自然亲切的声音朗读以下内容' },
              { role: 'assistant', content: text },
            ],
            audio: { voice: 'mimo_default', format: 'wav' },
          }),
          signal: AbortSignal.timeout(30000),
        })

        if (!response.ok) {
          const errorText = await response.text().catch(() => '')
          throw new Error(`MIMO TTS server responded with ${response.status}: ${errorText.slice(0, 200)}`)
        }

        const data = (await response.json()) as {
          choices?: { message?: { audio?: { data?: string } } }[]
        }

        const audioBase64 = data.choices?.[0]?.message?.audio?.data
        if (!audioBase64) {
          throw new Error('MIMO TTS response did not contain audio data')
        }

        const audioBuffer = Buffer.from(audioBase64, 'base64')

        return reply
          .header('Content-Type', 'audio/wav')
          .header('Content-Length', audioBuffer.length)
          .send(audioBuffer)
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Unknown error'
        console.error('TTS error:', msg)
        return reply.status(503).send({
          success: false,
          error: `TTS service unavailable: ${msg}`,
        })
      }
    },
  )

  // TTS status check
  app.get('/api/tts/status', async (_request, reply) => {
    const baseUrl = process.env.MIMO_TTS_URL || 'https://api.xiaomimimo.com/v1'
    const apiKey = process.env.MIMO_TTS_API_KEY || ''

    try {
      // Quick connectivity test — just check if the server responds
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': apiKey,
        },
        body: JSON.stringify({
          model: 'mimo-v2.5-tts',
          messages: [
            { role: 'user', content: 'test' },
            { role: 'assistant', content: 'ok' },
          ],
          audio: { voice: 'mimo_default', format: 'wav' },
          max_tokens: 1,
        }),
        signal: AbortSignal.timeout(10000),
      })
      // 404 or other errors are expected if API key is wrong, but server is reachable
      return reply.send({
        success: true,
        data: {
          available: response.ok || response.status === 401 || response.status === 403,
          provider: 'mimo_v2.5',
          endpoint: baseUrl,
          hasApiKey: !!apiKey,
          statusCode: response.status,
        },
      })
    } catch {
      return reply.send({
        success: true,
        data: {
          available: false,
          provider: 'mimo_v2.5',
          endpoint: baseUrl,
          hasApiKey: !!apiKey,
          hint: 'MIMO TTS server unreachable. Check MIMO_TTS_URL and network.',
        },
      })
    }
  })
}
