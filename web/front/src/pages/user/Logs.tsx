import { useState } from 'react'
import { userApi } from '../../api'
import DataTable from '../../components/DataTable'
import { PageHead } from '../../components/State'
import Tag from '../../components/Tag'
import { useQuery } from '../../hooks/useQuery'
import type { OpLog } from '../../types'
import { fmtDateTime } from '../../utils/datetime'

const TYPES = ['登录', '新增', '修改', '删除', '审核', '导出']

/** 操作日志：记录谁在什么时候对哪个模块做了什么（报告 3.2 节审计要求） */
export default function Logs() {
  const [kw, setKw] = useState('')
  const [opType, setOpType] = useState('')
  const list = useQuery<OpLog[]>(() => userApi.logs(kw, opType, 300), [kw, opType])

  return (
    <>
      <PageHead title="操作日志" desc="系统自动记录关键操作，供追溯与审计">
        <input placeholder="搜索账号 / 描述" value={kw} onChange={(e) => setKw(e.target.value)} style={{ width: 220 }} />
        <select value={opType} onChange={(e) => setOpType(e.target.value)}>
          <option value="">全部类型</option>
          {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </PageHead>

      <div className="card">
        <DataTable
          rows={list.data}
          loading={list.loading}
          error={list.error}
          onRetry={list.reload}
          rowKey={(r) => r.logId}
          pageSize={15}
          empty="暂无日志"
          columns={[
            { key: 'opTime', title: '时间', render: (r) => fmtDateTime(r.opTime), sortValue: (r) => r.opTime },
            { key: 'account', title: '操作人', render: (r) => <b>{r.account}</b> },
            { key: 'opType', title: '类型', render: (r) => <Tag tone={r.opType === '删除' ? 'red' : r.opType === '新增' ? 'green' : 'gray'}>{r.opType}</Tag> },
            { key: 'opModule', title: '模块' },
            { key: 'description', title: '操作描述', render: (r) => <span className="ellipsis" title={r.description}>{r.description}</span> },
            { key: 'ip', title: 'IP', render: (r) => <span className="mono">{r.ip ?? '—'}</span> },
          ]}
        />
      </div>
    </>
  )
}
