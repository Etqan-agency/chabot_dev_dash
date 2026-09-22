import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Proxy API calls to the ChatBot backend during dev to avoid CORS.
      // The backend lives at its own subdomain (no path prefix), so a request
      // to /api/v1/... is forwarded to <target>/api/v1/...
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET ?? 'https://chatbot-api.zaychain.com',
        changeOrigin: true,
        secure: true,
      },
      // Uploaded files/media resolve to same-origin /media/... paths.
      '/media': {
        target: process.env.VITE_API_PROXY_TARGET ?? 'https://chatbot-api.zaychain.com',
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
