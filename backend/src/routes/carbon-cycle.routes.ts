import type { FastifyInstance } from 'fastify'
import { getCurrentPlan, generatePlan } from '../services/carbon-cycle.service.js'

export async function carbonCycleRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { userId?: string } }>('/api/carbon-cycle', async (request, reply) => {
    const uid = request.query.userId || 'default-user'
    let plan = await getCurrentPlan(uid)
    if (!plan) {
      plan = await generatePlan(uid)
    }
    return reply.send({ success: true, data: plan })
  })

  app.post<{ Querystring: { userId?: string } }>('/api/carbon-cycle/generate', async (request, reply) => {
    const uid = request.query.userId || 'default-user'
    const plan = await generatePlan(uid)
    return reply.send({ success: true, data: plan })
  })
}
