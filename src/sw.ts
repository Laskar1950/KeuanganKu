/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

// Precache injected by vite-plugin-pwa (injectManifest)
precacheAndRoute(self.__WB_MANIFEST);

// Runtime cache for Supabase API (NetworkFirst, 5min)
registerRoute(
  ({ url }) => /^https:\/\/.*\.supabase\.co\/.*/i.test(url.href),
  new NetworkFirst({
    cacheName: 'supabase-api',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 60 * 5,
      }),
    ],
  })
);

// --- Push handling ---
self.addEventListener('push', (event: PushEvent) => {
  let data: { title?: string; body?: string; icon?: string; badge?: string; tag?: string; target?: string; url?: string; count?: number } = {};
  try {
    if (event.data) {
      // Try JSON, fallback to text
      try {
        data = event.data.json();
      } catch {
        const text = event.data.text();
        data = { title: 'KeuanganKu', body: text };
      }
    }
  } catch {
    data = { title: 'KeuanganKu', body: 'Ada aktivitas baru di keluarga Anda.' };
  }

  const title = data.title || 'KeuanganKu — Transaksi Baru';
  const body = data.body || 'Ada pencatatan baru di keluarga Anda.';
  const tag = data.tag || 'keuanganku-transaction';
  const icon = data.icon || '/pwa-192x192.png';
  const badge = data.badge || '/pwa-192x192.png';

  // Coalesce tag ensures single notification; renotify true to alert again even if tag same
  const options: NotificationOptions & { renotify?: boolean; vibrate?: number[] } = {
    body,
    icon,
    badge,
    tag,
    renotify: true,
    requireInteraction: false,
    vibrate: [90, 40, 90],
    data: {
      target: data.target || 'transactions',
      url: data.url || '/',
      dateOfArrival: Date.now(),
      count: data.count,
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  const data = (event.notification as unknown as { data?: { target?: string; url?: string } }).data || {};
  const target = data.target || 'transactions';
  // Map target to hash or path — app uses SPA with BottomNav, we use url param to navigate
  const urlToOpen = new URL(self.location.origin);
  // For SPA, just open '/' — App will handle, but we pass target via URL search for potential deep link
  if (target) urlToOpen.searchParams.set('target', target);

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        // If already open, focus and postMessage
        if ('focus' in client) {
          try {
            (client as WindowClient).navigate?.(urlToOpen.href);
          } catch {
            // navigate may not be supported
          }
          return (client as WindowClient).focus().then(() => {
            // Optionally post message to app to navigate
            try {
              (client as WindowClient).postMessage({ type: 'NOTIFICATION_CLICK', target });
            } catch {
              // ignore
            }
          });
        }
      }
      // No open window, open new
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen.href);
      }
      return undefined;
    })
  );
});

self.addEventListener('pushsubscriptionchange', () => {
  // Let the app re-subscribe on next visit — we can't auto re-subscribe without VAPID key here
  // Broadcast to clients to trigger resubscribe
  self.clients.matchAll({ type: 'window' }).then((clients) => {
    for (const client of clients) {
      try {
        client.postMessage({ type: 'PUSH_SUBSCRIPTION_CHANGE' });
      } catch {
        // ignore
      }
    }
  });
});

// Optional: handle message from app to skip waiting
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
