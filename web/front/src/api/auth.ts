import { http } from './client'
import type { Me } from '../types'

export interface LoginResult {
  token: string
  expireAt: string
  profile: Me
}

export const authApi = {
  login: (account: string, password: string) =>
    http.post<LoginResult>('/api/auth/login', { account, password }),
  me: () => http.get<Me>('/api/auth/me'),
  changePassword: (oldPassword: string, newPassword: string) =>
    http.post<{ ok: true }>('/api/auth/change-password', { oldPassword, newPassword }),
}
