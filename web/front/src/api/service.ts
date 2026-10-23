import { http, qs } from './client'
import type {
  BackupFile,
  DeptStat,
  Message,
  Notice,
  Overview,
  StageProgressStat,
  SysParam,
  Workload,
} from '../types'

export interface NoticeIn {
  title: string
  content: string
  noticeType: string
  /** 单值范围（兼容旧格式）；多选时用 scopes */
  scope?: string
  /** 多选发布范围，后端以逗号连接存储 */
  scopes?: string[]
  isTop: boolean
}

export const serviceApi = {
  notices: (kw?: string, type?: string) => http.get<Notice[]>('/api/notices' + qs({ kw, type })),
  addNotice: (body: NoticeIn) => http.post<{ ok: true }>('/api/notices', body),
  updateNotice: (id: number, body: NoticeIn) => http.put<{ ok: true }>(`/api/notices/${id}`, body),
  delNotice: (id: number) => http.del<{ ok: true }>(`/api/notices/${id}`),

  messages: (unreadOnly = false) => http.get<Message[]>('/api/messages' + qs({ unreadOnly })),
  unread: () => http.get<{ count: number }>('/api/messages/unread'),
  readOne: (id: number) => http.post<{ ok: true }>(`/api/messages/${id}/read`),
  readAll: () => http.post<{ ok: true }>('/api/messages/read-all'),

  overview: () => http.get<Overview>('/api/stats/overview'),
  progressStat: (cohort?: string) => http.get<StageProgressStat[]>('/api/stats/progress' + qs({ cohort })),
  deptStat: () => http.get<DeptStat[]>('/api/stats/dept'),
  workload: () => http.get<Workload[]>('/api/stats/workload'),

  params: () => http.get<SysParam[]>('/api/params'),
  setParam: (name: string, paramValue: string) =>
    http.put<{ ok: true }>(`/api/params/${name}`, { paramValue }),
  setWeights: (process: number, review: number, defense: number) =>
    http.put<{ ok: true }>('/api/params/weights', { process, review, defense }),

  backups: () => http.get<BackupFile[]>('/api/backups'),
  createBackup: () => http.post<{ ok: true; name: string; size: number }>('/api/backups'),
  overdueNotice: () => http.post<{ ok: true; created: number }>('/api/tasks/overdue-notice'),

  upload: (file: File, projectNo: string) => {
    const form = new FormData()
    form.append('file', file)
    form.append('projectNo', projectNo)
    return http.upload<{ ok: true; path: string; name: string }>('/api/upload', form)
  },
}
