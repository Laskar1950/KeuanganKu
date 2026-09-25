import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

function supabasePreconnect(origin) {
  return {
    name: 'keuanganku-supabase-preconnect',
    transformIndexHtml() {
      if (!origin) return [];
      return [
        { tag: 'link', attrs: { rel: 'preconnect', href: origin, crossorigin: true }, injectTo: 'head-prepend' },
        { tag: 'link', attrs: { rel: 'dns-prefetch', href: origin }, injectTo: 'head-prepend' },
      ];
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const supabaseUrl = process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL || '';

  let supabaseOrigin = '';
  try {
    supabaseOrigin = supabaseUrl ? new URL(supabaseUrl).origin : '';
  } catch {
    supabaseOrigin = '';
  }

  return {
    plugins: [
      react(),
      supabasePreconnect(supabaseOrigin),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
        manifest: {
          id: '/',
          name: 'KeuanganKu - Kelola Keuangan Keluarga',
          short_name: 'KeuanganKu',
          description: 'Web app mobile-first untuk mengelola keuangan keluarga.',
          theme_color: '#fff7ed',
          background_color: '#fff7ed',
          display: 'standalone',
          orientation: 'portrait',
          lang: 'id',
          scope: '/',
          start_url: '/',
          categories: ['finance', 'productivity'],
          handle_links: 'preferred',
          share_target: {
            action: '/',
            method: 'GET',
            params: { title: 'title', text: 'text', url: 'url' },
          },
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'supabase-api',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 5,
                },
              },
            },
          ],
        },
      }),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  };
});
