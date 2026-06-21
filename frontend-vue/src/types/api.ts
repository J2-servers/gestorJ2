export interface PaginatedResponse<T> {
  data: T[]
  nextCursor?: string | null
}

export interface ApiErrorPayload {
  message?: string
  error?: string
  statusCode?: number
}

export interface BootstrapStatus {
  canBootstrap: boolean
}

export interface LoginPayload {
  email: string
  password: string
}

export interface LoginResponse<TUser> {
  accessToken?: string
  user: TUser
}
