import { useState } from 'react'
import { ApiError, scoreApi, userApi } from '../../api'
import DataTable from '../../components/DataTable'
import Modal from '../../components/Modal'
import { Field, PageHead } from '../../components/State'
import Tag from '../../components/Tag'
import { useUI } from '../../components/UIProvider'
import { useAuth } from '../../hooks/useAuth'
import { useQuery } from '../../hooks/useQuery'
import type { DefenseArrange, DefenseGroup } from '../../types'
import { fmtDateTime, toLocalInput } from '../../utils/datetime'
import { score } from '../../utils/format'

const blank = { cohort: '2026', majorCode: '', leaderNo: '', place: '', defenseTime: '' }

/** 答辩管理：分组（组长/时间/地点）+ 安排 + 组长按四维量表评分 */
export default function Defense() {
  const ui = useUI()
  const { inRole } = useAuth()
  // 答辩分组与安排由系主任组织，组长只负责评分
  const isDean = inRole('系主任')
  const [tab, setTab] = useState<'group' | 'arrange'>('group')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<DefenseGroup | null>(null)
  const [form, setForm] = useState(blank)
  const [groupId, setGroupId] = useState('')

  const [target, setTarget] = useState<DefenseArrange | null>(null)
  const [scores, setScores] = useState<Record<string, string>>({})
  const [remarks, setRemarks] = useState<Record<string, string>>({})

  const groups = useQuery<DefenseGroup[]>(() => scoreApi.groups(), [])
  const arranges = useQuery<DefenseArrange[]>(() => scoreApi.arranges(groupId), [groupId])
  const teachers = useQuery(() => userApi.teachers(), [])
  const dims = useQuery(() => scoreApi.dims(), [])

  function openAdd() {
    setEditing(null)
    setForm({ ...blank })
    setOpen(true)
  }

  function openEdit(g: DefenseGroup) {
    setEditing(g)
    setForm({
      cohort: g.cohort,
      majorCode: g.majorCode ?? '',
      leaderNo: g.leaderNo,
      place: g.place ?? '',
      defenseTime: toLocalInput(g.defenseTime),
    })
    setOpen(true)
  }

  async function save() {
    if (!form.leaderNo || !form.place || !form.defenseTime) {
      ui.err('请填写答辩组长、地点与时间')
      return
    }
    try {
      if (editing) await scoreApi.updateGroup(editing.groupId, form)
      else await scoreApi.addGroup(form)
      ui.ok('已保存')
      setOpen(false)
      groups.reload()
    } catch (e) {
      ui.err(e instanceof ApiError ? e.message : '保存失败')
    }
  }

  function openScore(a: DefenseArrange) {
    setTarget(a)
    const s: Record<string, string> = {}
    const r: Record<string, string> = {}
    for (const d of a.dims) {
      s[d.dimension] = d.score != null ? String(d.score) : ''
      r[d.dimension] = d.remark ?? ''
    }
    setScores(s)
    setRemarks(r)
  }

  async function saveScore() {
    if (!target) return
    const items = target.dims.map((d) => ({
      dimension: d.dimension,
      score: Number(scores[d.dimension] ?? 0),
      remark: remarks[d.dimension] || undefined,
    }))
    if (items.some((i) => Number.isNaN(i.score) || i.score < 0)) {
      ui.err('请填写有效的评分')
      return
    }
    try {
      await scoreApi.saveDefenseScore(target.arrangeId ?? 0, items)
      ui.ok('答辩评分已保存，答辩成绩自动汇总')
      setTarget(null)
      arranges.reload()
    } catch (e) {
      ui.err(e instanceof ApiError ? e.message : '保存失败')
    }
  }

  return (
    <>
      <PageHead title="答辩管理" desc="按专业分组安排答辩；组长按「选题与综述 / 设计与实现 / 论文规范 / 答辩表现」四维评分">
        {tab === 'arrange' && (
          <select value={groupId} onChange={(e) => setGroupId(e.target.value)}>
            <option value="">全部答辩组</option>
            {groups.data?.map((g) => (
              <option key={g.groupId} value={g.groupId}>第 {g.groupId} 组 · {g.leaderName}</option>
            ))}
          </select>
        )}
        {tab === 'group' && isDean && <button className="btn primary" onClick={openAdd}>新建答辩组</button>}
      </PageHead>

      <div className="card">
        <div className="tabs">
          <button className={`tab${tab === 'group' ? ' active' : ''}`} onClick={() => setTab('group')}>答辩分组</button>
          <button className={`tab${tab === 'arrange' ? ' active' : ''}`} onClick={() => setTab('arrange')}>答辩安排与评分</button>
        </div>

        {tab === 'group' ? (
          <DataTable
            rows={groups.data}
            loading={groups.loading}
            error={groups.error}
            onRetry={groups.reload}
            rowKey={(r) => r.groupId}
            empty="暂无答辩分组"
            columns={[
              { key: 'groupId', title: '组号', align: 'right', render: (r) => r.groupId },
              { key: 'cohort', title: '届别', render: (r) => `${r.cohort} 届` },
              { key: 'majorName', title: '专业', render: (r) => r.majorName ?? '不分专业' },
              { key: 'leaderName', title: '答辩组长', render: (r) => <b>{r.leaderName}</b> },
              { key: 'place', title: '地点', render: (r) => r.place ?? '—' },
              { key: 'defenseTime', title: '答辩时间', render: (r) => fmtDateTime(r.defenseTime) },
              { key: 'arrangeCount', title: '学生数', align: 'right', render: (r) => <Tag tone="blue">{r.arrangeCount}</Tag> },
              {
                key: 'op',
                title: '操作',
                render: (r) =>
                  !isDean ? (
                    <span className="muted" style={{ fontSize: 12.5 }}>系主任组织</span>
                  ) : (
                  <div className="row-actions">
                    <button className="btn sm" onClick={() => openEdit(r)}>编辑</button>
                    <button
                      className="btn sm danger"
                      onClick={async () => {
                        if (!(await ui.confirm(`删除第 ${r.groupId} 答辩组？组内安排将一并解除。`))) return
                        try {
                          await scoreApi.delGroup(r.groupId)
                          ui.ok('已删除')
                          groups.reload()
                        } catch (e) {
                          ui.err(e instanceof ApiError ? e.message : '删除失败')
                        }
                      }}
                    >
                      删除
                    </button>
                  </div>
                ),
              },
            ]}
          />
        ) : (
          <DataTable
            rows={arranges.data}
            loading={arranges.loading}
            error={arranges.error}
            onRetry={arranges.reload}
            rowKey={(r) => `${r.groupId}-${r.projectNo}`}
            pageSize={12}
            empty="暂无答辩安排"
            columns={[
              { key: 'groupId', title: '组号', align: 'right', render: (r) => r.groupId },
              { key: 'defenseOrder', title: '顺序', align: 'right', render: (r) => r.defenseOrder },
              { key: 'studentName', title: '学生', render: (r) => <b>{r.studentName}</b> },
              { key: 'topicName', title: '题目', render: (r) => <span className="ellipsis" title={r.topicName}>{r.topicName}</span> },
              { key: 'teacherName', title: '指导教师' },
              { key: 'dims', title: '分项', render: (r) => r.dims.map((d) => `${d.dimension.slice(0, 2)}${d.score ?? '-'}`).join(' / ') },
              { key: 'subtotal', title: '答辩分', align: 'right', render: (r) => <b>{score(r.subtotal)}</b> },
              { key: 'place', title: '地点', render: (r) => r.place ?? '—' },
              {
                key: 'op',
                title: '操作',
                render: (r) => (
                  <button className="btn sm" disabled={!r.canScore} onClick={() => openScore(r)} title={r.canScore ? '' : '仅答辩组长可评分'}>
                    {r.canScore ? '评分' : '无权限'}
                  </button>
                ),
              },
            ]}
          />
        )}
      </div>

      <Modal
        open={open}
        title={editing ? '编辑答辩组' : '新建答辩组'}
        subtitle={editing ? <>答辩组编号 <span className="mono">{editing.groupId}</span></> : '设置答辩组名称、组长与适用专业'}
        onClose={() => setOpen(false)}
        footer={
          <>
            <button className="btn" onClick={() => setOpen(false)}>取消</button>
            <button className="btn primary" onClick={save}>保存</button>
          </>
        }
      >
        <div className="grid2">
          <Field label="届别">
            <input value={form.cohort} onChange={(e) => setForm({ ...form, cohort: e.target.value })} />
          </Field>
          <Field label="答辩组长">
            <select value={form.leaderNo} onChange={(e) => setForm({ ...form, leaderNo: e.target.value })}>
              <option value="">请选择教师</option>
              {teachers.data?.map((t) => (
                <option key={t.teacherNo} value={t.teacherNo}>{t.name} · {t.title ?? '教师'}</option>
              ))}
            </select>
          </Field>
          <Field label="答辩地点">
            <input value={form.place} onChange={(e) => setForm({ ...form, place: e.target.value })} placeholder="如 信息楼 305" />
          </Field>
          <Field label="答辩时间">
            <input type="datetime-local" value={form.defenseTime} onChange={(e) => setForm({ ...form, defenseTime: e.target.value })} />
          </Field>
        </div>
      </Modal>

      <Modal
        open={!!target}
        title="答辩评分"
        onClose={() => setTarget(null)}
        footer={
          <>
            <button className="btn" onClick={() => setTarget(null)}>取消</button>
            <button className="btn primary" onClick={saveScore}>保存评分</button>
          </>
        }
      >
        {target && (
          <>
            <dl className="kv" style={{ marginBottom: 14 }}>
              <dt>学生</dt>
              <dd><b>{target.studentName}</b>（{target.studentNo}）</dd>
              <dt>题目</dt>
              <dd>{target.topicName}</dd>
              <dt>答辩安排</dt>
              <dd>第 {target.groupId} 组 · {target.defenseOrder} 号 · {fmtDateTime(target.defenseTime)} · {target.place ?? '—'}</dd>
            </dl>
            {(dims.data ?? target.dims).map((d) => (
              <div className="grid2" key={d.dimension}>
                <Field label={`${d.dimension}（满分 ${d.max}）`}>
                  <input
                    type="number"
                    min={0}
                    max={d.max}
                    value={scores[d.dimension] ?? ''}
                    onChange={(e) => setScores({ ...scores, [d.dimension]: e.target.value })}
                  />
                </Field>
                <Field label="评语">
                  <input value={remarks[d.dimension] ?? ''} onChange={(e) => setRemarks({ ...remarks, [d.dimension]: e.target.value })} />
                </Field>
              </div>
            ))}
            <p className="muted" style={{ fontSize: 12.5 }}>
              四项合计为答辩成绩（满分 100），保存后自动折算进入总评（答辩权重见系统参数）。
            </p>
          </>
        )}
      </Modal>
    </>
  )
}
