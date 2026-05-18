import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    // Mirror the tsconfig `@/*` alias so tests can import from `@/lib/*`.
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts', 'tests/**/*.test.ts'],
    // The solver pulls in the full pruned dataset at run time; give it room.
    testTimeout: 15_000,
  },
});
