import { useState } from 'react'
import { ApiError, topicApi, userApi } from '../../api'
import DataTable from '../../components/DataTable'
import Modal from '../../components/Modal'
import { Field, PageHead } from '../../components/State'
import Tag from '../../components/Tag'
import { useUI } from '../../components/UIProvider'
import { useAuth } from '../../hooks/useAuth'
import { useQuery } from '../../hooks/useQuery'
import type { PoolTopic, Selection, StudentRow, TopicStat } from '../../types'
import { fmtDateTime } from '../../utils/datetime'

/** 互选与调剂：确认师生互选结果（调用存储过程建课题），或手工调剂 */
export default function TopicMatch() {
  const ui = useUI()
  const { inRole } = useAuth()
  // 互选确认与调剂是系主任职责，指导教师只查看
  const isDean = inRole('系主任')
  const [tab, setTab] = useState<'sel' | 'stat'>('sel')
  const [kw, setKw] = useState('')
  const [assignOpen, setAssignOpen] = useState(false)
  const [assignStudent, setAssignStudent] = useState('')
  const [assignTopic, setAssignTopic] = useState('')

  const sel = useQuery<Selection[]>(() => topicApi.selections(), [])
  const stat = useQuery<TopicStat[]>(() => topicApi.stat(), [])
  const poolOptions = useQuery<PoolTopic[]>(assignOpen ? () => topicApi.pool() : null, [assignOpen])
  // 调剂时从名单里选人，避免手输学号；只列出尚未生成课题的学生
  const students = useQuery<StudentRow[]>(assignOpen ? () => userApi.students() : null, [assignOpen])

  const rows = (sel.data ?? []).filter(
    (r) => !kw || r.studentName.includes(kw) || r.studentNo.includes(kw) || r.topicName.includes(kw),
  )

  async function confirmOne(r: Selection) {
    if (!(await ui.confirm(`确认 ${r.studentName}（${r.studentNo}）与题目「${r.topicName}」互选成功？确认后将生成课题。`))) return
    try {
      await topicApi.confirm(r.studentNo, r.topicNo)
      ui.ok('互选确认成功，课题已建立')
      sel.reload()
      stat.reload()
    } catch (e) {
      ui.err(e instanceof ApiError ? e.message : '确认失败')
    }
  }

  async function doAssign() {
    if (!assignStudent || !assignTopic) {
      ui.err('请选择学生与题目')
      return
    }
    try {
      await topicApi.assign(assignStudent, assignTopic)
      ui.ok('调剂成功')
      setAssignOpen(false)
      sel.reload()
      stat.reload()
    } catch (e) {
      ui.err(e instanceof ApiError ? e.message : '调剂失败')
    }
  }

  return (
    <>
      <PageHead title="互选与调剂" desc="确认志愿后由存储过程统一建立师生关系与课题编号；无志愿学生可手工调剂">
        {tab === 'sel' && (
          <input placeholder="搜索学生 / 题目" value={kw} onChange={(e) => setKw(e.target.value)} style={{ width: 200 }} />
        )}
        {isDean && <button className="btn primary" onClick={() => setAssignOpen(true)}>手工调剂</button>}
      </PageHead>

      <div className="card">
        <div className="tabs">
          <button className={`tab${tab === 'sel' ? ' active' : ''}`} onClick={() => setTab('sel')}>志愿清单</button>
          <button className={`tab${tab === 'stat' ? ' active' : ''}`} onClick={() => setTab('stat')}>选题统计</button>
        </div>

        {tab === 'sel' ? (
          <DataTable
            rows={rows}
            loading={sel.loading}
            error={sel.error}
            onRetry={sel.reload}
            rowKey={(r) => r.selectionId}
            pageSize={10}
            empty="暂无志愿记录"
            columns={[
              { key: 'studentNo', title: '学号', render: (r) => <span className="mono">{r.studentNo}</span> },
              { key: 'studentName', title: '学生', render: (r) => <b>{r.studentName}</b> },
              { key: 'className', title: '班级' },
              { key: 'topicName', title: '志愿题目', render: (r) => <span className="ellipsis" title={r.topicName}>{r.topicName}</span> },
              { key: 'teacherName', title: '指导教师' },
              { key: 'preference', title: '志愿序', align: 'right', render: (r) => r.preference },
              { key: 'cap', title: '容量', align: 'right', render: (r) => `${r.takenCount}/${r.capacity}` },
              { key: 'status', title: '状态', render: (r) => <Tag>{r.status}</Tag> },
              { key: 'confirmTime', title: '确认时间', render: (r) => fmtDateTime(r.confirmTime) },
              {
                key: 'op',
                title: '操作',
                width: 110,
                render: (r) =>
                  !isDean ? (
                    <span className="muted" style={{ fontSize: 12.5 }}>系主任确认</span>
                  ) : r.status === '待确认' ? (
                    <button className="btn sm primary" onClick={() => confirmOne(r)}>确认互选</button>
                  ) : (
                    <span className="muted" style={{ fontSize: 12.5 }}>已处理</span>
                  ),
              },
            ]}
          />
        ) : (
          <DataTable
            rows={stat.data}
            loading={stat.loading}
            error={stat.error}
            onRetry={stat.reload}
            rowKey={(r) => r.topicNo}
            pageSize={10}
            empty="暂无统计数据"
            columns={[
              { key: 'topicNo', title: '题目编号', render: (r) => <span className="mono">{r.topicNo}</span> },
              { key: 'topicName', title: '题目', render: (r) => <b>{r.topicName}</b> },
              { key: 'teacherName', title: '教师' },
              { key: 'majorNames', title: '适用专业', render: (r) => r.majorNames ?? '不限' },
              { key: 'capacity', title: '容量', align: 'right', render: (r) => r.capacity },
              { key: 'applyCount', title: '志愿数', align: 'right', render: (r) => r.applyCount },
              { key: 'takenCount', title: '已选', align: 'right', render: (r) => r.takenCount },
              { key: 'remainCount', title: '剩余', align: 'right', render: (r) => <Tag tone={r.remainCount > 0 ? 'amber' : 'green'}>{r.remainCount}</Tag> },
              { key: 'status', title: '状态', render: (r) => <Tag>{r.status}</Tag> },
            ]}
          />
        )}
      </div>

      <Modal
        open={assignOpen}
        title="手工调剂"
        onClose={() => setAssignOpen(false)}
        footer={
          <>
            <button className="btn" onClick={() => setAssignOpen(false)}>取消</button>
            <button className="btn primary" onClick={doAssign}>确认调剂</button>
          </>
        }
      >
        <Field label="学生">
          <select value={assignStudent} onChange={(e) => setAssignStudent(e.target.value)}>
            <option value="">请选择尚未分配课题的学生</option>
            {students.data?.filter((s) => !s.hasProject).map((s) => (
              <option key={s.studentNo} value={s.studentNo}>
                {s.name} · {s.className}
              </option>
            ))}
          </select>
        </Field>
        <Field label="题目">
          <select value={assignTopic} onChange={(e) => setAssignTopic(e.target.value)}>
            <option value="">请选择仍有名额的题目</option>
            {poolOptions.data?.filter((p) => p.remainCount > 0).map((p) => (
              <option key={p.topicNo} value={p.topicNo}>
                {p.topicName} · {p.teacherName}（余 {p.remainCount}）
              </option>
            ))}
          </select>
        </Field>
        <p className="muted" style={{ fontSize: 12.5 }}>
          调剂由系主任在征求师生双方意见后执行，同样通过存储过程建立课题并占用名额。
          {poolOptions.data ? `当前可选题目 ${poolOptions.data.length} 个。` : ''}
        </p>
      </Modal>
    </>
  )
}
