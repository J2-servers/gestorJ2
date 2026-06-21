import { createPinia } from 'pinia'
import { createApp } from 'vue'

import App from '@/app/App.vue'
import router from '@/router'

import '@/styles/base.css'
import '@/styles/pages.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')

// PWA: registra o service worker para tornar o app instalavel e habilitar push.
if ('serviceWorker' in navigator) {
  let refreshing = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return
    refreshing = true
    window.location.reload()
  })

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/push-worker.js', { scope: '/' })
      .then((reg) => {
        const checkUpdate = () => reg.update().catch(() => {})
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') checkUpdate()
        })
        setInterval(checkUpdate, 30 * 60 * 1000)
      })
      .catch(() => {
        /* SW nao e critico — falha silenciosa */
      })

    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'NOTIFICATION_CLICK' && event.data?.url) {
        window.location.pathname = event.data.url
      }
      // App aberto: vibra ao chegar um push (tela apagada e tratada pelo worker).
      if (event.data?.type === 'PUSH_RECEIVED') {
        try {
          navigator.vibrate?.([500, 200, 500])
        } catch {
          /* sem vibracao */
        }
      }
    })
  })
}
