import { http, qs } from './client'
import type { PoolTopic, Project, Selection, Topic, TopicStat } from '../types'

export interface TopicIn {
  topicName: string
  topicType: string
  researchField?: string
  difficulty: string
  capacity: number
  cohort: string
  description?: string
  majorCodes?: string[]
}

export const topicApi = {
  list: (kw?: string, status?: string, cohort?: string, mine?: boolean) =>
    http.get<Topic[]>('/api/topics' + qs({ kw, status, cohort, mine })),
  add: (body: TopicIn) => http.post<{ ok: true; topicNo: string }>('/api/topics', body),
  update: (no: string, body: TopicIn) => http.put<{ ok: true }>(`/api/topics/${no}`, body),
  remove: (no: string) => http.del<{ ok: true }>(`/api/topics/${no}`),
  audit: (no: string, status: string, opinion?: string) =>
    http.post<{ ok: true }>(`/api/topics/${no}/audit`, { status, opinion }),

  pool: (kw?: string, majorCode?: string) =>
    http.get<PoolTopic[]>('/api/topics/pool' + qs({ kw, majorCode })),
  stat: () => http.get<TopicStat[]>('/api/topics/stat'),

  selections: (topicNo?: string, studentNo?: string) =>
    http.get<Selection[]>('/api/selections' + qs({ topicNo, studentNo })),
  select: (topicNo: string, preference: number) =>
    http.post<{ ok: true }>('/api/selections', { topicNo, preference }),
  drop: (id: number) => http.del<{ ok: true }>(`/api/selections/${id}`),
  confirm: (studentNo: string, topicNo: string) =>
    http.post<{ ok: true; message: string }>('/api/selections/confirm', { studentNo, topicNo }),
  assign: (studentNo: string, topicNo: string) =>
    http.post<{ ok: true; message: string }>('/api/selections/assign', { studentNo, topicNo }),

  projects: (kw?: string, status?: string) =>
    http.get<Project[]>('/api/projects' + qs({ kw, status })),
}
