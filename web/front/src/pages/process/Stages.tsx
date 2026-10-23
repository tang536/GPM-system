import { useState } from 'react'
import { ApiError, baseApi, processApi } from '../../api'
import DataTable from '../../components/DataTable'
import Modal from '../../components/Modal'
import { Field, PageHead } from '../../components/State'
import Tag from '../../components/Tag'
import { useUI } from '../../components/UIProvider'
import { useAuth } from '../../hooks/useAuth'
import { useQuery } from '../../hooks/useQuery'
import type { Stage } from '../../types'
import { daysLeft, fmtDateTime, toLocalInput } from '../../utils/datetime'

/** 阶段与节点：每个阶段设置起止时间、允许格式、大小上限与是否允许逾期提交 */
export default function Stages() {
  const ui = useUI()
  const { inRole, isAdmin } = useAuth()
  // 阶段时间节点由系主任与系统管理员维护（报告 3.2 节：管理员配置阶段节点）
  const canEdit = isAdmin || inRole('系主任')
  const [cohort, setCohort] = useState('2026')
  const [target, setTarget] = useState<Stage | null>(null)
  const [form, setForm] = useState({ startTime: '', deadline: '', allowFormat: '', maxSize: 20, allowLate: false })

  const cohorts = useQuery(() => baseApi.cohorts(), [])
  const list = useQuery<Stage[]>(() => processApi.stages(cohort), [cohort])

  function openEdit(s: Stage) {
    setTarget(s)
    setForm({
      startTime: toLocalInput(s.startTime),
      deadline: toLocalInput(s.deadline),
      allowFormat: s.allowFormat ?? 'pdf,doc,docx,zip',
      maxSize: s.maxSize ?? 20,
      allowLate: s.allowLate,
    })
  }

  async function save() {
    if (!target) return
    if (!form.startTime || !form.deadline) {
      ui.err('开始时间与截止时间不能为空')
      return
    }
    try {
      await processApi.saveNode(target.stageId, form)
      ui.ok('节点已保存，触发器将按新时间校验后续提交')
      setTarget(null)
      list.reload()
    } catch (e) {
      ui.err(e instanceof ApiError ? e.message : '保存失败')
    }
  }

  return (
    <>
      <PageHead title="阶段与节点" desc="阶段顺序固定，时间节点可逐年调整；提交校验由数据库触发器 trg_submission_bi 兜底">
        <select value={cohort} onChange={(e) => setCohort(e.target.value)}>
          {(cohorts.data ?? [{ cohort: '2026' }]).map((c) => (
            <option key={c.cohort} value={c.cohort}>{c.cohort} 届</option>
          ))}
        </select>
      </PageHead>

      <div className="card">
        <DataTable
          rows={list.data}
          loading={list.loading}
          error={list.error}
          onRetry={list.reload}
          rowKey={(r) => r.stageId}
          empty="该届尚未配置阶段"
          columns={[
            { key: 'stageOrder', title: '顺序', align: 'right', render: (r) => r.stageOrder },
            { key: 'stageName', title: '阶段名称', render: (r) => <b>{r.stageName}</b> },
            { key: 'startTime', title: '开始时间', render: (r) => fmtDateTime(r.startTime) },
            { key: 'deadline', title: '截止时间', render: (r) => fmtDateTime(r.deadline) },
            {
              key: 'left',
              title: '剩余',
              render: (r) => {
                const d = daysLeft(r.deadline)
                if (d === null) return '—'
                if (d < 0) return <Tag tone="red">已截止 {Math.abs(d)} 天</Tag>
                return <Tag tone={d <= 7 ? 'amber' : 'green'}>{d} 天</Tag>
              },
            },
            { key: 'allowFormat', title: '允许格式', render: (r) => <span className="mono">{r.allowFormat ?? '—'}</span> },
            { key: 'maxSize', title: '大小上限', align: 'right', render: (r) => `${r.maxSize ?? '—'} MB` },
            { key: 'allowLate', title: '逾期提交', render: (r) => <Tag tone={r.allowLate ? 'green' : 'red'}>{r.allowLate ? '允许' : '禁止'}</Tag> },
            {
              key: 'op',
              title: '操作',
              render: (r) =>
                canEdit ? (
                  <button className="btn sm" onClick={() => openEdit(r)}>设置节点</button>
                ) : (
                  <span className="muted" style={{ fontSize: 12.5 }}>只读</span>
                ),
            },
          ]}
        />
      </div>

      <Modal
        open={!!target}
        title={`设置节点 · ${target?.stageName ?? ''}`}
        onClose={() => setTarget(null)}
        footer={
          <>
            <button className="btn" onClick={() => setTarget(null)}>取消</button>
            <button className="btn primary" onClick={save}>保存</button>
          </>
        }
      >
        <div className="grid2">
          <Field label="开始时间">
            <input type="datetime-local" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
          </Field>
          <Field label="截止时间">
            <input type="datetime-local" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
          </Field>
          <Field label="允许的文件格式">
            <input value={form.allowFormat} onChange={(e) => setForm({ ...form, allowFormat: e.target.value })} placeholder="pdf,doc,docx,zip" />
          </Field>
          <Field label="大小上限（MB）">
            <input type="number" value={form.maxSize} onChange={(e) => setForm({ ...form, maxSize: Number(e.target.value) })} />
          </Field>
          <Field label="是否允许逾期提交" span>
            <div className="check-row">
              <label>
                <input type="checkbox" checked={form.allowLate} onChange={(e) => setForm({ ...form, allowLate: e.target.checked })} />
                允许在截止时间之后提交（成绩将标注逾期）
              </label>
            </div>
          </Field>
        </div>
      </Modal>
    </>
  )
}
