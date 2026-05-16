import type { FastifyInstance } from 'fastify'
import { getSettings, updateSettings } from '../services/settings.service.js'

export async function settingsRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { userId?: string } }>('/api/settings', async (request, reply) => {
    const uid = request.query.userId || 'default-user'
    const settings = await getSettings(uid)
    return reply.send({ success: true, data: settings })
  })

  app.put<{ Body: Record<string, unknown> & { userId?: string } }>('/api/settings', async (request, reply) => {
    const uid = request.body.userId || 'default-user'
    const { userId, ...data } = request.body
    const settings = await updateSettings(uid, data as Parameters<typeof updateSettings>[1])
    return reply.send({ success: true, data: settings })
  })
}
