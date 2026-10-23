import { useState } from 'react'
import { ApiError, scoreApi } from '../../api'
import { Loading, PageHead } from '../../components/State'
import { StatGrid } from '../../components/StatCard'
import Tag, { LevelTag } from '../../components/Tag'
import { useUI } from '../../components/UIProvider'
import { useQuery } from '../../hooks/useQuery'
import type { ScoreRow } from '../../types'
import { score } from '../../utils/format'

/** 成绩审核发布：先审核（校验分项完整），再发布（存储过程置状态并推送通知） */
export default function ScoreAudit() {
  const ui = useUI()
  // 勾选仅作为批量操作对象，不过滤列表——勾选后其他人仍可见
  const [checked, setChecked] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const list = useQuery<ScoreRow[]>(() => scoreApi.list(), [])

  const rows = list.data ?? []
  const waitAudit = rows.filter((r) => r.publishStatus === '未发布')
  const waitPublish = rows.filter((r) => r.publishStatus === '已审核')
  const published = rows.filter((r) => r.publishStatus === '已发布')

  function toggle(no: string) {
    setChecked((c) => (c.includes(no) ? c.filter((x) => x !== no) : [...c, no]))
  }

  function toggleAll(pending: ScoreRow[]) {
    const all = pending.map((p) => p.projectNo)
    setChecked((c) => (all.length > 0 && all.every((no) => c.includes(no)) ? c.filter((no) => !all.includes(no)) : all))
  }

  async function doAudit() {
    const pending = waitAudit.filter((r) => checked.includes(r.projectNo))
    if (pending.length === 0) {
      ui.err('请先勾选待审核的成绩')
      return
    }
    const incomplete = pending.filter((r) => r.processScore == null || r.reviewScore == null || r.defenseScore == null)
    if (incomplete.length > 0) {
      ui.err(`以下学生分项成绩不完整：${incomplete.map((r) => r.studentName).join('、')}`)
      return
    }
    setBusy(true)
    try {
      const res = await scoreApi.audit(pending.map((r) => r.projectNo))
      ui.ok(
        res.errors.length > 0
          ? `已审核 ${res.count} 条，另有 ${res.errors.length} 条未通过：${res.errors.join('；')}`
          : `已审核 ${res.count} 条成绩`,
      )
      setChecked([])
      list.reload()
    } catch (e) {
      ui.err(e instanceof ApiError ? e.message : '审核失败')
    } finally {
      setBusy(false)
    }
  }

  async function doPublish() {
    const ready = waitPublish.filter((r) => checked.includes(r.projectNo))
    if (ready.length === 0) {
      ui.err('请先勾选已审核的成绩')
      return
    }
    if (!(await ui.confirm(`确认发布 ${ready.length} 条成绩？发布后分项成绩将被锁定，学生可查询总评与等级。`))) return
    setBusy(true)
    try {
      const res = await scoreApi.publish(ready.map((r) => r.projectNo))
      ui.ok(`发布完成：${res.messages.join('；')}`)
      setChecked([])
      list.reload()
    } catch (e) {
      ui.err(e instanceof ApiError ? e.message : '发布失败')
    } finally {
      setBusy(false)
    }
  }

  // 待处理列表始终展示全部待审核/待发布，勾选只影响批量操作
  const shown = [...waitAudit, ...waitPublish]

  return (
    <>
      <PageHead title="成绩审核发布" desc="审核通过后由存储过程 sp_publish_score 发布，并自动向学生推送成绩通知">
        <button className="btn" disabled={busy} onClick={doAudit}>审核所选</button>
        <button className="btn primary" disabled={busy} onClick={doPublish}>发布所选</button>
      </PageHead>

      <StatGrid
        items={[
          { key: 'w', label: '待审核', value: waitAudit.length, desc: '分项齐全方可审核', highlight: waitAudit.length > 0 },
          { key: 'r', label: '待发布', value: waitPublish.length, desc: '已审核待发布' },
          { key: 'd', label: '已发布', value: published.length, desc: '成绩已锁定' },
          { key: 's', label: '已勾选', value: checked.length, desc: '批量操作对象' },
        ]}
      />

      <div className="card">
        <div className="card-head">
          <h3>待处理成绩（{shown.length}）</h3>
          <div className="grow" />
          <button className="btn sm" onClick={() => toggleAll(shown)}>
            {shown.length > 0 && shown.every((r) => checked.includes(r.projectNo)) ? '取消全选' : '全选'}
          </button>
        </div>

        {list.loading ? (
          <Loading />
        ) : shown.length === 0 ? (
          <div className="empty">当前没有待审核或待发布的成绩</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 36 }} />
                  <th>学生</th>
                  <th>题目</th>
                  <th>指导教师</th>
                  <th className="num">过程</th>
                  <th className="num">评阅</th>
                  <th className="num">答辩</th>
                  <th className="num">总评</th>
                  <th>等级</th>
                  <th>状态</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.projectNo}>
                    <td>
                      <input type="checkbox" checked={checked.includes(r.projectNo)} onChange={() => toggle(r.projectNo)} />
                    </td>
                    <td>
                      <b>{r.studentName}</b>
                      <div className="muted mono" style={{ fontSize: 11.5 }}>{r.studentNo}</div>
                    </td>
                    <td><span className="ellipsis" title={r.topicName}>{r.topicName}</span></td>
                    <td>{r.teacherName}</td>
                    <td className="num">{score(r.processScore)}</td>
                    <td className="num">{score(r.reviewScore)}</td>
                    <td className="num">{score(r.defenseScore)}</td>
                    <td className="num"><b style={{ color: 'var(--brand)' }}>{score(r.totalScore)}</b></td>
                    <td><LevelTag level={r.scoreLevel} /></td>
                    <td><Tag>{r.publishStatus}</Tag></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {published.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-head">
            <h3>已发布成绩（{published.length}）</h3>
            <div className="grow" />
            <span className="muted" style={{ fontSize: 12.5 }}>成绩发布后分项成绩不可修改（数据库触发器 trg_score_bu 锁定）</span>
          </div>
          <div className="table-wrap" style={{ maxHeight: 320 }}>
            <table>
              <thead>
                <tr>
                  <th>学生</th>
                  <th>题目</th>
                  <th className="num">过程</th>
                  <th className="num">评阅</th>
                  <th className="num">答辩</th>
                  <th className="num">总评</th>
                  <th>等级</th>
                </tr>
              </thead>
              <tbody>
                {published.map((r) => (
                  <tr key={r.projectNo}>
                    <td><b>{r.studentName}</b></td>
                    <td><span className="ellipsis" title={r.topicName}>{r.topicName}</span></td>
                    <td className="num">{score(r.processScore)}</td>
                    <td className="num">{score(r.reviewScore)}</td>
                    <td className="num">{score(r.defenseScore)}</td>
                    <td className="num"><b>{score(r.totalScore)}</b></td>
                    <td><LevelTag level={r.scoreLevel} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}
