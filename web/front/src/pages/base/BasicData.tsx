import { useState } from 'react'
import { ApiError, baseApi } from '../../api'
import DataTable from '../../components/DataTable'
import Modal from '../../components/Modal'
import { Field, PageHead } from '../../components/State'
import Tag from '../../components/Tag'
import { useUI } from '../../components/UIProvider'
import { useQuery } from '../../hooks/useQuery'
import type { ClassInfo, Department, Major } from '../../types'

type Tab = 'dept' | 'major' | 'class'

/** 基础数据：院系 / 专业 / 班级三套组织基础数据合并为单页多 tab，减少菜单入口与重复代码 */
export default function BasicData() {
  const [tab, setTab] = useState<Tab>('dept')
  // 专业筛选需要院系列表，班级筛选需要专业列表——父级各拉一次，向下共享
  const depts = useQuery(() => baseApi.depts(), [])
  const majors = useQuery(() => baseApi.majors(), [])

  const Bar = (
    <div className="tabs">
      <button className={`tab${tab === 'dept' ? ' active' : ''}`} onClick={() => setTab('dept')}>院系</button>
      <button className={`tab${tab === 'major' ? ' active' : ''}`} onClick={() => setTab('major')}>专业</button>
      <button className={`tab${tab === 'class' ? ' active' : ''}`} onClick={() => setTab('class')}>班级</button>
    </div>
  )

  return (
    <>
      <PageHead title="基础数据" desc="维护院系、专业与班级等组织基础信息（报告 3.3 节）；专业挂接院系，班级挂接专业" />
      {Bar}
      {tab === 'dept' && <DeptTab />}
      {tab === 'major' && <MajorTab depts={depts.data ?? []} />}
      {tab === 'class' && <ClassTab majors={majors.data ?? []} />}
    </>
  )
}

function DeptTab() {
  const ui = useUI()
  const [kw, setKw] = useState('')
  const [open, setOpen] = useState(false)
  const blank = { deptNo: '', deptName: '', leader: '', office: '', phone: '' }
  const [form, setForm] = useState<typeof blank & { editing?: string }>(blank)
  const list = useQuery<Department[]>(() => baseApi.depts(kw), [kw])

  async function save() {
    if (!form.deptNo.trim() || !form.deptName.trim()) {
      ui.err('院系编号与名称不能为空')
      return
    }
    try {
      if (form.editing) await baseApi.updateDept(form.editing, form)
      else await baseApi.addDept(form)
      ui.ok(form.editing ? '院系已更新' : '院系已新增')
      setOpen(false)
      list.reload()
    } catch (e) {
      ui.err(e instanceof ApiError ? e.message : '保存失败')
    }
  }

  async function remove(no: string) {
    if (!(await ui.confirm(`确定删除院系 ${no}？该操作会校验引用关系。`))) return
    try {
      await baseApi.delDept(no)
      ui.ok('已删除')
      list.reload()
    } catch (e) {
      ui.err(e instanceof ApiError ? e.message : '删除失败')
    }
  }

  return (
    <>
      <div className="card">
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
          <input placeholder="搜索院系编号或名称" value={kw} onChange={(e) => setKw(e.target.value)} style={{ width: 220 }} />
          <button className="btn primary" onClick={() => { setForm({ ...blank }); setOpen(true) }}>新增院系</button>
        </div>
        <DataTable
          rows={list.data}
          loading={list.loading}
          error={list.error}
          onRetry={list.reload}
          rowKey={(r) => r.deptNo}
          empty="暂无院系数据"
          columns={[
            { key: 'deptNo', title: '院系编号', render: (r) => <span className="mono">{r.deptNo}</span> },
            { key: 'deptName', title: '院系名称', render: (r) => <b>{r.deptName}</b> },
            { key: 'leader', title: '负责人', render: (r) => r.leader ?? '—' },
            { key: 'office', title: '办公地点', render: (r) => r.office ?? '—' },
            { key: 'phone', title: '联系电话', render: (r) => r.phone ?? '—' },
            { key: 'majorCount', title: '专业数', align: 'right', render: (r) => r.majorCount },
            { key: 'teacherCount', title: '教师数', align: 'right', render: (r) => r.teacherCount },
            {
              key: 'op',
              title: '操作',
              render: (r) => (
                <div className="row-actions">
                  <button className="btn sm" onClick={() => { setForm({ ...r, leader: r.leader ?? '', office: r.office ?? '', phone: r.phone ?? '', editing: r.deptNo }); setOpen(true) }}>编辑</button>
                  <button className="btn sm danger" onClick={() => remove(r.deptNo)}>删除</button>
                </div>
              ),
            },
          ]}
        />
      </div>

      <Modal
        open={open}
        title={form.editing ? '编辑院系' : '新增院系'}
        subtitle={form.editing ? <>院系编号 <span className="mono">{form.editing}</span></> : '填写院系基本信息，保存后立即生效'}
        onClose={() => setOpen(false)}
        footer={
          <>
            <button className="btn" onClick={() => setOpen(false)}>取消</button>
            <button className="btn primary" onClick={save}>保存</button>
          </>
        }
      >
        <div className="grid2">
          <Field label="院系编号">
            <input value={form.deptNo} disabled={!!form.editing} onChange={(e) => setForm({ ...form, deptNo: e.target.value })} />
          </Field>
          <Field label="院系名称">
            <input value={form.deptName} onChange={(e) => setForm({ ...form, deptName: e.target.value })} />
          </Field>
          <Field label="负责人">
            <input value={form.leader} onChange={(e) => setForm({ ...form, leader: e.target.value })} />
          </Field>
          <Field label="办公地点">
            <input value={form.office} onChange={(e) => setForm({ ...form, office: e.target.value })} />
          </Field>
          <Field label="联系电话">
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>
        </div>
      </Modal>
    </>
  )
}

