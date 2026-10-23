import { useState } from 'react'
import { ApiError, baseApi, topicApi } from '../../api'
import DataTable from '../../components/DataTable'
import LongText from '../../components/LongText'
import Modal from '../../components/Modal'
import { Field, PageHead } from '../../components/State'
import Tag from '../../components/Tag'
import { useUI } from '../../components/UIProvider'
import { useAuth } from '../../hooks/useAuth'
import { useQuery } from '../../hooks/useQuery'
import type { Topic } from '../../types'

const DIFF = ['易', '中', '难']
const TYPES = ['软件开发', '理论研究', '工程设计', '数据分析']

const blank = {
  topicName: '',
  topicType: '软件开发',
  researchField: '',
  difficulty: '中',
  capacity: 1,
  cohort: '2026',
  majorCodes: [] as string[],
}

/**
 * 题目管理：一个页面服务两类身份——
 * 指导教师申报/维护自己的题目（申报后进入待审核状态）；
 * 系主任审核全部题目（通过后进入学生选题库）。
 * 原"题目申报"与"题目审核"两页调的是同一列表接口，已按身份合并。
 */
export default function TopicManage() {
  const ui = useUI()
  const { me, inRole } = useAuth()
  // 审核是系主任职责；教师只管理自己的申报
  const isDean = inRole('系主任')
  const [kw, setKw] = useState('')
  // 系主任默认看"待审核"（审核场景），教师默认看全部（管理自己的申报）
  const [status, setStatus] = useState(isDean ? '待审核' : '')
  // 范围：教师默认"我的申报"（打开即见自己的题目，可直接编辑）；
  // 系主任默认"全部题目"。派生默认值避免挂载时 me 未加载导致初值错误
  const [scope, setScope] = useState<string | null>(null)
  const effectiveScope = scope ?? (isDean ? 'all' : 'mine')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Topic | null>(null)
  const [form, setForm] = useState(blank)
  const [target, setTarget] = useState<Topic | null>(null)
  const [opinion, setOpinion] = useState('')

  const list = useQuery<Topic[]>(() => topicApi.list(kw, status, undefined, effectiveScope === 'mine'), [kw, status, effectiveScope])
  const majors = useQuery(() => baseApi.majors(), [])
  const cohorts = useQuery(() => baseApi.cohorts(), [])

  function openAdd() {
    setEditing(null)
    setForm({ ...blank, cohort: cohorts.data?.[0]?.cohort ?? '2026' })
    setOpen(true)
  }

  function openEdit(t: Topic) {
    setEditing(t)
    setForm({
      topicName: t.topicName,
      topicType: t.topicType,
      researchField: t.researchField ?? '',
      difficulty: t.difficulty,
      capacity: t.capacity,
      cohort: t.cohort,
      // 后端返回的是数组，不能按逗号分隔字符串处理，否则编辑弹窗打不开
      majorCodes: t.majorCodes ?? [],
    })
    setOpen(true)
  }

  async function save() {
    if (!form.topicName.trim()) {
      ui.err('题目名称不能为空')
      return
    }
    if (form.majorCodes.length === 0) {
      ui.err('请至少选择一个适用专业')
      return
    }
    try {
      if (editing) await topicApi.update(editing.topicNo, form)
      else await topicApi.add(form)
      ui.ok(editing ? '题目已更新' : '题目已提交，等待系主任审核')
      setOpen(false)
      list.reload()
    } catch (e) {
      ui.err(e instanceof ApiError ? e.message : '保存失败')
    }
  }

  async function audit(pass: boolean) {
    if (!target) return
    try {
      await topicApi.audit(target.topicNo, pass ? '已发布' : '已驳回', opinion)
      ui.ok(pass ? '已通过，题目进入选题库' : '已驳回')
      setTarget(null)
      setOpinion('')
      list.reload()
    } catch (e) {
      ui.err(e instanceof ApiError ? e.message : '操作失败')
    }
  }

  return (
    <>
      <PageHead title="题目管理" desc="指导教师申报题目并经系主任审核后方可进入选题库；审核通过后学生方可提交志愿">
        <input placeholder="搜索题目 / 教师" value={kw} onChange={(e) => setKw(e.target.value)} style={{ width: 200 }} />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">全部状态</option>
          <option value="待审核">待审核</option>
          <option value="已发布">已发布</option>
          <option value="已驳回">已驳回</option>
        </select>
        <select value={effectiveScope} onChange={(e) => setScope(e.target.value)}>
          {isDean ? (
            <option value="all">全部题目</option>
          ) : (
            <>
              <option value="mine">我的申报</option>
              <option value="all">全部题目</option>
            </>
          )}
        </select>
        {!isDean && <button className="btn primary" onClick={openAdd}>申报题目</button>}
      </PageHead>

      <div className="card">
        <DataTable
          rows={list.data}
          loading={list.loading}
          error={list.error}
          onRetry={list.reload}
          rowKey={(r) => r.topicNo}
          empty={effectiveScope === 'mine' ? '暂无申报题目' : '暂无题目'}
          pageSize={10}
          columns={[
            { key: 'topicName', title: '题目名称', align: 'left', render: (r) => <b>{r.topicName}</b> },
            { key: 'teacherName', title: '申报教师' },
            { key: 'topicType', title: '类型', render: (r) => <Tag tone="blue">{r.topicType}</Tag> },
            { key: 'majorNames', title: '适用专业', align: 'left', render: (r) => <span className="ellipsis" title={r.majorNames?.join('、') ?? ''}>{r.majorNames?.join('、') || '不限'}</span> },
            { key: 'difficulty', title: '难度', render: (r) => <Tag tone={r.difficulty === '难' ? 'red' : r.difficulty === '易' ? 'green' : 'amber'}>{r.difficulty}</Tag> },
            { key: 'capacity', title: '容量', align: 'right', render: (r) => r.capacity },
            { key: 'applyCount', title: '志愿数', align: 'right', render: (r) => r.applyCount },
            { key: 'takenCount', title: '已选', align: 'right', render: (r) => r.takenCount },
            { key: 'status', title: '状态', render: (r) => <Tag>{r.status}</Tag> },
            { key: 'auditOpinion', title: '审核意见', align: 'left', width: 160, render: (r) => <LongText text={r.auditOpinion} title="审核意见" subtitle={r.topicNo} max={12} /> },
            {
              key: 'op',
              title: '操作',
              width: 130,
              render: (r) =>
                isDean ? (
                  r.status === '待审核' ? (
                    <button className="btn sm primary" onClick={() => { setTarget(r); setOpinion('') }}>审核</button>
                  ) : (
                    <span className="muted" style={{ fontSize: 12.5 }}>{r.auditOpinion || '已处理'}</span>
                  )
                ) : r.applicantNo === me?.teacherNo ? (
                  <div className="row-actions">
                    <button className="btn sm" onClick={() => openEdit(r)} disabled={r.status === '已发布' && r.takenCount > 0}>编辑</button>
                    <button
                      className="btn sm danger"
                      onClick={async () => {
                        if (!(await ui.confirm(`删除题目「${r.topicName}」？`))) return
                        try {
                          await topicApi.remove(r.topicNo)
                          ui.ok('已删除')
                          list.reload()
                        } catch (e) {
                          ui.err(e instanceof ApiError ? e.message : '删除失败')
                        }
                      }}
                    >
                      删除
                    </button>
                  </div>
                ) : (
                  <span className="muted" style={{ fontSize: 12.5 }}>仅申报人可编辑</span>
                ),
            },
          ]}
        />
      </div>

      <Modal
        open={open}
        title={editing ? '编辑题目' : '申报题目'}
        subtitle={editing ? <>题目编号 <span className="mono">{editing.topicNo}</span> · 修改后需重新审核</> : '题目提交后由系主任审核，审核通过即进入选题池'}
        onClose={() => setOpen(false)}
        wide
        footer={
          <>
            <button className="btn" onClick={() => setOpen(false)}>取消</button>
            <button className="btn primary" onClick={save}>提交</button>
          </>
        }
      >
        <div className="grid2">
          <Field label="题目名称" span required hint="简明扼要，建议体现研究对象与采用技术">
            <input value={form.topicName} onChange={(e) => setForm({ ...form, topicName: e.target.value })} placeholder="如：基于知识图谱的毕业设计选题推荐系统" />
          </Field>
          <Field label="题目类型" required>
            <select value={form.topicType} onChange={(e) => setForm({ ...form, topicType: e.target.value })}>
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="研究方向">
            <input value={form.researchField} onChange={(e) => setForm({ ...form, researchField: e.target.value })} placeholder="如：数据分析" />
          </Field>
          <Field label="难度">
            <select value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })}>
              {DIFF.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </Field>
          <Field label="可带学生数（容量）">
            <input type="number" min={1} max={5} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} />
          </Field>
          <Field label="适用年级">
            <select value={form.cohort} onChange={(e) => setForm({ ...form, cohort: e.target.value })}>
              {(cohorts.data ?? [{ cohort: '2026' }]).map((c) => (
                <option key={c.cohort} value={c.cohort}>{c.cohort} 届</option>
              ))}
            </select>
          </Field>
          <Field label="适用专业（可多选）" span hint="不勾选表示对所有专业开放；已入选学生的题目不建议更改适用范围">
            <div className="check-row">
              {majors.data?.map((m) => (
                <label key={m.majorCode}>
                  <input
                    type="checkbox"
                    checked={form.majorCodes.includes(m.majorCode)}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        majorCodes: e.target.checked
                          ? [...form.majorCodes, m.majorCode]
                          : form.majorCodes.filter((x) => x !== m.majorCode),
                      })
                    }
                  />
                  {m.majorName}
                </label>
              ))}
            </div>
          </Field>
        </div>
      </Modal>

      <Modal
        open={!!target}
        title="题目审核"
        onClose={() => setTarget(null)}
        footer={
          <>
            <button className="btn" onClick={() => setTarget(null)}>取消</button>
            <button className="btn danger" onClick={() => audit(false)}>驳回</button>
            <button className="btn primary" onClick={() => audit(true)}>通过并发布</button>
          </>
        }
      >
        {target && (
          <>
            <dl className="kv" style={{ marginBottom: 14 }}>
              <dt>题目编号</dt>
              <dd className="mono">{target.topicNo}</dd>
              <dt>题目名称</dt>
              <dd><b>{target.topicName}</b></dd>
              <dt>申报教师</dt>
              <dd>{target.teacherName}（{target.teacherTitle ?? '教师'}）</dd>
              <dt>类型 / 难度</dt>
              <dd>{target.topicType} · {target.difficulty}</dd>
              <dt>容量</dt>
              <dd>{target.capacity} 人（已报 {target.applyCount} 人志愿）</dd>
              <dt>适用专业</dt>
              <dd>{target.majorNames || '不限'}</dd>
            </dl>
            <Field label="审核意见（驳回时必填）">
              <textarea value={opinion} onChange={(e) => setOpinion(e.target.value)} placeholder="如：题目范围过大，建议聚焦某一业务场景" />
            </Field>
          </>
        )}
      </Modal>
    </>
  )
}
