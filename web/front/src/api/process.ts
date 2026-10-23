import { http, qs } from './client'
import type { Extension, OverdueRow, ProgressRow, Stage, Submission, TaskBook } from '../types'

export const processApi = {
  stages: (cohort?: string) => http.get<Stage[]>('/api/stages' + qs({ cohort })),
  saveNode: (
    id: number,
    body: { startTime: string; deadline: string; allowFormat: string; maxSize: number; allowLate: boolean },
  ) => http.put<{ ok: true }>(`/api/stages/${id}/node`, body),

  taskBooks: (projectNo?: string, kw?: string) =>
    http.get<TaskBook[]>('/api/taskbooks' + qs({ projectNo, kw })),
  saveTaskBook: (body: {
    projectNo: string
    designTask: string
    techRequirement?: string
    schedule?: string
  }) => http.post<{ ok: true }>('/api/taskbooks', body),
  confirmTask: (id: number) => http.post<{ ok: true }>(`/api/taskbooks/${id}/confirm`),

  submissions: (projectNo?: string, stageId?: string | number, kw?: string) =>
    http.get<Submission[]>('/api/submissions' + qs({ projectNo, stageId, kw })),
  submit: (body: { projectNo: string; stageId: number; filePath: string }) =>
    http.post<{ ok: true }>('/api/submissions', body),
  review: (id: number, conclusion: string, opinion?: string) =>
    http.post<{ ok: true }>(`/api/submissions/${id}/review`, { conclusion, opinion }),

  extensions: (kw?: string) => http.get<Extension[]>('/api/extensions' + qs({ kw })),
  applyExtension: (body: { projectNo: string; stageId: number; reason: string; delayDays: number }) =>
    http.post<{ ok: true }>('/api/extensions', body),
  approve: (id: number, result: string, delayDays?: number) =>
    http.post<{ ok: true }>(`/api/extensions/${id}/approve`, { result, delayDays }),

  progress: (projectNo?: string, cohort?: string) =>
    http.get<ProgressRow[]>('/api/progress' + qs({ projectNo, cohort })),
  overdue: () => http.get<OverdueRow[]>('/api/overdue'),
}
