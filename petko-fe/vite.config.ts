import { resolve } from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  if (command === 'serve' && mode === 'development' && !process.env.VERCEL) {
    // Only public VITE_* values enter the frontend process. Preserve shell and
    // frontend-local overrides, then fall back to either repo-root pull format.
    const publicEnv = {
      ...loadEnv(mode, resolve(import.meta.dirname, '../.vercel')),
      ...loadEnv(mode, resolve(import.meta.dirname, '..')),
      ...loadEnv(mode, import.meta.dirname),
    }
    for (const [key, value] of Object.entries(publicEnv)) {
      process.env[key] ??= value
    }
  }

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': `${import.meta.dirname}/src`,
      },
    },
    // Dev-only: forward same-origin /api calls to the local NestJS server
    // (`npm run start:dev` in petko-be serves under /api). Not used in builds.
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
  }
})
