import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'SMART BUILD — Ақылды есептеу, тиімді құрылыс',
        short_name: 'SMART BUILD',
        description: 'Үй құрылысы мен әрлеу материалдарын, шығын мен бюджетті математикалық есептеу',
        lang: 'kk',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#ffffff',
        theme_color: '#1e3a8a',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Офлайн жұмыс: барлық JS/CSS/HTML, соның ішінде PDF қаріптері мен Excel модулі алдын ала кэштеледі
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,ico,webmanifest}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        navigateFallback: '/index.html',
      },
    }),
  ],
  build: { chunkSizeWarningLimit: 2500 },
  test: { environment: 'node' },
});
