import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['db/**/*.test.ts', 'features/**/*.test.ts', 'notifications/**/*.test.ts'],
  },
});
