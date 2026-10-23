import { useState } from 'react'
import { ApiError, scoreApi } from '../../api'
import DataTable from '../../components/DataTable'
import Modal from '../../components/Modal'
import { Field, PageHead } from '../../components/State'
import Tag, { LevelTag } from '../../components/Tag'
import { useUI } from '../../components/UIProvider'
import { useQuery } from '../../hooks/useQuery'
import type { ScoreRow } from '../../types'
import { score } from '../../utils/format'

/** 成绩评定：分项成绩按权限分人录入（过程=指导教师、评阅=评阅教师、答辩=组长） */
export default function Scores() {
  const ui = useUI()
  const [kw, setKw] = useState('')
  const [status, setStatus] = useState('')
  const [target, setTarget] = useState<ScoreRow | null>(null)
  const [proc, setProc] = useState('')
  const [rev, setRev] = useState('')
  const [def, setDef] = useState('')

  const list = useQuery<ScoreRow[]>(() => scoreApi.list(kw, status), [kw, status])
  const dims = useQuery(() => scoreApi.dims(), [])

  function openEdit(r: ScoreRow) {
    setTarget(r)
    setProc(r.processScore != null ? String(r.processScore) : '')
    setRev(r.reviewScore != null ? String(r.reviewScore) : '')
    setDef(r.defenseScore != null ? String(r.defenseScore) : '')
  }

  async function save() {
    if (!target) return
    try {
      await scoreApi.save(target.projectNo, {
        processScore: target.canProcess && proc !== '' ? Number(proc) : null,
        reviewScore: target.canReview && rev !== '' ? Number(rev) : null,
        defenseScore: target.canDefense && def !== '' ? Number(def) : null,
      })
      ui.ok('成绩已保存，总评与等级由视图实时计算')
      setTarget(null)
      list.reload()
    } catch (e) {
      ui.err(e instanceof ApiError ? e.message : '保存失败')
    }
  }

  return (
    <>
      <PageHead title="成绩评定" desc="三部分加权计算总评（权重可在系统参数中调整），已发布成绩自动锁定">
        <input placeholder="搜索学生 / 题目" value={kw} onChange={(e) => setKw(e.target.value)} style={{ width: 200 }} />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">全部状态</option>
          <option value="未发布">未发布</option>
          <option value="已审核">已审核</option>
          <option value="已发布">已发布</option>
        </select>
      </PageHead>

      <div className="card">
        <DataTable
          rows={list.data}
          loading={list.loading}
          error={list.error}
          onRetry={list.reload}
          rowKey={(r) => r.projectNo}
          pageSize={12}
          empty="暂无成绩数据"
          columns={[
            { key: 'studentName', title: '学生', render: (r) => <b>{r.studentName}</b> },
            { key: 'studentNo', title: '学号', render: (r) => <span className="mono">{r.studentNo}</span> },
            { key: 'topicName', title: '题目', render: (r) => <span className="ellipsis" title={r.topicName}>{r.topicName}</span> },
            { key: 'teacherName', title: '指导教师' },
            {
              key: 'processScore',
              title: '过程(40%)',
              align: 'right',
              render: (r) => <span style={{ color: r.canProcess ? 'var(--text)' : 'var(--muted)' }}>{score(r.processScore)}</span>,
            },
            {
              key: 'reviewScore',
              title: '评阅(30%)',
              align: 'right',
              render: (r) => <span style={{ color: r.canReview ? 'var(--text)' : 'var(--muted)' }}>{score(r.reviewScore)}</span>,
            },
            {
              key: 'defenseScore',
              title: '答辩(30%)',
              align: 'right',
              render: (r) => <span style={{ color: r.canDefense ? 'var(--text)' : 'var(--muted)' }}>{score(r.defenseScore)}</span>,
            },
            { key: 'totalScore', title: '总评', align: 'right', render: (r) => <b style={{ color: 'var(--brand)' }}>{score(r.totalScore)}</b> },
            { key: 'scoreLevel', title: '等级', render: (r) => <LevelTag level={r.scoreLevel} /> },
            { key: 'publishStatus', title: '状态', render: (r) => <Tag>{r.publishStatus}</Tag> },
            {
              key: 'op',
              title: '操作',
              render: (r) => {
                const mine = r.canProcess || r.canReview || r.canDefense
                return (
                  <button className="btn sm" disabled={!mine || r.locked} onClick={() => openEdit(r)} title={r.locked ? '已发布锁定' : mine ? '' : '无评定权限'}>
                    {r.locked ? '已锁定' : mine ? '录分' : '无权限'}
                  </button>
                )
              },
            },
          ]}
        />
      </div>

      <Modal
        open={!!target}
        title="录入分项成绩"
        onClose={() => setTarget(null)}
        footer={
          <>
            <button className="btn" onClick={() => setTarget(null)}>取消</button>
            <button className="btn primary" onClick={save}>保存</button>
          </>
        }
      >
        {target && (
          <>
            <dl className="kv" style={{ marginBottom: 14 }}>
              <dt>学生</dt>
              <dd><b>{target.studentName}</b>（{target.studentNo}）· {target.className}</dd>
              <dt>题目</dt>
              <dd>{target.topicName}</dd>
              <dt>当前总评</dt>
              <dd>{score(target.totalScore)} · {target.scoreLevel ?? '未定级'}（{target.publishStatus}）</dd>
            </dl>
            <div className="grid3">
              <Field label="过程成绩（40%）">
                <input value={proc} disabled={!target.canProcess} onChange={(e) => setProc(e.target.value)} placeholder="0~100" />
              </Field>
              <Field label="评阅成绩（30%）">
                <input value={rev} disabled={!target.canReview} onChange={(e) => setRev(e.target.value)} placeholder="0~100" />
              </Field>
              <Field label="答辩成绩（30%）">
                <input value={def} disabled={!target.canDefense} onChange={(e) => setDef(e.target.value)} placeholder="0~100" />
              </Field>
            </div>
            <p className="muted" style={{ fontSize: 12.5 }}>
              灰色项表示当前身份无权录入：过程分只能由指导教师填写，评阅分由被分配的评阅教师填写，
              答辩分由答辩组长按量表汇总（评分维度：{dims.data?.map((d) => `${d.dimension} ${d.max}分`).join('、') ?? '—'}）。
            </p>
          </>
        )}
      </Modal>
    </>
  )
}
