import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'TourLang v2',
        short_name: 'TourLang v2',
        description: 'Jadwal perjalanan keluarga di Eropa',
        lang: 'id',
        start_url: '/TourLang/',
        scope: '/TourLang/',
        display: 'standalone',
        background_color: '#EEF1F5',
        theme_color: '#EEF1F5',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
      workbox: {
        navigateFallback: '/TourLang/index.html',
        runtimeCaching: [
          {
            // Foto destinasi (Wikimedia atau sumber lain di kolom foto) disimpan supaya tetap tampil saat offline.
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'foto',
              expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'font' },
          },
        ],
      },
    }),
  ],
  base: '/TourLang/',
});
