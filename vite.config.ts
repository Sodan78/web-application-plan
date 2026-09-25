import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // Role queries in jsdom are slow, more so on a cloud-synced disk.
    testTimeout: 15_000,
    // The first test in a data file starts Postgres (PGlite) and runs the migrations.
    hookTimeout: 60_000,
  },
})
