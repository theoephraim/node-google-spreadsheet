import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globalSetup: 'src/test/globalSetup.ts',
    include: ['src/**/*.test.ts'],
    hookTimeout: 15000,
    fileParallelism: false,
  },
})