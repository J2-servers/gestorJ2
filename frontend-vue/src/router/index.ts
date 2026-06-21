import { createRouter, createWebHistory } from 'vue-router'

import { registerRouteGuards } from '@/router/guards'
import { routes } from '@/router/routes'

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { left: 0, top: 0 }
  },
})

registerRouteGuards(router)

export default router
