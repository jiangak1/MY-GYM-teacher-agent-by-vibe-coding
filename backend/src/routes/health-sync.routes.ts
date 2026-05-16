import type { FastifyInstance } from 'fastify'
import { syncHealthData } from '../services/health-sync.service.js'
import type { HealthSyncPayload, APIResponse } from '@ai-health/shared-types'

export async function healthSyncRoutes(app: FastifyInstance) {
  // iPhone Shortcut sync endpoint
  app.post<{ Body: HealthSyncPayload }>('/health/sync', async (request, reply) => {
    const userId = (request.headers['x-user-id'] as string) || 'default-user'
    const data = await syncHealthData(userId, request.body)
    return reply.send({ success: true, data } satisfies APIResponse)
  })

  // Manual sync with user ID param
  app.post<{ Params: { userId: string }; Body: HealthSyncPayload }>('/api/health/sync/:userId', async (request, reply) => {
    const data = await syncHealthData(request.params.userId, request.body)
    return reply.send({ success: true, data } satisfies APIResponse)
  })
}
