/* Gestor J2 - Push Notification Service Worker */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'Gestor J2', body: event.data.text() };
  }

  const {
    title = 'Gestor J2',
    body = 'Nova notificacao',
    icon = '/icon-192.png',
    badge = '/badge-96.png',
    tag,
    data = {},
    vibrate,
    requireInteraction,
    actions = [
      { action: 'view', title: 'Abrir' },
      { action: 'dismiss', title: 'Dispensar' },
    ],
  } = payload;

  const strongVibrate = Array.isArray(vibrate) && vibrate.length ? vibrate : [500, 200, 500, 200, 500];

  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const focused = clients.find((client) => client.visibilityState === 'visible' && client.focused);

      if (focused) {
        focused.postMessage({ type: 'PUSH_RECEIVED', payload });
        return;
      }

      await self.registration.showNotification(title, {
        body,
        icon,
        badge,
        tag: tag || `gestor-j2-${Date.now()}`,
        renotify: true,
        data,
        vibrate: strongVibrate,
        requireInteraction: requireInteraction ?? true,
        silent: false,
        actions,
        timestamp: Date.now(),
      });
    })(),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  const url = event.notification.data?.url || '/';
  const origin = self.location.origin;
  const fullUrl = new URL(url, origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.startsWith(origin) && 'focus' in client) {
          client.postMessage({ type: 'NOTIFICATION_CLICK', url, data: event.notification.data });
          return client.focus();
        }
      }
      return self.clients.openWindow(fullUrl);
    }),
  );
});

self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const subscription =
          event.newSubscription ||
          (await self.registration.pushManager.subscribe(event.oldSubscription?.options || { userVisibleOnly: true }));

        await fetch('/api/notifications/push-subscriptions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(subscription.toJSON()),
        });
      } catch {
        /* Refeito no proximo carregamento autenticado. */
      }
    })(),
  );
});
