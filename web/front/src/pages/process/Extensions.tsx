import { useEffect, useState } from 'react'
import { ApiError, processApi, topicApi } from '../../api'
import DataTable from '../../components/DataTable'
import LongText from '../../components/LongText'
import Modal from '../../components/Modal'
import { Field, PageHead } from '../../components/State'
import Tag from '../../components/Tag'
import { useUI } from '../../components/UIProvider'
import { useAuth } from '../../hooks/useAuth'
import { useQuery } from '../../hooks/useQuery'
import type { Extension, Project } from '../../types'
import { fmtDateTime } from '../../utils/datetime'

/** 延期申请：学生发起、指导教师与系主任审批，批准后放宽该阶段截止校验 */
export default function Extensions() {
  const ui = useUI()
  const { me, inRole } = useAuth()
  const isStudent = me?.userType === '学生'
  // 审批只属于指导教师与系主任，管理员仅做系统维护，不参与审批
  const canApprove = inRole('系主任') || inRole('指导教师')

  const [kw, setKw] = useState('')
  const [open, setOpen] = useState(false)
  const [projectNo, setProjectNo] = useState('')
  const [stageId, setStageId] = useState('')
  const [reason, setReason] = useState('')
  const [delayDays, setDelayDays] = useState(3)
  const [target, setTarget] = useState<Extension | null>(null)
  const [pass, setPass] = useState(true)
  const [approveDays, setApproveDays] = useState(3)

  const list = useQuery<Extension[]>(() => processApi.extensions(kw), [kw])
  const stages = useQuery(() => processApi.stages('2026'), [])
  // 延期申请同样不再手输课题编号，从本人课题中选择
  const projects = useQuery<Project[]>(open && isStudent ? () => topicApi.projects() : null, [open, isStudent])

  useEffect(() => {
    if (open && !projectNo && projects.data?.length === 1) setProjectNo(projects.data[0].projectNo)
  }, [open, projectNo, projects.data])

  async function apply() {
    if (!projectNo || !stageId || !reason.trim()) {
      ui.err('请选择课题与阶段，并填写延期理由')
      return
    }
    try {
      await processApi.applyExtension({ projectNo, stageId: Number(stageId), reason, delayDays })
      ui.ok('延期申请已提交')
      setOpen(false)
      list.reload()
    } catch (e) {
      ui.err(e instanceof ApiError ? e.message : '提交失败')
    }
  }

  async function approve() {
    if (!target) return
    try {
      await processApi.approve(target.requestId, pass ? '同意' : '拒绝', pass ? approveDays : undefined)
      ui.ok(pass ? '已批准延期' : '已拒绝申请')
      setTarget(null)
      list.reload()
    } catch (e) {
      ui.err(e instanceof ApiError ? e.message : '审批失败')
    }
  }

  return (
    <>
      <PageHead title="延期申请" desc="延期需说明原因与天数，经审批后该阶段的截止校验相应放宽">
        <input placeholder="搜索学号 / 学生" value={kw} onChange={(e) => setKw(e.target.value)} style={{ width: 200 }} />
        {isStudent && <button className="btn primary" onClick={() => setOpen(true)}>申请延期</button>}
      </PageHead>

      <div className="card">
        <DataTable
          rows={list.data}
          loading={list.loading}
          error={list.error}
          onRetry={list.reload}
          rowKey={(r) => r.requestId}
          pageSize={10}
          empty="暂无延期申请"
          columns={[
            { key: 'projectNo', title: '课题编号', render: (r) => <span className="mono">{r.projectNo}</span> },
            { key: 'studentName', title: '学生', render: (r) => <b>{r.studentName}</b> },
            { key: 'stageName', title: '阶段', render: (r) => <Tag tone="blue">{r.stageName}</Tag> },
            { key: 'reason', title: '延期理由', render: (r) => <LongText text={r.reason} title="延期理由" subtitle={`${r.studentName} · ${r.stageName}`} /> },
            { key: 'delayDays', title: '申请天数', align: 'right', render: (r) => (r.delayDays ? `${r.delayDays} 天` : '—') },
            { key: 'applyTime', title: '申请时间', render: (r) => fmtDateTime(r.applyTime) },
            { key: 'result', title: '审批结果', render: (r) => <Tag>{r.result}</Tag> },
            { key: 'approverName', title: '审批人', render: (r) => r.approverName ?? '—' },
            {
              key: 'op',
              title: '操作',
              render: (r) =>
                canApprove && r.result === '待审批' ? (
                  <button className="btn sm primary" onClick={() => { setTarget(r); setPass(true); setApproveDays(r.delayDays ?? 3) }}>审批</button>
                ) : (
                  <span className="muted" style={{ fontSize: 12.5 }}>—</span>
                ),
            },
          ]}
        />
      </div>

      <Modal
        open={open}
        title="申请延期"
        onClose={() => setOpen(false)}
        footer={
          <>
            <button className="btn" onClick={() => setOpen(false)}>取消</button>
            <button className="btn primary" onClick={apply}>提交申请</button>
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
        <Field label="延期阶段">
          <select value={stageId} onChange={(e) => setStageId(e.target.value)}>
            <option value="">请选择阶段</option>
            {stages.data?.map((s) => <option key={s.stageId} value={s.stageId}>{s.stageName}</option>)}
          </select>
        </Field>
        <Field label="申请延期天数">
          <input type="number" min={1} max={30} value={delayDays} onChange={(e) => setDelayDays(Number(e.target.value))} />
        </Field>
        <Field label="延期理由">
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="如：实验设备故障导致数据采集延后，申请延期 4 天" />
        </Field>
      </Modal>

      <Modal
        open={!!target}
        title="审批延期申请"
        onClose={() => setTarget(null)}
        footer={
          <>
            <button className="btn" onClick={() => setTarget(null)}>取消</button>
            <button className="btn danger" onClick={() => { setPass(false); approve() }}>拒绝</button>
            <button className="btn primary" onClick={() => { setPass(true); approve() }}>同意</button>
          </>
        }
      >
        {target && (
          <>
            <dl className="kv" style={{ marginBottom: 14 }}>
              <dt>学生</dt>
              <dd>{target.studentName}（{target.studentNo}）</dd>
              <dt>阶段</dt>
              <dd>{target.stageName}</dd>
              <dt>申请天数</dt>
              <dd>{target.delayDays ?? '—'} 天</dd>
              <dt>理由</dt>
              <dd>{target.reason}</dd>
            </dl>
            <Field label="批准天数">
              <input type="number" min={1} max={30} value={approveDays} onChange={(e) => setApproveDays(Number(e.target.value))} />
            </Field>
          </>
        )}
      </Modal>
    </>
  )
}