function MajorTab({ depts }: { depts: Department[] }) {
  const ui = useUI()
  const [kw, setKw] = useState('')
  const [deptNo, setDeptNo] = useState('')
  const [open, setOpen] = useState(false)
  const blank = { majorCode: '', majorName: '', deptNo: '', duration: 4, discipline: '' }
  const [form, setForm] = useState<typeof blank & { editing?: string }>(blank)
  const list = useQuery<Major[]>(() => baseApi.majors(kw, deptNo), [kw, deptNo])

  async function save() {
    if (!form.majorCode.trim() || !form.majorName.trim() || !form.deptNo) {
      ui.err('专业编号、名称与所属院系均不能为空')
      return
    }
    try {
      if (form.editing) await baseApi.updateMajor(form.editing, form)
      else await baseApi.addMajor(form)
      ui.ok('已保存')
      setOpen(false)
      list.reload()
    } catch (e) {
      ui.err(e instanceof ApiError ? e.message : '保存失败')
    }
  }

  return (
    <>
      <div className="card">
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
          <input placeholder="搜索专业编号或名称" value={kw} onChange={(e) => setKw(e.target.value)} style={{ width: 200 }} />
          <select value={deptNo} onChange={(e) => setDeptNo(e.target.value)}>
            <option value="">全部院系</option>
            {depts.map((d) => <option key={d.deptNo} value={d.deptNo}>{d.deptName}</option>)}
          </select>
          <button className="btn primary" onClick={() => { setForm({ ...blank }); setOpen(true) }}>新增专业</button>
        </div>
        <DataTable
          rows={list.data}
          loading={list.loading}
          error={list.error}
          onRetry={list.reload}
          rowKey={(r) => r.majorCode}
          empty="暂无专业数据"
          columns={[
            { key: 'majorCode', title: '专业编号', render: (r) => <span className="mono">{r.majorCode}</span> },
            { key: 'majorName', title: '专业名称', render: (r) => <b>{r.majorName}</b> },
            { key: 'deptName', title: '所属院系' },
            { key: 'duration', title: '学制（年）', align: 'right', render: (r) => r.duration },
            { key: 'discipline', title: '学科门类', render: (r) => r.discipline ?? '—' },
            { key: 'classCount', title: '班级数', align: 'right', render: (r) => r.classCount },
            {
              key: 'op',
              title: '操作',
              render: (r) => (
                <div className="row-actions">
                  <button
                    className="btn sm"
                    onClick={() => {
                      setForm({ majorCode: r.majorCode, majorName: r.majorName, deptNo: r.deptNo, duration: r.duration, discipline: r.discipline ?? '', editing: r.majorCode })
                      setOpen(true)
                    }}
                  >
                    编辑
                  </button>
                  <button
                    className="btn sm danger"
                    onClick={async () => {
                      if (!(await ui.confirm(`删除专业 ${r.majorName}？`))) return
                      try {
                        await baseApi.delMajor(r.majorCode)
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
              ),
            },
          ]}
        />
      </div>

      <Modal
        open={open}
        title={form.editing ? '编辑专业' : '新增专业'}
        subtitle={form.editing ? <>专业编号 <span className="mono">{form.editing}</span></> : '填写专业基本信息，保存后立即生效'}
        onClose={() => setOpen(false)}
        footer={
          <>
            <button className="btn" onClick={() => setOpen(false)}>取消</button>
            <button className="btn primary" onClick={save}>保存</button>
          </>
        }
      >
        <div className="grid2">
          <Field label="专业编号">
            <input value={form.majorCode} disabled={!!form.editing} onChange={(e) => setForm({ ...form, majorCode: e.target.value })} />
          </Field>
          <Field label="专业名称">
            <input value={form.majorName} onChange={(e) => setForm({ ...form, majorName: e.target.value })} />
          </Field>
          <Field label="所属院系">
            <select value={form.deptNo} onChange={(e) => setForm({ ...form, deptNo: e.target.value })}>
              <option value="">请选择</option>
              {depts.map((d) => <option key={d.deptNo} value={d.deptNo}>{d.deptName}</option>)}
            </select>
          </Field>
          <Field label="学制（年）">
            <input type="number" value={form.duration} onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })} />
          </Field>
          <Field label="学科门类">
            <input value={form.discipline} onChange={(e) => setForm({ ...form, discipline: e.target.value })} placeholder="如 工学" />
          </Field>
        </div>
      </Modal>
    </>
  )
}

