import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // TanStack libraries
          'vendor-query': ['@tanstack/react-query', '@tanstack/react-table'],
          // Radix UI components (uniquement les packages installés)
          'vendor-radix': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-accordion',
            '@radix-ui/react-label',
            '@radix-ui/react-slot',
          ],
          // Supabase client
          'vendor-supabase': ['@supabase/supabase-js'],
          // Form libraries
          'vendor-forms': ['react-hook-form', 'zod'],
          // Date utilities
          'vendor-date': ['date-fns'],
          // OCR - chargé uniquement à la demande
          'vendor-ocr': ['tesseract.js'],
        },
      },
    },
    // Augmenter le warning de taille car on a du code splitting
    chunkSizeWarningLimit: 600,
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
