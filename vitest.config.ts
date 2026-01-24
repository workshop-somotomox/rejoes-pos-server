import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    reporters: ['json'],
    outputFile: 'test/results.json',
    setupFiles: ['./test/setup.ts'],
    testTimeout: 30000,
  },
})
