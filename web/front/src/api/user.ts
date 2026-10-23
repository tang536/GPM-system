import { http, qs } from './client'
import type { Account, OpLog, Permission, Role, StudentRow, TeacherRow } from '../types'

export interface UserIn {
  account: string
  password: string
  userType: string
  studentNo?: string | null
  teacherNo?: string | null
  roleIds: number[]
  status?: string | null
}

export const userApi = {
  users: (kw?: string, userType?: string, role?: string) =>
    http.get<Account[]>('/api/users' + qs({ kw, userType, role })),
  addUser: (body: UserIn) => http.post<{ ok: true }>('/api/users', body),
  updateUser: (id: number, body: { status?: string; newPassword?: string; roleIds?: number[] }) =>
    http.put<{ ok: true }>(`/api/users/${id}`, body),
  delUser: (id: number) => http.del<{ ok: true }>(`/api/users/${id}`),

  students: (kw?: string) => http.get<StudentRow[]>('/api/students' + qs({ kw })),
  teachers: (kw?: string) => http.get<TeacherRow[]>('/api/teachers' + qs({ kw })),

  roles: () => http.get<Role[]>('/api/roles'),
  addRole: (body: { roleName: string; roleDesc?: string; permIds?: number[] }) =>
    http.post<{ ok: true }>('/api/roles', body),
  updateRole: (id: number, body: { roleName: string; roleDesc?: string; permIds?: number[] }) =>
    http.put<{ ok: true }>(`/api/roles/${id}`, body),
  delRole: (id: number) => http.del<{ ok: true }>(`/api/roles/${id}`),

  perms: () => http.get<Permission[]>('/api/permissions'),
  logs: (kw?: string, opType?: string, take = 200) =>
    http.get<OpLog[]>('/api/logs' + qs({ kw, opType, take })),
}
