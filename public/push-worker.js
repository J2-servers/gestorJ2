/* Gestor J2 — Push Notification Service Worker */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

// Handler de fetch (pass-through). Necessario para o navegador considerar o app
// "instalavel" e disparar o evento beforeinstallprompt. Nao intercepta nada.
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
    body = 'Nova notificação',
    icon = '/icon-192.png',
    badge = '/badge-96.png',
    tag,
    data = {},
    vibrate,
    requireInteraction,
    actions = [
      { action: 'view', title: 'Ver' },
      { action: 'dismiss', title: 'Dispensar' },
    ],
  } = payload;

  // Padrão de vibração forte (campainha): toca, pausa, repete — chama atenção
  // mesmo no bolso. Só tem efeito no app instalado / Android.
  const strongVibrate =
    Array.isArray(vibrate) && vibrate.length ? vibrate : [500, 200, 500, 200, 500];

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      // Se houver uma janela visível/focada, a UI in-app (SSE) já mostra a
      // notificação — apenas avisamos o cliente e NÃO duplicamos na tela do SO.
      const focused = allClients.find(
        (c) => c.visibilityState === 'visible' && c.focused,
      );
      if (focused) {
        focused.postMessage({ type: 'PUSH_RECEIVED', payload });
        return;
      }

      // Caso contrário (tela apagada, app em background, aba fechada):
      // entrega direto na tela do smartphone de forma CHAMATIVA —
      // vibra, toca o som do sistema e acende a tela (heads-up de alta
      // importância). É o máximo que a plataforma web permite.
      await self.registration.showNotification(title, {
        body,
        icon,
        badge,
        tag: tag || `gestor-j2-${Date.now()}`,
        renotify: true,                 // re-alerta (vibra/soa) a cada nova mensagem
        data,
        vibrate: strongVibrate,         // vibração forte
        requireInteraction: true,       // mantém na tela e acende o display apagado
        silent: false,                  // garante o som padrão do sistema (campainha)
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
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if (client.url.startsWith(origin) && 'focus' in client) {
            client.postMessage({
              type: 'NOTIFICATION_CLICK',
              url,
              data: event.notification.data,
            });
            return client.focus();
          }
        }
        return self.clients.openWindow(fullUrl);
      }),
  );
});

// Renovação automática da subscription quando o navegador rotaciona o endpoint
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const newSub =
          event.newSubscription ||
          (await self.registration.pushManager.subscribe(
            event.oldSubscription?.options || { userVisibleOnly: true },
          ));
        await fetch('/api/notifications/push-subscriptions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(newSub.toJSON()),
        });
      } catch {
        /* será re-tentado no próximo carregamento do app */
      }
    })(),
  );
});
