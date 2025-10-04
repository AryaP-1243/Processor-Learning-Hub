import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  server: {
    port: 5000,
    host: '0.0.0.0',
    strictPort: false,
    hmr: {
      clientPort: 5000,
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  },
  define: {
    'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || ''),
  },
});
