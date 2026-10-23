import { useState } from 'react'
import { ApiError, processApi, topicApi } from '../../api'
import DataTable from '../../components/DataTable'
import Modal from '../../components/Modal'
import { Field, PageHead } from '../../components/State'
import Tag from '../../components/Tag'
import { useUI } from '../../components/UIProvider'
import { useAuth } from '../../hooks/useAuth'
import { useQuery } from '../../hooks/useQuery'
import type { Project, TaskBook } from '../../types'
import { fmtDateTime } from '../../utils/datetime'

/** 任务书：教师下达（课题 1:1），学生对内容确认接收（报告 3.4 节） */
export default function TaskBooks() {
  const ui = useUI()
  const { me, inRole } = useAuth()
  const isStudent = me?.userType === '学生'
  // 任务书由指导教师下达与修订；系主任与系统管理员只查看，不参与业务操作
  const canIssue = inRole('指导教师')
  const [kw, setKw] = useState('')
  const [open, setOpen] = useState(false)
  const [projectNo, setProjectNo] = useState('')
  const [designTask, setDesignTask] = useState('')
  const [tech, setTech] = useState('')
  const [schedule, setSchedule] = useState('')

  const list = useQuery<TaskBook[]>(() => processApi.taskBooks(undefined, kw), [kw])
  const projects = useQuery<Project[]>(open ? () => topicApi.projects() : null, [open])

  // 弹窗里展示"学生 · 题目"而不是课题编号，避免用户去记 14 位编码
  const current = list.data?.find((x) => x.projectNo === projectNo)
  const currentLabel = current ? `${current.studentName} · ${current.topicName}` : projectNo

  function openAdd(p?: string) {
    setProjectNo(p ?? '')
    setDesignTask('')
    setTech('')
    setSchedule('')
    setOpen(true)
  }

  async function save() {
    if (!projectNo || !designTask.trim()) {
      ui.err('请选择课题并填写设计任务')
      return
    }
    try {
      await processApi.saveTaskBook({ projectNo, designTask, techRequirement: tech, schedule })
      ui.ok('任务书已下达')
      setOpen(false)
      list.reload()
    } catch (e) {
      ui.err(e instanceof ApiError ? e.message : '保存失败')
    }
  }

  async function confirm(t: TaskBook) {
    if (!(await ui.confirm('确认接收该任务书？确认后视为知晓设计任务与进度要求。'))) return
    try {
      await processApi.confirmTask(t.taskId)
      ui.ok('已确认接收')
      list.reload()
    } catch (e) {
      ui.err(e instanceof ApiError ? e.message : '确认失败')
    }
  }

  return (
    <>
      <PageHead title="任务书" desc="教师下达设计任务、技术要求与进度安排；学生确认后进入实施阶段">
        <input placeholder="搜索学生 / 题目" value={kw} onChange={(e) => setKw(e.target.value)} style={{ width: 220 }} />
        {canIssue && <button className="btn primary" onClick={() => openAdd()}>下达任务书</button>}
      </PageHead>

      <div className="card">
        <DataTable
          rows={list.data}
          loading={list.loading}
          error={list.error}
          onRetry={list.reload}
          rowKey={(r) => r.taskId}
          pageSize={10}
          empty="暂无任务书"
          columns={[
            // 学生确认任务书：无需课题编号与学生姓名（就是本人），聚焦题目/教师/时间/状态
            { key: 'projectNo', title: '课题编号', hideFor: ['学生'], render: (r) => <span className="mono">{r.projectNo}</span> },
            { key: 'studentName', title: '学生', hideFor: ['学生'], render: (r) => <b>{r.studentName}</b> },
            { key: 'topicName', title: '题目', render: (r) => <span className="ellipsis" title={r.topicName}>{r.topicName}</span> },
            { key: 'teacherName', title: '指导教师' },
            { key: 'issueTime', title: '下达时间', render: (r) => fmtDateTime(r.issueTime) },
            { key: 'confirmStatus', title: '确认状态', render: (r) => <Tag>{r.confirmStatus}</Tag> },
            {
              key: 'op',
              title: '操作',
              render: (r) => (
                <div className="row-actions">
                  <button
                    className="btn sm"
                    onClick={() => {
                      setProjectNo(r.projectNo)
                      setDesignTask(r.designTask ?? '')
                      setTech(r.techRequirement ?? '')
                      setSchedule(r.schedule ?? '')
                      setOpen(true)
                    }}
                  >
                    {canIssue ? '修订' : '查看'}
                  </button>
                  {isStudent && r.confirmStatus !== '已确认' && (
                    <button className="btn sm primary" onClick={() => confirm(r)}>确认接收</button>
                  )}
                </div>
              ),
            },
          ]}
        />
      </div>

      <Modal
        open={open}
        title={canIssue ? '下达 / 修订任务书' : '任务书详情'}
        onClose={() => setOpen(false)}
        wide
        footer={
          <>
            <button className="btn" onClick={() => setOpen(false)}>关闭</button>
            {canIssue && <button className="btn primary" onClick={save}>保存下达</button>}
          </>
        }
      >
        <Field label="所属课题">
          {canIssue ? (
            <select value={projectNo} onChange={(e) => setProjectNo(e.target.value)}>
              <option value="">请选择课题</option>
              {projects.data?.map((p) => (
                <option key={p.projectNo} value={p.projectNo}>
                  {p.studentName} · {p.topicName}
                </option>
              ))}
            </select>
          ) : (
            <input value={currentLabel} readOnly />
          )}
        </Field>
        <Field label="设计任务（主要内容与要求）">
          <textarea value={designTask} readOnly={!canIssue} onChange={(e) => setDesignTask(e.target.value)} placeholder="说明课题要完成的主要工作、达到的目标与成果形式" />
        </Field>
        <Field label="技术要求">
          <textarea value={tech} readOnly={!canIssue} onChange={(e) => setTech(e.target.value)} placeholder="如：采用 B/S 架构，前后端分离，数据库满足第三范式" />
        </Field>
        <Field label="进度安排">
          <textarea value={schedule} readOnly={!canIssue} onChange={(e) => setSchedule(e.target.value)} placeholder="如：第 1-4 周 需求分析与开题；第 5-10 周 设计与实现……" />
        </Field>
      </Modal>
    </>
  )
}
