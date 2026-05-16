import type { FastifyInstance } from 'fastify'
import { chat } from '../services/ai.service.js'
import prisma from '../db/client.js'
import type { ChatMessage } from '@ai-health/shared-types'

export async function chatRoutes(app: FastifyInstance) {
  app.post<{ Body: { message: string; history?: ChatMessage[]; userId?: string } }>(
    '/api/chat',
    async (request, reply) => {
      const { message, history, userId } = request.body
      const uid = userId || 'default-user'

      // Save user message
      await prisma.aIConversation.create({
        data: { userId: uid, role: 'user', content: message },
      })

      const response = await chat(uid, message, history || [])

      // Save assistant response
      await prisma.aIConversation.create({
        data: {
          userId: uid,
          role: 'assistant',
          content: response.content,
          toolCalls: response.toolCalls ? JSON.stringify(response.toolCalls) : null,
        },
      })

      return reply.send({ success: true, data: response })
    },
  )

  app.get<{ Querystring: { userId?: string; limit?: string } }>(
    '/api/chat/history',
    async (request, reply) => {
      const uid = request.query.userId || 'default-user'
      const limit = parseInt(request.query.limit || '50', 10)
      const messages = await prisma.aIConversation.findMany({
        where: { userId: uid },
        orderBy: { timestamp: 'desc' },
        take: limit,
      })
      return reply.send({
        success: true,
        data: messages.reverse().map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          toolCalls: m.toolCalls ? JSON.parse(m.toolCalls) : undefined,
          timestamp: m.timestamp.toISOString(),
        })),
      })
    },
  )
}
