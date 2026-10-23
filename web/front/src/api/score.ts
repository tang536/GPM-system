import { http, qs } from './client'
import type { DefenseArrange, DefenseGroup, DimDef, ScoreRow, ScoreStat } from '../types'

export const scoreApi = {
  list: (kw?: string, publishStatus?: string, cohort?: string) =>
    http.get<ScoreRow[]>('/api/scores' + qs({ kw, publishStatus, cohort })),
  save: (
    projectNo: string,
    body: { processScore?: number | null; reviewScore?: number | null; defenseScore?: number | null },
  ) => http.put<{ ok: true }>(`/api/scores/${projectNo}`, body),
  audit: (projectNos: string[]) =>
    http.post<{ ok: true; count: number; errors: string[] }>('/api/scores/audit', { projectNos }),
  publish: (projectNos: string[]) =>
    http.post<{ ok: true; messages: string[] }>('/api/scores/publish', { projectNos }),
  stat: () => http.get<ScoreStat[]>('/api/score-stat'),

  groups: (cohort?: string) => http.get<DefenseGroup[]>('/api/defense-groups' + qs({ cohort })),
  addGroup: (body: {
    cohort: string
    majorCode?: string
    leaderNo: string
    place: string
    defenseTime: string
  }) => http.post<{ ok: true }>('/api/defense-groups', body),
  updateGroup: (
    id: number,
    body: { cohort: string; majorCode?: string; leaderNo: string; place: string; defenseTime: string },
  ) => http.put<{ ok: true }>(`/api/defense-groups/${id}`, body),
  delGroup: (id: number) => http.del<{ ok: true }>(`/api/defense-groups/${id}`),

  arranges: (groupId?: string) => http.get<DefenseArrange[]>('/api/defense-arranges' + qs({ groupId })),
  saveDefenseScore: (
    arrangeId: number,
    items: { dimension: string; score: number; remark?: string }[],
  ) => http.put<{ ok: true }>(`/api/defense-arranges/${arrangeId}/scores`, { items }),
  dims: () => http.get<DimDef[]>('/api/defense-dims'),
}
