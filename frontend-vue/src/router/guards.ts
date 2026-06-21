import type { Router } from 'vue-router'

import { useAuthStore } from '@/stores/auth.store'
import type { UserRole } from '@/types/domain'

export function registerRouteGuards(router: Router) {
  router.beforeEach(async (to) => {
    const auth = useAuthStore()

    if (!auth.ready) {
      await auth.bootstrapSession()
    }

    if (to.meta.guestOnly && auth.isAuthenticated) {
      return { name: 'dashboard' }
    }

    if (to.meta.requiresAuth && !auth.isAuthenticated) {
      return { name: 'login', query: { redirect: to.fullPath } }
    }

    const roles = to.meta.roles as UserRole[] | undefined
    if (roles?.length && auth.user && !roles.includes(auth.user.role)) {
      return { name: 'dashboard' }
    }

    return true
  })
}
