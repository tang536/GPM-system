import { useEffect, useMemo, useRef, useState } from 'react'
import { ApiError, processApi, serviceApi, topicApi } from '../../api'
import DataTable from '../../components/DataTable'
import FileLink from '../../components/FileLink'
import LongText from '../../components/LongText'
import Modal from '../../components/Modal'
import { Field, PageHead } from '../../components/State'
import { StatGrid } from '../../components/StatCard'
import Tag from '../../components/Tag'
import { useUI } from '../../components/UIProvider'
import { useAuth } from '../../hooks/useAuth'
import { useQuery } from '../../hooks/useQuery'
import type { Project, Submission } from '../../types'
import { daysLeft, fmtDateTime } from '../../utils/datetime'

/**
 * 过程材料：一个页面服务两类身份——
 * 学生上传阶段材料（含节点提醒）；指导教师/评阅教师对可见材料给出评阅结论。
 * 时间/格式/大小由后端与数据库触发器双重校验。
 */
export default function Submissions() {
  const ui = useUI()
  const { me, hasPerm } = useAuth()
  const isStudent = me?.userType === '学生'
  const isReviewer = hasPerm('/process/review')
  const fileRef = useRef<HTMLInputElement>(null)

  const [kw, setKw] = useState('')
  const [stageId, setStageId] = useState('')
  // 评阅视角默认看"待评阅"，学生视角默认看全部。
  // 注意：默认值必须直接作为 state 初值——若用派生值，select 显示"全部状态"
  // 而数据仍是待评阅，且用户选"全部状态"永远无效
  const [status, setStatus] = useState(hasPerm('/process/review') && me?.userType !== '学生' ? '待评阅' : '')
  const [open, setOpen] = useState(false)
  const [projectNo, setProjectNo] = useState('')
  const [stage, setStage] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [reviewTarget, setReviewTarget] = useState<Submission | null>(null)
  const [conclusion, setConclusion] = useState('通过')
  const [opinion, setOpinion] = useState('')

  const list = useQuery<Submission[]>(() => processApi.submissions(undefined, stageId, kw), [kw, stageId])
  const stages = useQuery(() => processApi.stages('2026'), [])
  // 课题不再让用户手输编号，改为从"本人课题"里选（学生范围内通常只有一条）
  const projects = useQuery<Project[]>(open && isStudent ? () => topicApi.projects() : null, [open, isStudent])

  useEffect(() => {
    if (open && !projectNo && projects.data?.length === 1) setProjectNo(projects.data[0].projectNo)
  }, [open, projectNo, projects.data])

  // 状态筛选即当前生效条件（默认值已在 state 初值中处理）
  const rows = useMemo(
    () => (list.data ?? []).filter((r) => !status || r.auditStatus === status),
    [list.data, status],
  )
  const stats = useMemo(() => {
    const all = list.data ?? []
    return {
      pending: all.filter((r) => r.auditStatus === '待评阅').length,
      pass: all.filter((r) => r.conclusion === '通过').length,
      fail: all.filter((r) => r.conclusion === '不通过').length,
      total: all.length,
    }
  }, [list.data])

  async function submit() {
    if (!projectNo || !stage || !file) {
      ui.err('请选择课题、阶段并选择文件')
      return
    }
    setBusy(true)
    try {
      const up = await serviceApi.upload(file, projectNo)
      await processApi.submit({ projectNo, stageId: Number(stage), filePath: up.path })
      ui.ok('材料提交成功')
      setOpen(false)
      setFile(null)
      if (fileRef.current) fileRef.current.value = ''
      list.reload()
    } catch (e) {
      ui.err(e instanceof ApiError ? e.message : '提交失败')
    } finally {
      setBusy(false)
    }
  }

  async function doReview() {
    if (!reviewTarget) return
    try {
      await processApi.review(reviewTarget.submissionId, conclusion, opinion)
      ui.ok('评阅结果已保存')
      setReviewTarget(null)
      setOpinion('')
      list.reload()
    } catch (e) {
      ui.err(e instanceof ApiError ? e.message : '评阅失败')
    }
  }

  return (
    <>
      <PageHead
        title="过程材料"
        desc="学生按阶段提交材料，指导教师与评阅教师在此给出评阅结论；超出节点时间或格式不符将被数据库触发器拒绝"
      >
        <input
          placeholder={isStudent ? '搜索阶段材料' : '搜索学号 / 学生'}
          value={kw}
          onChange={(e) => setKw(e.target.value)}
          style={{ width: 190 }}
        />
        <select value={stageId} onChange={(e) => setStageId(e.target.value)}>
          <option value="">全部阶段</option>
          {stages.data?.map((s) => <option key={s.stageId} value={s.stageId}>{s.stageName}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">全部状态</option>
          <option value="待评阅">待评阅</option>
          <option value="已评阅">已评阅</option>
        </select>
        {isStudent && (
          <button
            className="btn primary"
            onClick={() => {
              setProjectNo('')
              setStage('')
              setOpen(true)
            }}
          >
            提交材料
          </button>
        )}
      </PageHead>

      {isReviewer && !isStudent && (
        <StatGrid
          items={[
            { key: 'p', label: '待评阅', value: stats.pending, desc: '需要我处理的材料', highlight: stats.pending > 0 },
            { key: 'a', label: '已通过', value: stats.pass, desc: '结论为通过' },
            { key: 'f', label: '未通过', value: stats.fail, desc: '需学生修改后重交' },
            { key: 't', label: '可见材料总数', value: stats.total, desc: '受数据范围约束' },
          ]}
        />
      )}

      {isStudent && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-head">
            <h3>2026 届阶段节点</h3>
            <div className="grow" />
            <span className="muted" style={{ fontSize: 12.5 }}>逾期提交需先申请延期</span>
          </div>
          <div className="card-body" style={{ display: 'grid', gap: 10 }}>
            {stages.data?.map((s) => {
              const d = daysLeft(s.deadline)
              return (
                <div key={s.stageId} style={{ display: 'flex', gap: 12, alignItems: 'center', fontSize: 13 }}>
                  <b style={{ minWidth: 88 }}>{s.stageName}</b>
                  <span className="muted">{fmtDateTime(s.deadline)}</span>
                  {d === null ? null : d < 0 ? <Tag tone="red">已截止</Tag> : <Tag tone={d <= 7 ? 'amber' : 'green'}>剩 {d} 天</Tag>}
                  <span className="muted mono" style={{ marginLeft: 'auto', fontSize: 12 }}>{s.allowFormat}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="card">
        <DataTable
          rows={rows}
          loading={list.loading}
          error={list.error}
          onRetry={list.reload}
          rowKey={(r) => r.submissionId}
          pageSize={12}
          empty={isReviewer && !isStudent ? '没有需要评阅的材料' : '暂无提交记录'}
          columns={[
            // 学生只看自己的材料：隐藏课题编号/学生/学号等自我标识列
            { key: 'projectNo', title: '课题编号', hideFor: ['学生'], render: (r) => <span className="mono">{r.projectNo}</span> },
            { key: 'studentName', title: '学生', hideFor: ['学生'], render: (r) => <b>{r.studentName}</b> },
            { key: 'studentNo', title: '学号', hideFor: ['学生'], render: (r) => <span className="mono">{r.studentNo}</span> },
            { key: 'stageName', title: '阶段', render: (r) => <Tag tone="blue">{r.stageName}</Tag> },
            { key: 'version', title: '版本', align: 'right', render: (r) => `v${r.version}` },
            { key: 'filePath', title: '文件', render: (r) => <FileLink path={r.filePath} /> },
            { key: 'submitTime', title: '提交时间', render: (r) => fmtDateTime(r.submitTime) },
            { key: 'auditStatus', title: '状态', render: (r) => <Tag>{r.auditStatus}</Tag> },
            { key: 'conclusion', title: '结论', render: (r) => (r.conclusion ? <Tag>{r.conclusion}</Tag> : <span className="muted">—</span>) },
            { key: 'opinion', title: '评阅意见', render: (r) => <LongText text={r.opinion} title="评阅意见" subtitle={`${r.stageName} · v${r.version}`} /> },
            {
              key: 'op',
              title: '操作',
              render: (r) =>
                isReviewer ? (
                  <button
                    className={`btn sm${r.auditStatus === '待评阅' ? ' primary' : ''}`}
                    onClick={() => { setReviewTarget(r); setConclusion(r.conclusion ?? '通过'); setOpinion(r.opinion ?? '') }}
                  >
                    {r.auditStatus === '待评阅' ? '评阅' : '修改意见'}
                  </button>
                ) : (
                  <span className="muted" style={{ fontSize: 12.5 }}>{r.conclusion ?? '—'}</span>
                ),
            },
          ]}
        />
      </div>

      <Modal
        open={open}
        title="提交阶段材料"
        onClose={() => setOpen(false)}
        footer={
          <>
            <button className="btn" onClick={() => setOpen(false)}>取消</button>
            <button className="btn primary" disabled={busy} onClick={submit}>{busy ? '上传中…' : '上传并提交'}</button>
          </>
        }
      >
        <Field label="所属课题">
          <select value={projectNo} onChange={(e) => setProjectNo(e.target.value)}>
            <option value="">请选择本人课题</option>
            {projects.data?.map((p) => (
              <option key={p.projectNo} value={p.projectNo}>
                {p.topicName}（{p.teacherName} 指导）
              </option>
            ))}
          </select>
        </Field>
        <Field label="提交阶段">
          <select value={stage} onChange={(e) => setStage(e.target.value)}>
            <option value="">请选择阶段</option>
            {stages.data?.map((s) => (
              <option key={s.stageId} value={s.stageId}>{s.stageName}（截止 {fmtDateTime(s.deadline)}）</option>
            ))}
          </select>
        </Field>
        <Field label="材料文件（pdf / doc / docx / zip，≤20MB）">
          <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.zip" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </Field>
        <p className="muted" style={{ fontSize: 12.5 }}>
          系统会校验当前时间是否处于该阶段节点内，并按阶段配置校验文件格式与大小；重复提交将生成新的版本号。
        </p>
      </Modal>

      <Modal
        open={!!reviewTarget}
        title="材料评阅"
        onClose={() => setReviewTarget(null)}
        footer={
          <>
            <button className="btn" onClick={() => setReviewTarget(null)}>取消</button>
            <button className="btn primary" onClick={doReview}>保存评阅</button>
          </>
        }
      >
        {reviewTarget && (
          <>
            <dl className="kv" style={{ marginBottom: 14 }}>
              <dt>学生</dt>
              <dd><b>{reviewTarget.studentName}</b>（{reviewTarget.studentNo}）</dd>
              <dt>课题</dt>
              <dd className="mono">{reviewTarget.projectNo}</dd>
              <dt>阶段</dt>
              <dd>{reviewTarget.stageName} · v{reviewTarget.version}</dd>
              <dt>文件</dt>
              <dd><FileLink path={reviewTarget.filePath} download /></dd>
              <dt>提交时间</dt>
              <dd>{fmtDateTime(reviewTarget.submitTime)}</dd>
            </dl>
            <Field label="评阅结论">
              <select value={conclusion} onChange={(e) => setConclusion(e.target.value)}>
                <option value="通过">通过</option>
                <option value="不通过">不通过</option>
              </select>
            </Field>
            <Field label="评阅意见">
              <textarea value={opinion} onChange={(e) => setOpinion(e.target.value)} placeholder="指出问题与修改建议，学生将在本页看到" />
            </Field>
          </>
        )}
      </Modal>
    </>
  )
}
