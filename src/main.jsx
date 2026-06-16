import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  // <React.StrictMode>
  <App />
  // </React.StrictMode>,
)

// Register push notification service worker
if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/push-worker.js', { scope: '/' })
      .then((reg) => {
        // Listen for notification click messages from SW
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data?.type === 'NOTIFICATION_CLICK' && event.data?.url) {
            window.location.pathname = event.data.url;
          }
        });
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
