/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon.svg'],
      manifest: {
        name: 'StockPro Clinique',
        short_name: 'StockPro',
        description: 'Gestion de stock pour clinique - Inventaire, HACCP, Traçabilité',
        start_url: '/',
        display: 'standalone',
        background_color: '#0f172a',
        theme_color: '#3b82f6',
        orientation: 'portrait-primary',
        icons: [
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        shortcuts: [
          {
            name: 'Sorties',
            short_name: 'Sorties',
            url: '/outputs',
          },
          {
            name: 'Températures',
            short_name: 'Temp',
            url: '/temperatures',
          },
          {
            name: 'Traçabilité',
            short_name: 'Photos',
            url: '/traceability',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Import custom service worker for push notification handling
        importScripts: ['/sw-custom.js'],
        runtimeCaching: [],
      },
    }),
  ],
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
