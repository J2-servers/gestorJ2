import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  // <React.StrictMode>
  <App />
  // </React.StrictMode>,
)

// Register push notification service worker + auto-update dos apps instalados
if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  let refreshing = false;
  // Quando um novo service worker assume o controle, recarrega para pegar a
  // versao nova (apps instalados se atualizam sozinhos a cada deploy).
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/push-worker.js', { scope: '/' })
      .then((reg) => {
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data?.type === 'NOTIFICATION_CLICK' && event.data?.url) {
            window.location.pathname = event.data.url;
          }
        });
        // Checa atualizacao do SW ao abrir, ao voltar o foco e a cada 30 min.
        const checkUpdate = () => reg.update().catch(() => {});
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') checkUpdate();
        });
        setInterval(checkUpdate, 30 * 60 * 1000);
      })
      .catch(() => { /* SW not critical — fail silently */ });
  });
}

if (import.meta.hot) {
  import.meta.hot.on('vite:beforeUpdate', () => {
    window.parent?.postMessage({ type: 'sandbox:beforeUpdate' }, '*');
  });
  import.meta.hot.on('vite:afterUpdate', () => {
    window.parent?.postMessage({ type: 'sandbox:afterUpdate' }, '*');
  });
}
