// ============================================================
// Recovery Analysis Service
// ============================================================

import prisma from '../db/client.js'
import * as engine from '../engines/health-calculation.engine.js'
import type { RecoveryAnalysis } from '@ai-health/shared-types'

export async function analyzeRecovery(userId: string): Promise<RecoveryAnalysis> {
  const healthData = await prisma.dailyHealth.findMany({
    where: { userId },
    orderBy: { date: 'desc' },
    take: 7,
  })

  // Check for user-selected recovery score first
  if (healthData.length > 0 && healthData[0].recoveryScore && healthData[0].recoveryScore > 0) {
    const score = healthData[0].recoveryScore
    let status: RecoveryAnalysis['status'] = 'moderately_recovered'
    if (score >= 75) status = 'fully_recovered'
    else if (score >= 50) status = 'moderately_recovered'
    else if (score >= 30) status = 'fatigued'
    else status = 'severely_fatigued'

    const recommendations: Record<string, string> = {
      '90': '精力充沛，可以全力训练。今天适合高碳日+大重量训练。',
      '75': '状态良好，可以正常训练。保持当前节奏。',
      '55': '感觉一般，建议中等强度训练，关注睡眠质量。',
      '35': '有些疲劳，建议降低训练强度，增加休息时间。',
      '15': '极度疲劳！建议完全休息1-2天，补充碳水、保证睡眠。',
    }

    return {
      score,
      status,
      hrvTrend: 'stable',
      sleepTrend: 'stable',
      recommendation: recommendations[String(score)] || recommendations['55'],
      shouldReduceTraining: score < 50,
      suggestedTrainingIntensity: score >= 75 ? 'normal' : score >= 50 ? 'reduced' : 'rest',
    }
  }

  if (healthData.length === 0) {
    return {
      score: 50,
      status: 'moderately_recovered',
      hrvTrend: 'stable',
      sleepTrend: 'stable',
      recommendation: '暂无数据，请在上方选择你今天的身体状态。',
      shouldReduceTraining: false,
      suggestedTrainingIntensity: 'normal',
    }
  }

  const today = healthData[0]
  const score = engine.calculateRecoveryScore(
    today.hrv,
    today.sleepDurationMin / 60,
    today.sleepQuality,
    today.heartRate,
  )

  let status: RecoveryAnalysis['status'] = 'fully_recovered'
  if (score < 40) status = 'severely_fatigued'
  else if (score < 60) status = 'fatigued'
  else if (score < 75) status = 'moderately_recovered'

  // Trends
  const hrvVals = healthData.map((d) => d.hrv).filter((v) => v > 0)
  const sleepVals = healthData.map((d) => d.sleepDurationMin).filter((v) => v > 0)

  let hrvTrend: RecoveryAnalysis['hrvTrend'] = 'stable'
  if (hrvVals.length >= 3 && hrvVals[0] > hrvVals[hrvVals.length - 1] * 1.1) hrvTrend = 'improving'
  else if (hrvVals.length >= 3 && hrvVals[0] < hrvVals[hrvVals.length - 1] * 0.9) hrvTrend = 'declining'

  let sleepTrend: RecoveryAnalysis['sleepTrend'] = 'stable'
  if (sleepVals.length >= 3 && sleepVals[0] > sleepVals[sleepVals.length - 1] * 1.1) sleepTrend = 'improving'
  else if (sleepVals.length >= 3 && sleepVals[0] < sleepVals[sleepVals.length - 1] * 0.9) sleepTrend = 'declining'

  // Recommendations
  let recommendation = '恢复状态良好，可以正常训练。'
  if (score < 40) recommendation = '严重疲劳！建议完全休息1-2天，保证充足睡眠，补充碳水化合物。'
  else if (score < 60) recommendation = '恢复不足。建议降低训练强度，增加睡眠时间，关注HRV趋势。'
  else if (hrvTrend === 'declining') recommendation = 'HRV持续下降，建议增加一个恢复日，减少高强度训练。'
  else if (sleepTrend === 'declining') recommendation = '睡眠质量在下降，建议调整作息，睡前减少屏幕时间，补充镁。'

  return {
    score,
    status,
    hrvTrend,
    sleepTrend,
    recommendation,
    shouldReduceTraining: score < 50,
    suggestedTrainingIntensity: score >= 75 ? 'normal' : score >= 50 ? 'reduced' : 'rest',
  }
}
