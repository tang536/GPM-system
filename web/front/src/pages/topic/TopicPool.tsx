import { useState } from 'react'
import { ApiError, topicApi } from '../../api'
import DataTable from '../../components/DataTable'
import Modal from '../../components/Modal'
import { Field, PageHead } from '../../components/State'
import Tag from '../../components/Tag'
import { useUI } from '../../components/UIProvider'
import { useAuth } from '../../hooks/useAuth'
import { useQuery } from '../../hooks/useQuery'
import type { PoolTopic, Selection } from '../../types'
import { fmtDateTime } from '../../utils/datetime'

/** 学生选题：浏览题目库、提交至多三个志愿，并可撤销未匹配的志愿 */
export default function TopicPool() {
  const ui = useUI()
  const { me } = useAuth()
  // 填报志愿是毕业生本人行为：管理员、系主任、教师即便进入也只读
  const isStudent = me?.userType === '学生'
  const [kw, setKw] = useState('')
  const [target, setTarget] = useState<PoolTopic | null>(null)
  const [pref, setPref] = useState(1)

  const pool = useQuery<PoolTopic[]>(() => topicApi.pool(kw), [kw])
  const mine = useQuery<Selection[]>(() => topicApi.selections(undefined, me?.studentNo ?? ''), [me?.studentNo])

  async function submit() {
    if (!target) return
    try {
      await topicApi.select(target.topicNo, pref)
      ui.ok('志愿已提交，等待系主任确认互选结果')
      setTarget(null)
      pool.reload()
      mine.reload()
    } catch (e) {
      ui.err(e instanceof ApiError ? e.message : '提交失败')
    }
  }

  return (
    <>
      <PageHead title="学生选题" desc="浏览已发布题目并提交志愿（1=第一志愿），每位学生最多三个志愿">
        <input placeholder="搜索题目 / 教师" value={kw} onChange={(e) => setKw(e.target.value)} style={{ width: 220 }} />
      </PageHead>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-head">
          <h3>我的志愿</h3>
          <div className="grow" />
          <span className="muted" style={{ fontSize: 12.5 }}>学号 {me?.studentNo ?? '—'}</span>
        </div>
        <DataTable
          rows={mine.data}
          loading={mine.loading}
          error={mine.error}
          onRetry={mine.reload}
          rowKey={(r) => r.selectionId}
          empty="尚未提交志愿"
          pageSize={5}
          columns={[
            { key: 'preference', title: '志愿序', align: 'right', render: (r) => `第 ${r.preference} 志愿` },
            { key: 'topicName', title: '题目', render: (r) => <b>{r.topicName}</b> },
            { key: 'teacherName', title: '指导教师' },
            { key: 'capacity', title: '容量', align: 'right', render: (r) => `${r.takenCount}/${r.capacity}` },
            { key: 'status', title: '状态', render: (r) => <Tag>{r.status}</Tag> },
            { key: 'confirmTime', title: '确认时间', render: (r) => fmtDateTime(r.confirmTime) },
            {
              key: 'op',
              title: '操作',
              render: (r) =>
                r.status === '待确认' ? (
                  <button
                    className="btn sm danger"
                    onClick={async () => {
                      if (!(await ui.confirm('撤销该志愿？'))) return
                      try {
                        await topicApi.drop(r.selectionId)
                        ui.ok('已撤销')
                        mine.reload()
                        pool.reload()
                      } catch (e) {
                        ui.err(e instanceof ApiError ? e.message : '撤销失败')
                      }
                    }}
                  >
                    撤销
                  </button>
                ) : (
                  <span className="muted" style={{ fontSize: 12.5 }}>已锁定</span>
                ),
            },
          ]}
        />
      </div>

      <div className="card">
        <div className="card-head">
          <h3>题目库（仅显示已发布且仍有名额的题目）</h3>
          <div className="grow" />
          <span className="muted" style={{ fontSize: 12.5 }}>共 {pool.data?.length ?? 0} 个可选题目</span>
        </div>
        <DataTable
          rows={pool.data}
          loading={pool.loading}
          error={pool.error}
          onRetry={pool.reload}
          rowKey={(r) => r.topicNo}
          pageSize={10}
          columns={[
            { key: 'topicName', title: '题目名称', render: (r) => <b>{r.topicName}</b> },
            { key: 'teacherName', title: '指导教师', render: (r) => `${r.teacherName}${r.teacherTitle ? ` · ${r.teacherTitle}` : ''}` },
            { key: 'topicType', title: '类型', render: (r) => <Tag tone="blue">{r.topicType}</Tag> },
            { key: 'researchField', title: '研究方向', render: (r) => r.researchField ?? '—' },
            { key: 'difficulty', title: '难度', render: (r) => <Tag tone={r.difficulty === '难' ? 'red' : r.difficulty === '易' ? 'green' : 'amber'}>{r.difficulty}</Tag> },
            { key: 'remainCount', title: '剩余名额', align: 'right', render: (r) => <Tag tone={r.remainCount > 0 ? 'green' : 'red'}>{r.remainCount}/{r.capacity}</Tag> },
            { key: 'cohort', title: '届别', hideFor: ['学生'] },
            {
              key: 'op',
              title: '操作',
              width: 110,
              render: (r) =>
                isStudent ? (
                  <button className="btn sm primary" disabled={r.remainCount <= 0} onClick={() => { setTarget(r); setPref(1) }}>
                    填报志愿
                  </button>
                ) : (
                  <span className="muted" style={{ fontSize: 12.5 }}>仅毕业生可填报</span>
                ),
            },
          ]}
        />
      </div>

      <Modal
        open={!!target}
        title="填报志愿"
        onClose={() => setTarget(null)}
        footer={
          <>
            <button className="btn" onClick={() => setTarget(null)}>取消</button>
            <button className="btn primary" onClick={submit}>提交志愿</button>
          </>
        }
      >
        {target && (
          <>
            <dl className="kv" style={{ marginBottom: 14 }}>
              <dt>题目</dt>
              <dd><b>{target.topicName}</b></dd>
              <dt>指导教师</dt>
              <dd>{target.teacherName}</dd>
              <dt>剩余名额</dt>
              <dd>{target.remainCount} / {target.capacity}</dd>
            </dl>
            <Field label="志愿顺序">
              <select value={pref} onChange={(e) => setPref(Number(e.target.value))}>
                <option value={1}>第一志愿</option>
                <option value={2}>第二志愿</option>
                <option value={3}>第三志愿</option>
              </select>
            </Field>
            <p className="muted" style={{ fontSize: 12.5 }}>
              提交后志愿状态为「待确认」，由系主任执行互选确认；确认前可撤销。
            </p>
          </>
        )}
      </Modal>
    </>
  )
}
