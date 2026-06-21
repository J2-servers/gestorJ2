import { defineStore } from 'pinia'

import { authService } from '@/services/api/auth.service'
import type { User } from '@/types/domain'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as User | null,
    ready: false,
    loading: false,
    error: '',
  }),
  getters: {
    isAuthenticated: (state) => Boolean(state.user?.id),
    isAdmin: (state) => state.user?.role === 'admin' || state.user?.role === 'dev',
  },
  actions: {
    async bootstrapSession() {
      this.loading = true
      this.error = ''
      try {
        this.user = await authService.me()
      } catch {
        this.user = null
      } finally {
        this.ready = true
        this.loading = false
      }
    },
    async login(email: string, password: string) {
      this.loading = true
      this.error = ''
      try {
        this.user = await authService.login({ email, password })
        this.ready = true
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Falha ao entrar'
        throw error
      } finally {
        this.loading = false
      }
    },
    async register(payload: unknown) {
      this.loading = true
      this.error = ''
      try {
        this.user = await authService.register(payload)
        this.ready = true
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Falha ao criar conta'
        throw error
      } finally {
        this.loading = false
      }
    },
    async bootstrap(payload: unknown) {
      this.loading = true
      this.error = ''
      try {
        this.user = await authService.bootstrap(payload)
        this.ready = true
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Falha ao criar administradores'
        throw error
      } finally {
        this.loading = false
      }
    },
    async logout() {
      await authService.logout()
      this.user = null
      this.ready = true
    },
  },
})
