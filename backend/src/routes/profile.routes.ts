import type { FastifyInstance } from 'fastify'
import { getProfile, upsertProfile, completeOnboarding } from '../services/user-profile.service.js'
import type { UserProfileData } from '@ai-health/shared-types'

export async function profileRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { userId?: string } }>('/api/profile', async (request, reply) => {
    const uid = request.query.userId || 'default-user'
    const profile = await getProfile(uid)
    return reply.send({ success: true, data: profile })
  })

  app.put<{ Body: Partial<UserProfileData> & { userId?: string } }>('/api/profile', async (request, reply) => {
    const uid = request.body.userId || 'default-user'
    const profile = await upsertProfile(uid, request.body)
    return reply.send({ success: true, data: profile })
  })

  app.post<{ Querystring: { userId?: string } }>('/api/profile/onboarding/complete', async (request, reply) => {
    const uid = request.query.userId || 'default-user'
    await completeOnboarding(uid)
    return reply.send({ success: true })
  })
}
