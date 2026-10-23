import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { serviceApi } from '../api'
import { ColumnChart, Donut } from '../components/Chart'
import { PageHead } from '../components/State'
import DataTable from '../components/DataTable'
import FeedDetail from '../components/FeedDetail'
import Icon from '../components/Icon'
import { StatGrid } from '../components/StatCard'
import Tag from '../components/Tag'
import { useAuth } from '../hooks/useAuth'
import { useQuery } from '../hooks/useQuery'
import type { DeptStat, Notice, Overview, StageProgressStat } from '../types'
import { fmtDateTime } from '../utils/datetime'
import { score } from '../utils/format'

const num = (v: unknown): number => (typeof v === 'number' ? v : 0)

/** 工作台：按身份展示不同指标（报告 3.6 节：不同角色关注的数据不同） */
export default function Dashboard() {
  const { me, hasPerm } = useAuth()
  const nav = useNavigate()
  // 公告详情弹窗
  const [detail, setDetail] = useState<Notice | null>(null)

  const ov = useQuery<Overview>(() => serviceApi.overview(), [])
  const progress = useQuery<StageProgressStat[]>(
    hasPerm('/service/stat') ? () => serviceApi.progressStat('2026') : null,
    [me?.userType],
  )
  const depts = useQuery<DeptStat[]>(
    hasPerm('/service/stat') ? () => serviceApi.deptStat() : null,
    [me?.userType],
  )
  const notices = useQuery<Notice[]>(() => serviceApi.notices(), [])

  const role = ov.data?.role ?? me?.userType ?? ''
  const isStudent = role === '学生'
  const isTeacher = role === '指导教师' || role === '评阅教师'

  // 卡面直达目标：按权限解析，无权限的卡面不挂跳转，避免点进去是 403
  const links = useMemo(() => {
    return {
      myProject: me?.roles.includes('毕业生') ? '/my-project' : undefined,
      projects: '/projects',
      submission: hasPerm('/process/submit') || hasPerm('/process/review') ? '/process/submission' : undefined,
      pool: hasPerm('/topic/select') ? '/topic/pool' : undefined,
      topicApply: hasPerm('/topic/apply') || hasPerm('/topic/audit') ? '/topic/apply' : undefined,
      extension: hasPerm('/process/extend') ? '/process/extension' : undefined,
      scoreManage: hasPerm('/score/manage') ? '/score/manage' : undefined,
      progress: hasPerm('/process/progress') ? '/process/progress' : undefined,
      users: hasPerm('/auth/user') ? '/auth/user' : undefined,
      notices: hasPerm('/service/notice') ? '/service/notice' : undefined,
      stat: hasPerm('/score/manage') || hasPerm('/service/stat') ? '/service/stat' : undefined,
    }
  }, [hasPerm, me])

  const statItems = useMemo(() => {
    const d = ov.data
    if (!d) return []
    if (isStudent) {
      const s = (d as unknown as Record<string, unknown>).score as
        | { totalScore?: number | null; scoreLevel?: string | null; publishStatus?: string }
        | null
      return [
        { key: 'p', label: '我的课题编号', value: <span className="mono" style={{ fontSize: 17 }}>{(d as unknown as Record<string, string>).projectNo ?? '—'}</span>, desc: (d as unknown as Record<string, string>).topicName ?? '尚未匹配课题', to: links.projects },
        { key: 's', label: '当前阶段', value: (d as unknown as Record<string, string>).stageName ?? '—', desc: (d as unknown as Record<string, string>).deadline ? `截止 ${fmtDateTime((d as unknown as Record<string, string>).deadline)}` : '未设置节点', to: links.myProject },
        { key: 'c', label: '已提交材料', value: `${num((d as unknown as Record<string, unknown>).submittedCount)} 份`, desc: `共 ${num((d as unknown as Record<string, unknown>).totalStage)} 个阶段`, to: links.submission },
        { key: 'sc', label: '总评成绩', value: s?.totalScore != null ? score(s.totalScore) : '未评', desc: s?.scoreLevel ?? s?.publishStatus ?? '成绩尚未发布', to: links.myProject },
      ]
    }
    if (isTeacher) {
      return [
        { key: 't', label: '我申报的题目', value: num((d as unknown as Record<string, unknown>).myTopics), desc: '含待审核与已发布', to: links.topicApply },
        { key: 'st', label: '我指导的学生', value: num((d as unknown as Record<string, unknown>).myStudents), desc: '进行中的课题', to: links.projects },
        { key: 'r', label: '待我评阅', value: num((d as unknown as Record<string, unknown>).pendingReview), desc: '阶段材料评阅任务', to: links.submission },
        { key: 'e', label: '待审批延期', value: num((d as unknown as Record<string, unknown>).pendingExtend), desc: '本人指导学生的申请', to: links.extension },
      ]
    }
    return [
      { key: 'u', label: '系统账号', value: num((d as unknown as Record<string, unknown>).users), desc: `学生 ${num((d as unknown as Record<string, unknown>).students)} · 教师 ${num((d as unknown as Record<string, unknown>).teachers)}`, highlight: true, to: links.users },
      { key: 't', label: '题目总数', value: num((d as unknown as Record<string, unknown>).topics), desc: `待审核 ${num((d as unknown as Record<string, unknown>).pendingTopics)}`, to: links.topicApply },
      { key: 'p', label: '课题总数', value: num((d as unknown as Record<string, unknown>).projects), desc: '已建立师生关系', to: links.projects },
      { key: 'e', label: '待审批延期', value: num((d as unknown as Record<string, unknown>).pendingExtend), desc: '需系主任处理', to: links.extension },
      { key: 's', label: '成绩进度', value: `${num((d as unknown as Record<string, unknown>).publishedScores)}/${num((d as unknown as Record<string, unknown>).publishedScores) + num((d as unknown as Record<string, unknown>).unpublishedScores)}`, desc: '已发布 / 全部', to: links.scoreManage },
      { key: 'n', label: '公告数量', value: num((d as unknown as Record<string, unknown>).notices), desc: `未读消息 ${num((d as unknown as Record<string, unknown>).unread)}`, to: links.notices },
    ]
  }, [ov.data, isStudent, isTeacher, links])

  const columns = progress.data?.length
    ? [
        { key: 'stageName', title: '阶段', render: (r: StageProgressStat) => r.stageName },
        { key: 'total', title: '应交', align: 'right' as const, render: (r: StageProgressStat) => r.total },
        { key: 'submitted', title: '已交', align: 'right' as const, render: (r: StageProgressStat) => r.submitted },
        { key: 'onTime', title: '按时', align: 'right' as const, render: (r: StageProgressStat) => r.onTime },
        { key: 'missing', title: '未交', align: 'right' as const, render: (r: StageProgressStat) => r.missing },
        {
          key: 'rate',
          title: '提交率',
          align: 'right' as const,
          render: (r: StageProgressStat) => (
            <Tag tone={r.missing === 0 ? 'green' : r.missing > 2 ? 'red' : 'amber'}>
              {r.total ? `${Math.round((r.submitted / r.total) * 100)}%` : '—'}
            </Tag>
          ),
        },
      ]
    : []

  return (
    <>
      <PageHead title={`${role || ''}工作台`} desc="按当前身份汇总的毕业设计关键指标与待办事项；点击卡面可直达对应功能" />

      {statItems.length > 0 && <StatGrid items={statItems} onNavigate={(p) => nav(p)} />}

      {hasPerm('/service/stat') && (
        <div className="chart-grid" style={{ marginBottom: 16 }}>
          {/* 整卡可点击直达进度跟踪；无权限时仅展示数据 */}
          <div
            className={`card${links.progress ? ' clickable' : ''}`}
            onClick={links.progress ? () => nav(links.progress!) : undefined}
          >
            <div className="card-head">
              <h3>2026 届各阶段提交情况</h3>
              <div className="grow" />
              {/* 入口按权限渲染：没有进度跟踪权限的身份不放这个按钮，避免点进去是 403 */}
              {links.progress && (
                <button className="btn sm" onClick={() => nav(links.progress!)}>进度跟踪</button>
              )}
            </div>
            <div className="card-body">
              {progress.data && progress.data.length > 0 ? (
                <ColumnChart
                  data={progress.data.map((p) => ({ label: p.stageName, a: p.total, b: p.submitted }))}
                  labelA="应交"
                  labelB="已交"
                />
              ) : (
                <div className="muted">暂无统计数据</div>
              )}
            </div>
          </div>

          <div
            className={`card${links.stat ? ' clickable' : ''}`}
            onClick={links.stat ? () => nav(links.stat!) : undefined}
          >
            <div className="card-head">
              <h3>各院系课题与平均分</h3>
            </div>
            <div className="card-body">
              {depts.data && depts.data.length > 0 ? (
                <Donut
                  data={depts.data.slice(0, 5).map((d, i) => ({
                    label: d.deptName.slice(0, 6),
                    value: d.projectCount,
                    color: ['#c62828', '#e05252', '#ef7a6a', '#f2a097', '#f6c4bd'][i % 5],
                  }))}
                />
              ) : (
                <div className="muted">暂无统计数据</div>
              )}
              {depts.data && depts.data.length > 0 && (
                <div className="muted" style={{ fontSize: 12.5, marginTop: 12 }}>
                  全系平均分 {score(depts.data.reduce((s, d) => s + (d.avgScore ?? 0) * d.publishedCount, 0) / Math.max(1, depts.data.reduce((s, d) => s + d.publishedCount, 0)))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {columns.length > 0 && (
        <div
          className={`card${links.progress ? ' clickable' : ''}`}
          style={{ marginBottom: 16 }}
          onClick={links.progress ? () => nav(links.progress!) : undefined}
        >
          <div className="card-head">
            <h3>阶段提交明细</h3>
          </div>
          <DataTable
            columns={columns}
            rows={progress.data}
            loading={progress.loading}
            error={progress.error}
            rowKey={(r) => r.stageId}
            onRetry={progress.reload}
            pageSize={8}
          />
        </div>
      )}

      <div
        className={`card${links.notices ? ' clickable' : ''}`}
        onClick={links.notices ? () => nav(links.notices!) : undefined}
      >
        <div className="card-head">
          <h3>最新公告</h3>
          <div className="grow" />
          {links.notices && (
            <button className="btn sm" onClick={() => nav(links.notices!)}>
              <Icon name="notice" size={13} /> 查看全部
            </button>
          )}
        </div>
        {notices.loading && <div className="loading">加载中…</div>}
        {notices.data?.slice(0, 4).map((n) => (
          <div className="notice-item clickable" key={n.noticeId} onClick={(e) => { e.stopPropagation(); setDetail(n) }}>
            <h4>
              {n.isTop && <Tag tone="red">置顶</Tag>}
              {n.title}
            </h4>
            <p className="ellipsis" style={{ maxWidth: '100%' }}>{n.content}</p>
            <div className="notice-meta">
              <span>{n.noticeType}</span>
              <span>范围：{(n.scope || '全院').split(',').join('、')}</span>
              <span>{fmtDateTime(n.publishTime)}</span>
            </div>
          </div>
        ))}
        {notices.data?.length === 0 && <div className="empty">暂无公告</div>}
      </div>

      {/* 公告详情弹窗 */}
      <FeedDetail
        open={!!detail}
        data={detail ? {
          kind: 'notice',
          title: detail.title,
          content: detail.content,
          time: detail.publishTime,
          tags: [
            ...(detail.isTop ? [{ text: '置顶', tone: 'red' as const }] : []),
            { text: detail.noticeType, tone: 'blue' as const },
          ],
          meta: [
            { label: '发布范围', value: (detail.scope || '全院').split(',').join('、') },
            { label: '发布人', value: detail.publisher },
          ],
        } : null}
        onClose={() => setDetail(null)}
      />
    </>
  )
}
