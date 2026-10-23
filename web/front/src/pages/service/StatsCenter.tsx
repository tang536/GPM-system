import { useState, useMemo } from 'react'
import { baseApi, scoreApi, serviceApi } from '../../api'
import { BarList, ColumnChart, Donut } from '../../components/Chart'
import DataTable from '../../components/DataTable'
import { PageHead } from '../../components/State'
import { StatGrid } from '../../components/StatCard'
import { useQuery } from '../../hooks/useQuery'
import { useAuth } from '../../hooks/useAuth'
import type { ScoreStat, DeptStat, StageProgressStat, Workload } from '../../types'
import { fmtDateTime } from '../../utils/datetime'
import { score } from '../../utils/format'

/**
 * 统计中心：合并原「成绩统计」(/score/stat) 与「统计查询」(/service/stat)。
 * - 成绩统计：依赖成绩管理或统计查询权限（scoreApi.stat）。
 * - 综合统计：依赖统计查询权限（阶段提交/院系分布/教师工作量），教师无此权限时
 *   该 tab 不挂载、不请求，杜绝 403。
 * 路由统一收口到 /service/stat，/score/stat 重定向至此。
 */
export default function StatsCenter() {
  const { hasPerm } = useAuth()
  const canScore = hasPerm('/score/manage') || hasPerm('/service/stat')
  const canService = hasPerm('/service/stat')
  const [outer, setOuter] = useState<'score' | 'service'>(canService ? 'service' : 'score')

  return (
    <>
      <PageHead title="统计中心" desc="成绩统计与综合统计统一入口；成绩统计需成绩管理权限，综合统计需统计查询权限" />
      <div className="card">
        <div className="tabs">
          {canScore && (
            <button className={`tab${outer === 'score' ? ' active' : ''}`} onClick={() => setOuter('score')}>
              成绩统计
            </button>
          )}
          {canService && (
            <button className={`tab${outer === 'service' ? ' active' : ''}`} onClick={() => setOuter('service')}>
              综合统计
            </button>
          )}
        </div>

        {outer === 'score' && <ScoreStatsTab />}
        {outer === 'service' && canService && <ServiceStatsTab />}
      </div>
    </>
  )
}

