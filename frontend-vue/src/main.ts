import { createPinia } from 'pinia'
import { createApp } from 'vue'

import App from '@/app/App.vue'
import router from '@/router'

import '@/styles/base.css'
import '@/styles/pages.css'

function updateAppViewportHeight() {
  const visualHeight = window.visualViewport?.height ?? 0
  const innerHeight = window.innerHeight || 0
  const mobileScreenHeight = window.innerWidth <= 1180 ? window.screen?.height || 0 : 0
  const height = Math.max(innerHeight, visualHeight, mobileScreenHeight)
  if (height > 0) {
    document.documentElement.style.setProperty('--app-viewport-height', `${Math.round(height)}px`)
  }
}

updateAppViewportHeight()
window.addEventListener('resize', updateAppViewportHeight)
window.addEventListener('orientationchange', updateAppViewportHeight)
window.visualViewport?.addEventListener('resize', updateAppViewportHeight)
window.visualViewport?.addEventListener('scroll', updateAppViewportHeight)

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
