import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { configDefaults, defineConfig } from 'vitest/config'

// GitHub Pages serves this repo at https://66011601.github.io/GrabSpark-Champion-Repo/, so the built site needs
// that base path. `npm run dev` and the tests stay at "/". Files in public/ are reached through import.meta.env.BASE_URL.
const PAGES_BASE = '/GrabSpark-Champion-Repo/'

// Tests that gate wall-clock time. Run alongside the other files they measure the other workers too (the 100 ms index
// build took ~550 ms under `npm test` on a 16-thread machine), so they run on their own after the rest.
const TIMED = ['src/ai/understanding/load.test.ts']

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  base: command === 'build' ? PAGES_BASE : '/',
  plugins: [react(), tailwindcss()],
  // The lazy sentence bank (src/ai/understanding/bank) is data in Thai, three bytes a letter: about 550 kB raw but about
  // 105 kB gzipped, under spec D1's 150 kB. It loads only with the first sentence the rules do not understand.
  build: { chunkSizeWarningLimit: 700 },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    projects: [
      { extends: true, test: { name: 'unit', include: ['src/**/*.test.ts'], exclude: [...configDefaults.exclude, ...TIMED] } },
      // groupOrder 1: starts once every other test file has finished, so no other worker competes for the CPU.
      { extends: true, test: { name: 'timed', include: TIMED, sequence: { groupOrder: 1 } } },
    ],
  },
}))
