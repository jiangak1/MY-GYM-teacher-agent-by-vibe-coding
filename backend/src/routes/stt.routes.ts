import type { FastifyInstance } from 'fastify'
import { transcribe } from '../providers/stt-provider.js'
import prisma from '../db/client.js'

export async function sttRoutes(app: FastifyInstance) {
  app.post<{ Querystring: { userId?: string } }>('/api/stt/transcribe', async (request, reply) => {
    const uid = request.query.userId || 'default-user'

    // Get STT config from user settings
    const settings = await prisma.providerSettings.findUnique({ where: { userId: uid } })
    const sttType = (settings?.sttProvider as 'faster_whisper' | 'deepgram' | 'openai_whisper' | 'groq_whisper') || 'faster_whisper'

    // For simplicity, expect audio as raw body buffer
    const audioBuffer = request.body as Buffer
    const result = await transcribe(audioBuffer, { type: sttType, language: 'zh' })

    return reply.send({ success: true, data: result })
  })
}