/** 成绩统计：按班级维度汇总等级分布与分数区间（视图 v_score_stat，仅统计已发布成绩） */
function ScoreStatsTab() {
  const list = useQuery<ScoreStat[]>(() => scoreApi.stat(), [])
  const rows = list.data ?? []

  const sum = useMemo(() => {
    const acc = { excellent: 0, good: 0, medium: 0, pass: 0, fail: 0, avg: 0, n: 0 }
    for (const r of rows) {
      acc.excellent += r.excellentCount
      acc.good += r.goodCount
      acc.medium += r.mediumCount
      acc.pass += r.passCount
      acc.fail += r.failCount
      acc.avg += r.avgScore ?? 0
      acc.n += 1
    }
    return acc
  }, [rows])

  const total = sum.excellent + sum.good + sum.medium + sum.pass + sum.fail

  return (
    <>
      <StatGrid
        items={[
          { key: 't', label: '已发布成绩', value: total, desc: `${rows.length} 个班级维度`, highlight: true },
          { key: 'a', label: '平均分', value: sum.n ? score(sum.avg / sum.n) : '—', desc: '按班级平均后再平均' },
          { key: 'e', label: '优秀人数', value: sum.excellent, desc: '总评 ≥ 90' },
          { key: 'f', label: '不及格人数', value: sum.fail, desc: '总评 < 60' },
        ]}
      />

      <div className="chart-grid" style={{ margin: '16px 0' }}>
        <div className="card">
          <div className="card-head">
            <h3>等级分布</h3>
          </div>
          <div className="card-body">
            {total === 0 ? (
              <div className="muted">暂无已发布成绩</div>
            ) : (
              <Donut
                data={[
                  { label: '优秀', value: sum.excellent, color: '#2e7d32' },
                  { label: '良好', value: sum.good, color: '#c62828' },
                  { label: '中等', value: sum.medium, color: '#e05252' },
                  { label: '及格', value: sum.pass, color: '#f2a097' },
                  { label: '不及格', value: sum.fail, color: '#8a7d7a' },
                ]}
              />
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <h3>班级平均分</h3>
          </div>
          <div className="card-body">
            {rows.length === 0 ? (
              <div className="muted">暂无数据</div>
            ) : (
              <BarList
                data={rows.map((r) => ({ label: r.className, value: Number((r.avgScore ?? 0).toFixed(1)) }))}
                max={100}
              />
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <DataTable
          rows={list.data}
          loading={list.loading}
          error={list.error}
          onRetry={list.reload}
          rowKey={(r) => `${r.deptName}-${r.majorName}-${r.className}`}
          empty="暂无统计数据"
          columns={[
            { key: 'deptName', title: '院系' },
            { key: 'majorName', title: '专业' },
            { key: 'className', title: '班级', render: (r) => <b>{r.className}</b> },
            { key: 'excellentCount', title: '优秀', align: 'right', render: (r) => r.excellentCount },
            { key: 'goodCount', title: '良好', align: 'right', render: (r) => r.goodCount },
            { key: 'mediumCount', title: '中等', align: 'right', render: (r) => r.mediumCount },
            { key: 'passCount', title: '及格', align: 'right', render: (r) => r.passCount },
            { key: 'failCount', title: '不及格', align: 'right', render: (r) => r.failCount },
            { key: 'avgScore', title: '平均分', align: 'right', render: (r) => <b style={{ color: 'var(--brand)' }}>{score(r.avgScore, 2)}</b> },
            { key: 'maxScore', title: '最高', align: 'right', render: (r) => score(r.maxScore) },
            { key: 'minScore', title: '最低', align: 'right', render: (r) => score(r.minScore) },
          ]}
        />
      </div>
    </>
  )
}

/** 综合统计：阶段提交、院系分布、教师工作量三类报表（成绩分布见「成绩统计」tab） */
function ServiceStatsTab() {
  const [tab, setTab] = useState<'progress' | 'dept' | 'workload'>('progress')
  const [cohort, setCohort] = useState('2026')

  const cohorts = useQuery(() => baseApi.cohorts(), [])
  const progress = useQuery<StageProgressStat[]>(() => serviceApi.progressStat(cohort), [cohort])
  const dept = useQuery<DeptStat[]>(() => serviceApi.deptStat(), [])
  const workload = useQuery<Workload[]>(() => serviceApi.workload(), [])

  const p = progress.data ?? []
  const totalSubmit = p.reduce((s, x) => s + x.submitted, 0)
  const totalNeed = p.reduce((s, x) => s + x.total, 0)

  return (
    <>
      <PageHead title="综合统计" desc="面向系主任与管理员的统计报表，数据来自视图与聚合查询">
        <select value={cohort} onChange={(e) => setCohort(e.target.value)}>
          {(cohorts.data ?? [{ cohort: '2026' }]).map((c) => (
            <option key={c.cohort} value={c.cohort}>{c.cohort} 届</option>
          ))}
        </select>
      </PageHead>

      <StatGrid
        items={[
          { key: 'n', label: '应交材料', value: totalNeed, desc: `${cohort} 届全部阶段`, highlight: true },
          { key: 's', label: '已交材料', value: totalSubmit, desc: totalNeed ? `提交率 ${Math.round((totalSubmit / totalNeed) * 100)}%` : '—' },
          { key: 't', label: '教师人数', value: workload.data?.length ?? 0, desc: '含指导与评阅' },
          { key: 'd', label: '院系数', value: dept.data?.length ?? 0, desc: '有课题的院系' },
        ]}
      />

      <div className="card">
        <div className="tabs">
          <button className={`tab${tab === 'progress' ? ' active' : ''}`} onClick={() => setTab('progress')}>阶段提交</button>
          <button className={`tab${tab === 'dept' ? ' active' : ''}`} onClick={() => setTab('dept')}>院系分布</button>
          <button className={`tab${tab === 'workload' ? ' active' : ''}`} onClick={() => setTab('workload')}>教师工作量</button>
        </div>

        {tab === 'progress' && (
          <>
            <div className="card-body">
              {p.length > 0 && (
                <ColumnChart data={p.map((x) => ({ label: x.stageName, a: x.total, b: x.submitted }))} />
              )}
            </div>
            <DataTable
              rows={progress.data}
              loading={progress.loading}
              error={progress.error}
              onRetry={progress.reload}
              rowKey={(r) => r.stageId}
              pageSize={8}
              empty="暂无数据"
              columns={[
                { key: 'stageName', title: '阶段', render: (r) => <b>{r.stageName}</b> },
                { key: 'deadline', title: '截止时间', render: (r) => fmtDateTime(r.deadline) },
                { key: 'total', title: '应交', align: 'right', render: (r) => r.total },
                { key: 'submitted', title: '已交', align: 'right', render: (r) => r.submitted },
                { key: 'onTime', title: '按时', align: 'right', render: (r) => r.onTime },
                { key: 'overdue', title: '逾期提交', align: 'right', render: (r) => r.overdue },
                { key: 'missing', title: '未交', align: 'right', render: (r) => r.missing },
                {
                  key: 'rate',
                  title: '提交率',
                  align: 'right',
                  render: (r) => `${r.total ? Math.round((r.submitted / r.total) * 100) : 0}%`,
                },
              ]}
            />
          </>
        )}

        {tab === 'dept' && (
          <>
            <div className="card-body">
              {dept.data && dept.data.length > 0 && (
                <Donut
                  data={dept.data.map((d, i) => ({
                    label: d.deptName.slice(0, 6),
                    value: d.projectCount,
                    color: ['#c62828', '#e05252', '#ef7a6a', '#f2a097', '#f6c4bd'][i % 5],
                  }))}
                />
              )}
            </div>
            <DataTable
              rows={dept.data}
              loading={dept.loading}
              error={dept.error}
              onRetry={dept.reload}
              rowKey={(r) => r.deptNo}
              empty="暂无数据"
              columns={[
                { key: 'deptName', title: '院系', render: (r) => <b>{r.deptName}</b> },
                { key: 'projectCount', title: '课题数', align: 'right', render: (r) => r.projectCount },
                { key: 'studentCount', title: '学生数', align: 'right', render: (r) => r.studentCount },
                { key: 'publishedCount', title: '已发布成绩', align: 'right', render: (r) => r.publishedCount },
                { key: 'avgScore', title: '平均分', align: 'right', render: (r) => score(r.avgScore, 2) },
              ]}
            />
          </>
        )}

        {tab === 'workload' && (
          <>
            <div className="card-body">
              {workload.data && workload.data.length > 0 && (
                <BarList
                  data={workload.data.map((w) => ({ label: w.teacherName, value: w.studentCount }))}
                  unit=" 人"
                />
              )}
            </div>
            <DataTable
              rows={workload.data}
              loading={workload.loading}
              error={workload.error}
              onRetry={workload.reload}
              rowKey={(r) => r.teacherNo}
              empty="暂无数据"
              columns={[
                { key: 'teacherName', title: '教师', render: (r) => <b>{r.teacherName}</b> },
                { key: 'title', title: '职称', render: (r) => r.title ?? '—' },
                { key: 'deptName', title: '院系' },
                { key: 'topicCount', title: '申报题目', align: 'right', render: (r) => r.topicCount },
                { key: 'studentCount', title: '指导学生', align: 'right', render: (r) => r.studentCount },
                { key: 'reviewCount', title: '评阅份数', align: 'right', render: (r) => r.reviewCount },
                { key: 'avgScore', title: '学生平均分', align: 'right', render: (r) => score(r.avgScore, 2) },
              ]}
            />
          </>
        )}
      </div>
    </>
  )
}
