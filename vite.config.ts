/// <reference types="vitest" />
/// <reference types="vite/client" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Default to the GitHub/GitLab project page sub-path; override with
// VITE_BASE_PATH (e.g. '/' for a custom apex domain or local-host serve).
const BASE_PATH = process.env.VITE_BASE_PATH ?? '/Flow-OS/';

export default defineConfig(({ mode }) => ({
  // dev (mode=development) keeps base='/' for ergonomics;
  // build & preview (mode=production) use the project sub-path
  base: mode === 'production' ? BASE_PATH : '/',
  plugins: [react()],
  server: { port: 3000 },
  preview: { port: 3000 },
  build: {
    sourcemap: 'hidden',
    target: 'es2020',
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    css: false,
    exclude: ['node_modules', 'dist', 'e2e'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'cobertura', 'html'],
      reportsDirectory: 'coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/main.tsx', 'src/**/*.d.ts'],
    },
  },
}));