function ClassTab({ majors }: { majors: Major[] }) {
  const ui = useUI()
  const [kw, setKw] = useState('')
  const [majorCode, setMajorCode] = useState('')
  const [open, setOpen] = useState(false)
  const blank = { classNo: '', className: '', majorCode: '', grade: new Date().getFullYear(), headTeacher: '' }
  const [form, setForm] = useState<typeof blank & { editing?: string }>(blank)
  const list = useQuery<ClassInfo[]>(() => baseApi.classes(kw, majorCode), [kw, majorCode])

  async function save() {
    if (!form.classNo.trim() || !form.className.trim() || !form.majorCode) {
      ui.err('班级编号、名称与所属专业均不能为空')
      return
    }
    try {
      if (form.editing) await baseApi.updateClass(form.editing, form)
      else await baseApi.addClass(form)
      ui.ok('已保存')
      setOpen(false)
      list.reload()
    } catch (e) {
      ui.err(e instanceof ApiError ? e.message : '保存失败')
    }
  }

  return (
    <>
      <div className="card">
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
          <input placeholder="搜索班级编号或名称" value={kw} onChange={(e) => setKw(e.target.value)} style={{ width: 200 }} />
          <select value={majorCode} onChange={(e) => setMajorCode(e.target.value)}>
            <option value="">全部专业</option>
            {majors.map((m) => <option key={m.majorCode} value={m.majorCode}>{m.majorName}</option>)}
          </select>
          <button className="btn primary" onClick={() => { setForm({ ...blank }); setOpen(true) }}>新增班级</button>
        </div>
        <DataTable
          rows={list.data}
          loading={list.loading}
          error={list.error}
          onRetry={list.reload}
          rowKey={(r) => r.classNo}
          empty="暂无班级数据"
          columns={[
            { key: 'classNo', title: '班级编号', render: (r) => <span className="mono">{r.classNo}</span> },
            { key: 'className', title: '班级名称', render: (r) => <b>{r.className}</b> },
            { key: 'majorName', title: '所属专业' },
            { key: 'deptName', title: '所属院系' },
            { key: 'grade', title: '年级', align: 'right', render: (r) => r.grade },
            { key: 'studentCount', title: '学生人数', align: 'right', render: (r) => <Tag tone={r.studentCount > 0 ? 'red' : 'gray'}>{r.studentCount}</Tag> },
            { key: 'headTeacher', title: '班主任', render: (r) => r.headTeacher ?? '—' },
            {
              key: 'op',
              title: '操作',
              render: (r) => (
                <div className="row-actions">
                  <button
                    className="btn sm"
                    onClick={() => {
                      setForm({ classNo: r.classNo, className: r.className, majorCode: r.majorCode, grade: r.grade, headTeacher: r.headTeacher ?? '', editing: r.classNo })
                      setOpen(true)
                    }}
                  >
                    编辑
                  </button>
                  <button
                    className="btn sm danger"
                    onClick={async () => {
                      if (!(await ui.confirm(`删除班级 ${r.className}？若仍有学生将无法删除。`))) return
                      try {
                        await baseApi.delClass(r.classNo)
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
              ),
            },
          ]}
        />
      </div>

      <Modal
        open={open}
        title={form.editing ? '编辑班级' : '新增班级'}
        subtitle={form.editing ? <>班级编号 <span className="mono">{form.editing}</span></> : '填写班级基本信息，保存后立即生效'}
        onClose={() => setOpen(false)}
        footer={
          <>
            <button className="btn" onClick={() => setOpen(false)}>取消</button>
            <button className="btn primary" onClick={save}>保存</button>
          </>
        }
      >
        <div className="grid2">
          <Field label="班级编号">
            <input value={form.classNo} disabled={!!form.editing} onChange={(e) => setForm({ ...form, classNo: e.target.value })} />
          </Field>
          <Field label="班级名称">
            <input value={form.className} onChange={(e) => setForm({ ...form, className: e.target.value })} />
          </Field>
          <Field label="所属专业">
            <select value={form.majorCode} onChange={(e) => setForm({ ...form, majorCode: e.target.value })}>
              <option value="">请选择</option>
              {majors.map((m) => <option key={m.majorCode} value={m.majorCode}>{m.majorName}</option>)}
            </select>
          </Field>
          <Field label="年级">
            <input type="number" value={form.grade} onChange={(e) => setForm({ ...form, grade: Number(e.target.value) })} />
          </Field>
          <Field label="班主任">
            <input value={form.headTeacher} onChange={(e) => setForm({ ...form, headTeacher: e.target.value })} />
          </Field>
        </div>
      </Modal>
    </>
  )
}
