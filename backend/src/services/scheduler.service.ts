// ============================================================
// Scheduler Service — Daily automated health tasks
// ============================================================

import cron from 'node-cron'
import prisma from '../db/client.js'
import { analyzeRecovery } from './recovery.service.js'
import { analyzeWeight } from './weight-analysis.service.js'
import { generatePlan } from './carbon-cycle.service.js'

export function startScheduler() {
  // Run every day at 9:07 AM (avoid :00 and :30 congestion)
  cron.schedule('7 9 * * *', async () => {
    console.log('[Scheduler] Running daily health analysis...')
    try {
      const users = await prisma.user.findMany({ select: { id: true } })

      for (const user of users) {
        const profile = await prisma.userProfile.findUnique({ where: { userId: user.id } })
        if (!profile?.onboardingComplete) continue

        // Daily recovery analysis
        const recovery = await analyzeRecovery(user.id)
        await prisma.aIHealthMemory.upsert({
          where: {
            userId_category_key: {
              userId: user.id,
              category: 'recovery',
              key: 'latest_analysis',
            },
          },
          create: {
            userId: user.id,
            category: 'recovery',
            key: 'latest_analysis',
            value: JSON.stringify(recovery),
          },
          update: {
            value: JSON.stringify(recovery),
            lastUpdated: new Date(),
          },
        })

        // Weekly weight analysis
        const weightAnalysis = await analyzeWeight(user.id)
        await prisma.aIHealthMemory.upsert({
          where: {
            userId_category_key: {
              userId: user.id,
              category: 'weight',
              key: 'plateau_analysis',
            },
          },
          create: {
            userId: user.id,
            category: 'weight',
            key: 'plateau_analysis',
            value: JSON.stringify(weightAnalysis),
          },
          update: {
            value: JSON.stringify(weightAnalysis),
            lastUpdated: new Date(),
          },
        })

        console.log(`[Scheduler] Analysis complete for user ${user.id}: recovery=${recovery.score}, plateau=${weightAnalysis.isPlateau}`)
      }
    } catch (error) {
      console.error('[Scheduler] Daily analysis failed:', error)
    }
  })

  // Carbon cycle regeneration — every Monday at 9:13 AM
  cron.schedule('13 9 * * 1', async () => {
    console.log('[Scheduler] Regenerating weekly carbon cycle plans...')
    try {
      const users = await prisma.user.findMany({ select: { id: true } })
      for (const user of users) {
        const profile = await prisma.userProfile.findUnique({ where: { userId: user.id } })
        if (!profile?.onboardingComplete) continue
        await generatePlan(user.id)
        console.log(`[Scheduler] Carbon cycle regenerated for user ${user.id}`)
      }
    } catch (error) {
      console.error('[Scheduler] Carbon cycle regeneration failed:', error)
    }
  })

  console.log('[Scheduler] Started — daily analysis at 9:07am, weekly carbon cycle at 9:13am Monday')
}
