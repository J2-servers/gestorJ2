import type { ApiErrorPayload } from '@/types/api'

const API_BASE = import.meta.env.VITE_API_URL || '/api'
const TOKEN_KEY = 'gestor_j2_vue_access_token'
const CLIENT_ACCESS_COOKIE = 'access_token_client'
const REFRESH_PATH = '/auth/refresh'

let refreshPromise: Promise<string | null> | null = null

export class ApiError extends Error {
  status: number
  payload?: ApiErrorPayload

  constructor(status: number, payload?: ApiErrorPayload) {
    // O backend retorna envelope { success, error: { code, message }, ... }.
    // Tambem aceitamos { message } ou { error: string } para robustez.
    const nested = (payload as { error?: unknown } | undefined)?.error
    const nestedMessage =
      typeof nested === 'string'
        ? nested
        : (nested as { message?: string } | undefined)?.message
    super(formatApiErrorMessage(status, payload?.message || nestedMessage))
    this.name = 'ApiError'
    this.status = status
    this.payload = payload
  }
}

function stripHtml(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function formatApiErrorMessage(status: number, message?: string) {
  if (status === 413) {
    return 'Arquivo muito grande. Use uma imagem menor ou aguarde a compressao automatica antes de enviar.'
  }
  if (status >= 500) {
    const clean500 = message ? stripHtml(String(message)) : ''
    if (clean500 && !/^Erro HTTP 500$/i.test(clean500)) {
      return clean500.length > 240 ? `${clean500.slice(0, 237)}...` : clean500
    }
    return 'Erro interno no servidor. Tente novamente em instantes ou verifique as migrations do backend.'
  }

  const clean = message ? stripHtml(String(message)) : ''
  if (!clean) return `Erro HTTP ${status}`
  if (/413 Request Entity Too Large/i.test(clean)) {
    return 'Arquivo muito grande. Use uma imagem menor para continuar.'
  }
  return clean.length > 240 ? `${clean.slice(0, 237)}...` : clean
}

function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setAccessToken(token?: string | null) {
  if (!token) {
    localStorage.removeItem(TOKEN_KEY)
    syncAccessCookie(null)
    return
  }
  localStorage.setItem(TOKEN_KEY, token)
  syncAccessCookie(token)
}

function syncAccessCookie(token?: string | null) {
  if (typeof document === 'undefined') return

  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  if (!token) {
    document.cookie = `${CLIENT_ACCESS_COOKIE}=; Path=/api; Max-Age=0; SameSite=Lax${secure}`
    return
  }

  document.cookie = `${CLIENT_ACCESS_COOKIE}=${encodeURIComponent(token)}; Path=/api; Max-Age=86400; SameSite=Lax${secure}`
}

function buildHeaders(body?: BodyInit | null, initial?: HeadersInit) {
  const headers = new Headers(initial)
  const token = getToken()

  if (!(body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  return headers
}

function shouldAttemptRefresh(path: string) {
  return !path.startsWith('/auth/')
}

async function parseResponse(response: Response) {
  const text = await response.text()
  if (!text) return null

  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const response = await fetch(`${API_BASE}${REFRESH_PATH}`, {
        method: 'POST',
        credentials: 'include',
        headers: buildHeaders(null),
        body: '{}',
      })
      const payload = await parseResponse(response)

      if (!response.ok) {
        setAccessToken(null)
        return null
      }

      const token =
        typeof payload === 'object' && payload
          ? ((payload as { accessToken?: string | null; access_token?: string | null; token?: string | null }).accessToken ??
            (payload as { accessToken?: string | null; access_token?: string | null; token?: string | null }).access_token ??
            (payload as { accessToken?: string | null; access_token?: string | null; token?: string | null }).token ??
            null)
          : null
      setAccessToken(token)
      return token ?? null
    })().finally(() => {
      refreshPromise = null
    })
  }

  return refreshPromise
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const body = init.body
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    body,
    credentials: 'include',
    headers: buildHeaders(body, init.headers),
  })

  const payload = await parseResponse(response)

  if (response.status === 401 && shouldAttemptRefresh(path)) {
    const refreshed = await refreshAccessToken()
    if (refreshed) {
      const retryResponse = await fetch(`${API_BASE}${path}`, {
        ...init,
        body,
        credentials: 'include',
        headers: buildHeaders(body, init.headers),
      })
      const retryPayload = await parseResponse(retryResponse)

      if (!retryResponse.ok) {
        if (retryResponse.status === 401) setAccessToken(null)
        throw new ApiError(
          retryResponse.status,
          typeof retryPayload === 'object' ? retryPayload : { message: String(retryPayload) },
        )
      }

      return retryPayload as T
    }
  }

  if (!response.ok) {
    if (response.status === 401) setAccessToken(null)
    throw new ApiError(response.status, typeof payload === 'object' ? payload : { message: String(payload) })
  }

  return payload as T
}

export const httpClient = {
  get: <T>(path: string) => apiRequest<T>(path),
  post: <T>(path: string, data?: unknown) =>
    apiRequest<T>(path, {
      method: 'POST',
      body: data instanceof FormData ? data : JSON.stringify(data ?? {}),
    }),
  patch: <T>(path: string, data?: unknown) =>
    apiRequest<T>(path, {
      method: 'PATCH',
      body: data === undefined ? undefined : JSON.stringify(data),
    }),
  delete: <T>(path: string) => apiRequest<T>(path, { method: 'DELETE' }),
}
