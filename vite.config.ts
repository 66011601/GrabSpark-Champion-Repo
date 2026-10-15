import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// GitHub Pages serves this repo at https://66011601.github.io/GrabSpark-Champion-Repo/, so the built site needs
// that base path. `npm run dev` and the tests stay at "/". Files in public/ are reached through import.meta.env.BASE_URL.
const PAGES_BASE = '/GrabSpark-Champion-Repo/'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  base: command === 'build' ? PAGES_BASE : '/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
}))
