import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    hookTimeout: 15000,
    fileParallelism: false,
    setupFiles: ['varlock/auto-load'],
  },
})