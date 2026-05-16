// ============================================================
// AI Health Assistant — Fastify Backend Server
// ============================================================

import 'dotenv/config'
import { existsSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import fastifyStatic from '@fastify/static'

import { healthSyncRoutes } from './routes/health-sync.routes.js'
import { chatRoutes } from './routes/chat.routes.js'
import { dashboardRoutes } from './routes/dashboard.routes.js'
import { analyticsRoutes } from './routes/analytics.routes.js'
import { carbonCycleRoutes } from './routes/carbon-cycle.routes.js'
import { profileRoutes } from './routes/profile.routes.js'
import { settingsRoutes } from './routes/settings.routes.js'
import { sttRoutes } from './routes/stt.routes.js'
import { ttsRoutes } from './routes/tts.routes.js'
import { healthLogRoutes } from './routes/health-log.routes.js'
import { nutritionRoutes } from './routes/nutrition.routes.js'
import { exerciseRoutes } from './routes/exercise.routes.js'
import { startScheduler } from './services/scheduler.service.js'
import { getOrCreateDefaultUser } from './agent/orchestrator.js'

const PORT = parseInt(process.env.PORT || '3001', 10)

async function start() {
  const app = Fastify({ logger: true })

  // Register CORS — allow any localhost port (dev) and Tauri (production)
  const corsOrigin = [
    /^https?:\/\/localhost(:\d+)?$/,
    /^https?:\/\/127\.0\.0\.1(:\d+)?$/,
    'tauri://localhost',
    'https://tauri.localhost',
  ]

  await app.register(cors, {
    origin: corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id'],
  })

  // Register routes
  await app.register(healthSyncRoutes)
  await app.register(chatRoutes)
  await app.register(dashboardRoutes)
  await app.register(analyticsRoutes)
  await app.register(carbonCycleRoutes)
  await app.register(profileRoutes)
  await app.register(settingsRoutes)
  await app.register(sttRoutes)
  await app.register(ttsRoutes)
  await app.register(healthLogRoutes)
  await app.register(nutritionRoutes)
  await app.register(exerciseRoutes)

  // Health check
  app.get('/api/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }))

  // iPhone Shortcut configuration guide
  app.get('/api/shortcut-guide', async () => ({
    name: '健康数据同步',
    instructions: `
1. 打开 iPhone 上的"快捷指令" App
2. 创建新的快捷指令
3. 添加"获取健康样本"操作，选择你要同步的数据
4. 添加"获取URL内容"操作：
   - URL: http://<你的电脑IP>:3001/health/sync
   - 方法: POST
   - 头部: Content-Type: application/json, x-user-id: default-user
   - 请求体: JSON 格式的健康数据
5. 保存并运行快捷指令
    `,
    jsonExample: {
      steps: 8500,
      walking_distance: 5.2,
      active_calories: 350,
      exercise_minutes: 45,
      sleep_duration: 420,
      hrv: 45,
      heart_rate: 68,
      weight: 78.5,
      date: '2026-05-16',
    },
  }))

  // --- Serve frontend static files (production mode) ---
  const __dirname = path.dirname(fileURLToPath(import.meta.url))
  const frontendDist = path.resolve(__dirname, '../../frontend/dist')

  if (existsSync(frontendDist)) {
    await app.register(fastifyStatic, {
      root: frontendDist,
      prefix: '/',
    })

    // SPA fallback: serve index.html for any unmatched non-API route
    app.setNotFoundHandler(async (request, reply) => {
      if (request.url.startsWith('/api/') || request.url.startsWith('/health/')) {
        return reply.status(404).send({ error: 'Not found' })
      }
      return reply.sendFile('index.html')
    })

    console.log(`  🖥️  Frontend served from: ${frontendDist}`)
  }

  // Start server
  try {
    await app.listen({ port: PORT, host: '0.0.0.0' })
    console.log(`\n  🏥 AI Health Assistant Backend running at http://localhost:${PORT}`)
    console.log(`  📊 API routes:`)
    console.log(`     GET  /api/health          — Health check`)
    console.log(`     GET  /api/dashboard       — Dashboard data`)
    console.log(`     POST /api/chat            — AI chat`)
    console.log(`     GET  /api/chat/history    — Chat history`)
    console.log(`     GET  /api/carbon-cycle    — Carb cycle plan`)
    console.log(`     GET  /api/analytics       — Health analytics`)
    console.log(`     GET  /api/profile         — User profile`)
    console.log(`     PUT  /api/profile         — Update profile`)
    console.log(`     GET  /api/settings        — Provider settings`)
    console.log(`     PUT  /api/settings        — Update settings`)
    console.log(`     POST /health/sync         — iPhone Shortcut sync`)
    console.log(`     POST /api/stt/transcribe  — Speech to text`)
    console.log(`     POST /api/tts/synthesize  — Text to speech (voice)` )
    console.log(`     POST /api/health/log     — Manual health data entry`)
    console.log(`     POST /api/nutrition/log  — Log food/macros`)
    console.log(`     GET  /api/nutrition/logs — Get daily nutrition logs`)
    console.log(`     GET  /api/exercises/search — Search exercises (ExerciseDB)`)
    console.log(`     GET  /api/tts/status      — TTS service status\n`)

    // Ensure default user exists
    const userId = await getOrCreateDefaultUser()
    console.log(`  👤 Default user ID: ${userId}`)

    // Start daily scheduler
    startScheduler()
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
