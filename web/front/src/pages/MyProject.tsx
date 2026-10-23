import { useNavigate } from 'react-router-dom'
import { processApi, scoreApi, serviceApi } from '../api'
import { BarList } from '../components/Chart'
import DataTable from '../components/DataTable'
import FileLink from '../components/FileLink'
import LongText from '../components/LongText'
import { PageHead, Empty, Loading } from '../components/State'
import { StatGrid } from '../components/StatCard'
import Tag, { LevelTag } from '../components/Tag'
import { useAuth } from '../hooks/useAuth'
import { useQuery } from '../hooks/useQuery'
import type { ProgressRow, ScoreRow, Submission, TaskBook } from '../types'
import { daysLeft, fmtDateTime } from '../utils/datetime'
import { score } from '../utils/format'

interface StudentOverview {
  role: string
  projectNo?: string | null
  topicName?: string | null
  teacherName?: string | null
  stageName?: string | null
  deadline?: string | null
  submittedCount: number
  totalStage: number
  score?: ScoreRow | null
}

/** 工作台：毕业生一站式查看课题、任务书、阶段节点、提交记录与成绩 */
export default function MyProject() {
  const { me } = useAuth()
  const nav = useNavigate()
  const ov = useQuery<StudentOverview>(
    () => serviceApi.overview() as unknown as Promise<StudentOverview>,
    [me?.id],
  )
  const projectNo = ov.data?.projectNo ?? ''

  const progress = useQuery<ProgressRow[]>(
    projectNo ? () => processApi.progress(projectNo) : null,
    [projectNo],
  )
  const subs = useQuery<Submission[]>(
    projectNo ? () => processApi.submissions(projectNo) : null,
    [projectNo],
  )
  const scores = useQuery<ScoreRow[]>(() => scoreApi.list(), [me?.id])
  const taskBooks = useQuery<TaskBook[]>(
    projectNo ? () => processApi.taskBooks(projectNo, '') : null,
    [projectNo],
  )
  const tb = taskBooks.data?.[0] ?? null

  const myScore = ov.data?.score ?? scores.data?.[0] ?? null
  const left = daysLeft(ov.data?.deadline)

  if (ov.loading) return <Loading />
  if (!ov.data?.projectNo) {
    return (
      <>
        <PageHead title="工作台" desc="课题尚未建立，请先在「学生选题」中填报志愿并等待互选确认" />
        <div className="card">
          <Empty text="暂无课题记录" icon="○" />
        </div>
      </>
    )
  }

  return (
    <>
      <PageHead title="工作台" desc="课题信息、任务书、阶段节点、材料提交与成绩的一站式总览" />

      <StatGrid
        items={[
          { key: 'p', label: '课题编号', value: <span className="mono" style={{ fontSize: 16 }}>{ov.data.projectNo}</span>, desc: ov.data.topicName ?? '', highlight: true },
          { key: 's', label: '当前阶段', value: ov.data.stageName ?? '—', desc: ov.data.deadline ? `截止 ${fmtDateTime(ov.data.deadline)}${left !== null && left >= 0 ? `（剩 ${left} 天）` : '（已截止）'}` : '未设置节点' },
          { key: 'c', label: '已提交材料', value: `${ov.data.submittedCount} / ${ov.data.totalStage}`, desc: '阶段材料提交进度' },
          { key: 'sc', label: '总评成绩', value: myScore?.totalScore != null ? score(myScore.totalScore) : '未评', desc: myScore ? `${myScore.scoreLevel ?? ''} · ${myScore.publishStatus}` : '成绩尚未发布' },
        ]}
      />

      <div className="split" style={{ marginBottom: 16 }}>
        <div className="card">
          <div className="card-head">
            <h3>阶段节点进度</h3>
          </div>
          <div className="card-body">
            {progress.data && progress.data.length > 0 ? (
              <BarList
                data={progress.data.map((p) => ({
                  label: p.stageName,
                  value: p.submitStatus === '已提交' ? 100 : p.submitStatus === '逾期' ? 50 : 0,
                }))}
                max={100}
                unit="%"
              />
            ) : (
              <div className="muted">暂无阶段数据</div>
            )}
            <div className="legend" style={{ marginTop: 14 }}>
              <span><i style={{ background: 'var(--brand)' }} />已提交</span>
              <span><i style={{ background: 'var(--brand-line)' }} />未完成</span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <h3>成绩构成</h3>
            <div className="grow" />
            {myScore && <LevelTag level={myScore.scoreLevel} />}
          </div>
          <div className="card-body">
            {myScore ? (
              <dl className="kv">
                <dt>过程成绩</dt>
                <dd>{score(myScore.processScore)}（40%）</dd>
                <dt>评阅成绩</dt>
                <dd>{score(myScore.reviewScore)}（30%）</dd>
                <dt>答辩成绩</dt>
                <dd>{score(myScore.defenseScore)}（30%）</dd>
                <dt>总评</dt>
                <dd><b style={{ color: 'var(--brand)', fontSize: 18 }}>{score(myScore.totalScore)}</b></dd>
                <dt>发布状态</dt>
                <dd><Tag>{myScore.publishStatus}</Tag></dd>
              </dl>
            ) : (
              <div className="muted">成绩尚未录入</div>
            )}
            <p className="muted" style={{ fontSize: 12.5, marginBottom: 0 }}>
              总评由视图 v_score_report 按权重实时计算，成绩发布后分项成绩不可修改。
            </p>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h3>任务书</h3>
          <div className="grow" />
          {tb && <Tag>{tb.confirmStatus}</Tag>}
          <button className="btn sm" style={{ marginLeft: 8 }} onClick={() => nav('/process/task')}>在任务书中查看 / 确认 →</button>
        </div>
        <div className="card-body">
          {tb ? (
            <>
              <dl className="kv">
                <dt>指导教师</dt>
                <dd>{tb.teacherName}</dd>
                <dt>下达时间</dt>
                <dd>{fmtDateTime(tb.issueTime)}</dd>
              </dl>
              {tb.designTask && (
                <div style={{ marginTop: 12 }}>
                  <div className="muted" style={{ fontSize: 12.5, marginBottom: 4 }}>设计任务</div>
                  <LongText text={tb.designTask} title="设计任务" subtitle={tb.topicName} />
                </div>
              )}
              {tb.techRequirement && (
                <div style={{ marginTop: 12 }}>
                  <div className="muted" style={{ fontSize: 12.5, marginBottom: 4 }}>技术要求</div>
                  <LongText text={tb.techRequirement} title="技术要求" subtitle={tb.topicName} />
                </div>
              )}
              {tb.schedule && (
                <div style={{ marginTop: 12 }}>
                  <div className="muted" style={{ fontSize: 12.5, marginBottom: 4 }}>进度安排</div>
                  <LongText text={tb.schedule} title="进度安排" subtitle={tb.topicName} />
                </div>
              )}
            </>
          ) : (
            <div className="muted">暂无任务书，请等待指导教师下达</div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h3>我的提交记录</h3>
          <div className="grow" />
          <button className="btn sm" onClick={() => nav('/process/submission')}>在过程材料中管理 →</button>
        </div>
        <DataTable
          rows={subs.data?.slice(0, 5)}
          loading={subs.loading}
          error={subs.error}
          onRetry={subs.reload}
          rowKey={(r) => r.submissionId}
          empty="还没有提交过材料"
          columns={[
            { key: 'stageName', title: '阶段', render: (r) => <Tag tone="blue">{r.stageName}</Tag> },
            { key: 'version', title: '版本', align: 'right', render: (r) => `v${r.version}` },
            { key: 'filePath', title: '文件', render: (r) => <FileLink path={r.filePath} /> },
            { key: 'submitTime', title: '提交时间', render: (r) => fmtDateTime(r.submitTime) },
            { key: 'auditStatus', title: '评阅状态', render: (r) => <Tag>{r.auditStatus}</Tag> },
            { key: 'conclusion', title: '评阅结论', render: (r) => (r.conclusion ? <Tag>{r.conclusion}</Tag> : '—') },
            { key: 'opinion', title: '评阅意见', render: (r) => <LongText text={r.opinion} title="评阅意见" subtitle={`${r.stageName} · v${r.version}`} /> },
          ]}
        />
        {subs.data && subs.data.length > 5 && (
          <p className="muted" style={{ fontSize: 12.5, margin: '8px 0 0' }}>仅显示最近 5 条，全部记录请在「过程材料」中查看。</p>
        )}
      </div>
    </>
  )
}
