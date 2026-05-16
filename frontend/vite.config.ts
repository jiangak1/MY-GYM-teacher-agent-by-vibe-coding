import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const BACKEND_URL = process.env.VITE_BACKEND_URL || 'http://localhost:3001'
const FRONTEND_PORT = parseInt(process.env.VITE_PORT || '5173', 10)

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: FRONTEND_PORT,
    proxy: {
      '/api': {
        target: BACKEND_URL,
        changeOrigin: true,
      },
      '/health': {
        target: BACKEND_URL,
        changeOrigin: true,
      },
    },
  },
})
