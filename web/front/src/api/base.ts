import { http, qs } from './client'
import type { ClassInfo, Cohort, Department, Major } from '../types'

export const baseApi = {
  depts: (kw?: string) => http.get<Department[]>('/api/departments' + qs({ kw })),
  addDept: (body: Partial<Department>) => http.post<{ ok: true }>('/api/departments', body),
  updateDept: (no: string, body: Partial<Department>) =>
    http.put<{ ok: true }>(`/api/departments/${no}`, body),
  delDept: (no: string) => http.del<{ ok: true }>(`/api/departments/${no}`),

  majors: (kw?: string, deptNo?: string) =>
    http.get<Major[]>('/api/majors' + qs({ kw, deptNo })),
  addMajor: (body: Partial<Major>) => http.post<{ ok: true }>('/api/majors', body),
  updateMajor: (no: string, body: Partial<Major>) => http.put<{ ok: true }>(`/api/majors/${no}`, body),
  delMajor: (no: string) => http.del<{ ok: true }>(`/api/majors/${no}`),

  classes: (kw?: string, majorCode?: string) =>
    http.get<ClassInfo[]>('/api/classes' + qs({ kw, majorCode })),
  addClass: (body: Partial<ClassInfo>) => http.post<{ ok: true }>('/api/classes', body),
  updateClass: (no: string, body: Partial<ClassInfo>) =>
    http.put<{ ok: true }>(`/api/classes/${no}`, body),
  delClass: (no: string) => http.del<{ ok: true }>(`/api/classes/${no}`),

  cohorts: () => http.get<Cohort[]>('/api/cohorts'),
}
