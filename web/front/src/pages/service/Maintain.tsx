import { useEffect, useState } from 'react'
import { ApiError, serviceApi } from '../../api'
import DataTable from '../../components/DataTable'
import { Field, PageHead } from '../../components/State'
import Tag from '../../components/Tag'
import { useUI } from '../../components/UIProvider'
import { useAuth } from '../../hooks/useAuth'
import { useQuery } from '../../hooks/useQuery'
import type { SysParam } from '../../types'
import { fmtDateTime } from '../../utils/datetime'
import { fileSize } from '../../utils/format'

/** 系统维护：成绩权重与系统参数配置、数据库逻辑备份、截止提醒触发 */
export default function Maintain() {
  const ui = useUI()
  const { isAdmin, inRole } = useAuth()
  const canWeights = isAdmin || inRole('系主任')

  const params = useQuery<SysParam[]>(() => serviceApi.params(), [])
  const backups = useQuery(() => serviceApi.backups(), [])

  const [proc, setProc] = useState('0.40')
  const [rev, setRev] = useState('0.30')
  const [def, setDef] = useState('0.30')
  const [busy, setBusy] = useState(false)
  const [draft, setDraft] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!params.data) return
    const get = (n: string) => params.data!.find((p) => p.paramName === n)?.paramValue
    setProc(get('score.process_weight') ?? '0.40')
    setRev(get('score.review_weight') ?? '0.30')
    setDef(get('score.defense_weight') ?? '0.30')
    const d: Record<string, string> = {}
    for (const p of params.data) d[p.paramName] = p.paramValue
    setDraft(d)
  }, [params.data])

  async function saveWeights() {
    const sum = Number(proc) + Number(rev) + Number(def)
    if (Math.abs(sum - 1) > 0.0001) {
      ui.err(`三项权重之和必须为 1，当前为 ${sum.toFixed(2)}`)
      return
    }
    try {
      await serviceApi.setWeights(Number(proc), Number(rev), Number(def))
      ui.ok('权重已更新，视图将按新权重实时计算总评')
      params.reload()
    } catch (e) {
      ui.err(e instanceof ApiError ? e.message : '保存失败')
    }
  }

  async function saveParam(name: string) {
    try {
      await serviceApi.setParam(name, draft[name] ?? '')
      ui.ok('参数已更新')
      params.reload()
    } catch (e) {
      ui.err(e instanceof ApiError ? e.message : '保存失败')
    }
  }

  async function doBackup() {
    setBusy(true)
    try {
      const r = await serviceApi.createBackup()
      ui.ok(`备份完成：${r.name}（${r.size} KB）`)
      backups.reload()
    } catch (e) {
      ui.err(e instanceof ApiError ? e.message : '备份失败')
    } finally {
      setBusy(false)
    }
  }

  async function doNotice() {
    try {
      const r = await serviceApi.overdueNotice()
      ui.ok(`已向逾期学生推送提醒，新增 ${r.created} 条消息`)
    } catch (e) {
      ui.err(e instanceof ApiError ? e.message : '执行失败')
    }
  }

  const others = params.data?.filter((p) => !p.paramName.startsWith('score.') || p.paramName === 'score.pass_line') ?? []

  return (
    <>
      <PageHead title="系统维护" desc="成绩权重、系统参数与数据库备份；备份调用 mysqldump 生成可恢复的逻辑备份">
        {canWeights && <button className="btn" onClick={doNotice}>触发截止提醒</button>}
        {canWeights && <button className="btn primary" disabled={busy} onClick={doBackup}>{busy ? '备份中…' : '立即备份'}</button>}
      </PageHead>

      <div className="split" style={{ marginBottom: 16 }}>
        <div className="card">
          <div className="card-head">
            <h3>成绩权重配置</h3>
            <div className="grow" />
            <span className="muted" style={{ fontSize: 12.5 }}>总评 = 过程×w1 + 评阅×w2 + 答辩×w3</span>
          </div>
          <div className="card-body">
            <div className="grid3">
              <Field label="过程成绩权重">
                <input value={proc} disabled={!canWeights} onChange={(e) => setProc(e.target.value)} />
              </Field>
              <Field label="评阅成绩权重">
                <input value={rev} disabled={!canWeights} onChange={(e) => setRev(e.target.value)} />
              </Field>
              <Field label="答辩成绩权重">
                <input value={def} disabled={!canWeights} onChange={(e) => setDef(e.target.value)} />
              </Field>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <Tag tone={Math.abs(Number(proc) + Number(rev) + Number(def) - 1) < 0.0001 ? 'green' : 'red'}>
                合计 {(Number(proc) + Number(rev) + Number(def)).toFixed(2)}
              </Tag>
              {canWeights && <button className="btn primary sm" onClick={saveWeights}>保存权重</button>}
            </div>
            <p className="muted" style={{ fontSize: 12.5, marginBottom: 0 }}>
              权重保存在 sys_param 表，视图 v_score_report 在查询时按权重计算总评，已发布成绩不受影响。
            </p>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <h3>其他系统参数</h3>
          </div>
          <div className="card-body" style={{ display: 'grid', gap: 12 }}>
            {others.length === 0 && <div className="muted">暂无其他参数</div>}
            {others.map((p) => (
              <div key={p.paramId} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{ minWidth: 150 }}>
                  <div className="mono" style={{ fontSize: 12.5 }}>{p.paramName}</div>
                  <div className="muted" style={{ fontSize: 11.5 }}>{p.remark}</div>
                </div>
                <input
                  value={draft[p.paramName] ?? ''}
                  disabled={!isAdmin}
                  onChange={(e) => setDraft({ ...draft, [p.paramName]: e.target.value })}
                  style={{ flex: 1 }}
                />
                {isAdmin && <button className="btn sm" onClick={() => saveParam(p.paramName)}>保存</button>}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h3>数据备份记录</h3>
          <div className="grow" />
          <button className="btn sm" onClick={backups.reload}>刷新</button>
        </div>
        <DataTable
          rows={backups.data}
          loading={backups.loading}
          error={backups.error}
          onRetry={backups.reload}
          rowKey={(r) => r.name}
          empty="暂无备份文件"
          columns={[
            { key: 'name', title: '文件名', render: (r) => <span className="mono">{r.name}</span> },
            { key: 'size', title: '大小', align: 'right', render: (r) => fileSize(r.size) },
            { key: 'time', title: '生成时间', render: (r) => fmtDateTime(r.time) },
          ]}
        />
      </div>
    </>
  )
}
