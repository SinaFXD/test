/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * GitHub Pages serves project sites from /<repo>/. We derive the base from
 * GITHUB_REPOSITORY in CI so renaming the repo needs no code change.
 * VITE_BASE overrides everything (e.g. VITE_BASE=/ for a custom domain).
 */
function resolveBase(): string {
  if (process.env.VITE_BASE) return process.env.VITE_BASE;
  const repo = process.env.GITHUB_REPOSITORY?.split('/')[1];
  if (!repo || repo.endsWith('.github.io')) return '/';
  return `/${repo}/`;
}

const repoUrl = process.env.GITHUB_REPOSITORY
  ? `https://github.com/${process.env.GITHUB_REPOSITORY}`
  : (process.env.VITE_REPO_URL ?? '');

export default defineConfig({
  base: resolveBase(),
  define: {
    'import.meta.env.VITE_REPO_URL': JSON.stringify(repoUrl),
  },
  plugins: [react(), tailwindcss()],
  build: {
    target: 'es2022',
    sourcemap: false,
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks: {
          echarts: ['echarts/core', 'echarts/charts', 'echarts/components', 'echarts/renderers'],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
    setupFiles: ['./src/test/setup.ts'],
  },
});
