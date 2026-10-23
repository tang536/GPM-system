import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { authApi, getToken, setToken, setUnauthorizedHandler } from '../api'
import type { Me } from '../types'

interface AuthState {
  me: Me | null
  loading: boolean
  login: (account: string, password: string) => Promise<Me>
  logout: () => void
  hasPerm: (path: string) => boolean
  inRole: (role: string) => boolean
  isAdmin: boolean
  /** 权限 + 角色双重判定：业务操作按钮统一走这里，避免"有菜单权限但角色不对" */
  can: (perm: string, roles?: string[]) => boolean
}

const AuthCtx = createContext<AuthState | null>(null)

/** 各身份的默认首页：按报告 3.2 节的角色职责分流 */
export function homePathOf(me: Me | null): string {
  if (!me) return '/login'
  if (me.userType === '管理员') return '/dashboard'
  if (me.userType === '学生') return '/my-project'
  if (me.roles.includes('系主任')) return '/dashboard'
  return '/dashboard'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null)
  const [loading, setLoading] = useState(true)

  const logout = useCallback(() => {
    setToken(null)
    setMe(null)
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setToken(null)
      setMe(null)
    })
    if (!getToken()) {
      setLoading(false)
      return
    }
    authApi
      .me()
      .then(setMe)
      .catch(() => {
        setToken(null)
        setMe(null)
      })
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (account: string, password: string) => {
    const res = await authApi.login(account, password)
    setToken(res.token)
    setMe(res.profile)
    return res.profile
  }, [])

  const value = useMemo<AuthState>(
    () => ({
      me,
      loading,
      login,
      logout,
      // 严格按后端签发的权限集合判定：系统管理员不再隐式通行（报告 7.6 节：管理员只用于维护）
      hasPerm: (path: string) => !!me && me.perms.includes(path),
      inRole: (role: string) => !!me && me.roles.includes(role),
      isAdmin: me?.userType === '管理员',
      can: (perm: string, roles?: string[]) =>
        !!me && me.perms.includes(perm) && (!roles || roles.some((r) => me.roles.includes(r))),
    }),
    [me, loading, login, logout],
  )

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthCtx)
  if (!ctx) throw new Error('useAuth 必须在 AuthProvider 内使用')
  return ctx
}
