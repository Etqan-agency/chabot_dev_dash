import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Vite loads .env into import.meta.env for the app, never into process.env,
  // so the config has to read the file itself — otherwise pointing the proxy at
  // a local backend in .env is silently ignored and dev traffic goes to
  // production. A real shell variable still wins, for one-off overrides.
  const env = loadEnv(mode, process.cwd(), '')
  const target =
    process.env.VITE_API_PROXY_TARGET || env.VITE_API_PROXY_TARGET || 'https://chatbot-api.zaychain.com'

  return {
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
          target,
          changeOrigin: true,
          // A local backend is plain http; only verify certificates for https.
          secure: target.startsWith('https://'),
        },
        // Uploaded files/media resolve to same-origin /media/... paths.
        '/media': {
          target,
          changeOrigin: true,
          secure: target.startsWith('https://'),
        },
      },
    },
  }
})
