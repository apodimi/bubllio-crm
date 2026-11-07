import { defineConfig } from 'vitest/config'
export default defineConfig({
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    env: { VITE_SUITE_REQUIRED: 'false' },
  },
})
