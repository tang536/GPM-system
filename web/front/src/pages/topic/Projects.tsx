import { useState } from 'react'
import { topicApi } from '../../api'
import DataTable from '../../components/DataTable'
import { PageHead, Empty, Loading, ErrorBox } from '../../components/State'
import Tag from '../../components/Tag'
import { useAuth } from '../../hooks/useAuth'
import { useQuery } from '../../hooks/useQuery'
import type { Project } from '../../types'
import { fmtDate } from '../../utils/datetime'

/** 课题清单：师生关系确立后的课题全貌，按数据范围自动收敛（学生只看本人） */
export default function Projects() {
  const { me } = useAuth()
  const isStudent = me?.userType === '学生'
  const [kw, setKw] = useState('')
  const [status, setStatus] = useState('')
  const list = useQuery<Project[]>(() => topicApi.projects(kw, status), [kw, status])

  // 学生视角：课题清单恒为一条记录，表格 + 筛选器全是冗余，改为信息卡片直接呈现
  if (isStudent) {
    const rows = list.data ?? []
    return (
      <>
        <PageHead title="我的课题" desc="互选确认后生成的课题档案；进度、材料与成绩均以它为线索归集" />
        <div className="card">
          {list.loading && <Loading />}
          {!list.loading && list.error && <ErrorBox text={list.error} onRetry={list.reload} />}
          {!list.loading && !list.error && rows.length === 0 && (
            <Empty text="暂无课题记录，请先完成选题" icon="○" />
          )}
          {rows.map((p) => (
            <div className="card-body" key={p.projectNo}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
                <b style={{ fontSize: 15.5 }}>{p.topicName}</b>
                <Tag>{p.projectStatus}</Tag>
              </div>
              <dl className="kv">
                <dt>课题编号</dt>
                <dd className="mono">{p.projectNo}</dd>
                <dt>指导教师</dt>
                <dd>{p.teacherName}</dd>
                <dt>届别</dt>
                <dd>{p.cohort} 届</dd>
                <dt>当前阶段</dt>
                <dd>{p.currentStage ?? '—'}</dd>
                <dt>开始日期</dt>
                <dd>{fmtDate(p.startDate)}</dd>
              </dl>
              <p className="muted" style={{ fontSize: 12.5, marginTop: 14, marginBottom: 0 }}>
                如需查看阶段进度、材料提交与成绩，请前往「工作台」。
              </p>
            </div>
          ))}
        </div>
      </>
    )
  }

  return (
    <>
      <PageHead title="课题清单" desc="课题编号由年份 + 序号生成；进度与成绩均以课题为线索归集">
        <input
          placeholder="搜索学号 / 姓名 / 题目 / 教师"
          value={kw}
          onChange={(e) => setKw(e.target.value)}
          style={{ width: 240 }}
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">全部状态</option>
          <option value="进行中">进行中</option>
          <option value="已归档">已归档</option>
          <option value="异常">异常</option>
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
          empty="暂无课题"
          columns={[
            { key: 'projectNo', title: '课题编号', render: (r) => <span className="mono">{r.projectNo}</span> },
            { key: 'studentName', title: '学生', render: (r) => <b>{r.studentName}</b> },
            { key: 'studentNo', title: '学号', render: (r) => <span className="mono">{r.studentNo}</span> },
            { key: 'className', title: '班级' },
            { key: 'topicName', title: '题目', render: (r) => <span className="ellipsis" title={r.topicName}>{r.topicName}</span> },
            { key: 'teacherName', title: '指导教师' },
            { key: 'cohort', title: '届别', render: (r) => `${r.cohort} 届` },
            { key: 'currentStage', title: '当前阶段', align: 'right', render: (r) => r.currentStage ?? '—' },
            { key: 'projectStatus', title: '状态', render: (r) => <Tag>{r.projectStatus}</Tag> },
            { key: 'startDate', title: '开始日期', render: (r) => fmtDate(r.startDate) },
          ]}
        />
      </div>
    </>
  )
}
