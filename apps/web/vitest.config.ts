import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      '@matabai/shared': path.resolve(__dirname, '../../packages/shared/src'),
      '@matabai/config': path.resolve(__dirname, '../../packages/config/src'),
      '@matabai/validation': path.resolve(__dirname, '../../packages/validation/src'),
    },
  },
});
