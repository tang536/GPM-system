import { useMemo, useState } from 'react'
import { baseApi, processApi } from '../../api'
import DataTable from '../../components/DataTable'
import { PageHead } from '../../components/State'
import { StatGrid } from '../../components/StatCard'
import Tag from '../../components/Tag'
import { useAuth } from '../../hooks/useAuth'
import { useQuery } from '../../hooks/useQuery'
import type { OverdueRow, ProgressRow } from '../../types'
import { fmtDateTime } from '../../utils/datetime'

/** 进度跟踪：按课题 × 阶段展现提交状态，并单列逾期名单（仅管理身份可见） */
export default function Progress() {
  const { hasPerm } = useAuth()
  // 逾期名单是管理视角（接口要求 /service/stat 权限），学生身份不展示也不请求
  const canOverdue = hasPerm('/service/stat')
  const [cohort, setCohort] = useState('2026')
  const [kw, setKw] = useState('')
  const [tab, setTab] = useState<'grid' | 'overdue'>('grid')

  const cohorts = useQuery(() => baseApi.cohorts(), [])
  const rows = useQuery<ProgressRow[]>(() => processApi.progress(undefined, cohort), [cohort])
  const overdue = useQuery<OverdueRow[]>(canOverdue ? () => processApi.overdue() : null, [])

  const filtered = (rows.data ?? []).filter(
    (r) => !kw || r.studentName.includes(kw) || r.studentNo.includes(kw) || r.projectNo.includes(kw),
  )

  const stats = useMemo(() => {
    const all = rows.data ?? []
    return {
      total: all.length,
      submitted: all.filter((r) => r.submitStatus === '已提交').length,
      missing: all.filter((r) => r.submitStatus === '未提交').length,
      late: all.filter((r) => r.submitStatus === '逾期').length,
    }
  }, [rows.data])

  return (
    <>
      <PageHead title="进度跟踪" desc="按课题逐阶段汇总提交情况；逾期数据由视图 v_overdue_list 提供">
        <input placeholder="搜索学号 / 姓名 / 课题编号" value={kw} onChange={(e) => setKw(e.target.value)} style={{ width: 230 }} />
        <select value={cohort} onChange={(e) => setCohort(e.target.value)}>
          {(cohorts.data ?? [{ cohort: '2026' }]).map((c) => (
            <option key={c.cohort} value={c.cohort}>{c.cohort} 届</option>
          ))}
        </select>
      </PageHead>

      <StatGrid
        items={[
          { key: 't', label: '进度记录', value: stats.total, desc: '课题 × 阶段', highlight: true },
          { key: 's', label: '已提交', value: stats.submitted, desc: '含按时与逾期' },
          { key: 'm', label: '未提交', value: stats.missing, desc: '仍需跟进' },
          { key: 'l', label: '逾期', value: stats.late, desc: '超过节点截止' },
        ]}
      />

      <div className="card">
        <div className="tabs">
          <button className={`tab${tab === 'grid' ? ' active' : ''}`} onClick={() => setTab('grid')}>阶段提交明细</button>
          {canOverdue && (
            <button className={`tab${tab === 'overdue' ? ' active' : ''}`} onClick={() => setTab('overdue')}>
              逾期名单（{overdue.data?.length ?? 0}）
            </button>
          )}
        </div>

        {tab === 'overdue' && canOverdue ? (
          <DataTable
            rows={overdue.data}
            loading={overdue.loading}
            error={overdue.error}
            onRetry={overdue.reload}
            rowKey={(r) => `${r.projectNo}-${r.stageName}`}
            pageSize={15}
            empty="当前没有逾期记录"
            columns={[
              { key: 'studentName', title: '学生', render: (r) => <b>{r.studentName}</b> },
              { key: 'studentNo', title: '学号', render: (r) => <span className="mono">{r.studentNo}</span> },
              { key: 'topicName', title: '题目', render: (r) => <span className="ellipsis" title={r.topicName}>{r.topicName}</span> },
              { key: 'teacherName', title: '指导教师' },
              { key: 'stageName', title: '逾期阶段', render: (r) => <Tag tone="red">{r.stageName}</Tag> },
              { key: 'deadline', title: '截止时间', render: (r) => fmtDateTime(r.deadline) },
              { key: 'overdueDays', title: '逾期天数', align: 'right', render: (r) => <b style={{ color: 'var(--danger)' }}>{r.overdueDays} 天</b> },
            ]}
          />
        ) : (
          <DataTable
            rows={filtered}
            loading={rows.loading}
            error={rows.error}
            onRetry={rows.reload}
            rowKey={(r) => `${r.projectNo}-${r.stageId}`}
            pageSize={15}
            empty="暂无进度数据"
            columns={[
              { key: 'projectNo', title: '课题编号', render: (r) => <span className="mono">{r.projectNo}</span> },
              { key: 'studentName', title: '学生', render: (r) => <b>{r.studentName}</b> },
              { key: 'className', title: '班级' },
              { key: 'teacherName', title: '指导教师' },
              { key: 'stageName', title: '阶段', render: (r) => <Tag tone="blue">{r.stageName}</Tag> },
              { key: 'deadline', title: '截止时间', render: (r) => fmtDateTime(r.deadline) },
              { key: 'lastSubmit', title: '最近提交', render: (r) => fmtDateTime(r.lastSubmit) },
              { key: 'lastVersion', title: '版本', align: 'right', render: (r) => (r.lastVersion ? `v${r.lastVersion}` : '—') },
              { key: 'submitStatus', title: '状态', render: (r) => <Tag>{r.submitStatus}</Tag> },
            ]}
          />
        )}
      </div>
    </>
  )
}
