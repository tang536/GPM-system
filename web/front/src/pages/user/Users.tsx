import { useState } from 'react'
import { ApiError, userApi } from '../../api'
import DataTable from '../../components/DataTable'
import Modal from '../../components/Modal'
import { Field, PageHead } from '../../components/State'
import Tag from '../../components/Tag'
import { useUI } from '../../components/UIProvider'
import { useQuery } from '../../hooks/useQuery'
import type { Account } from '../../types'
import { fmtDate } from '../../utils/datetime'

const TYPES = ['管理员', '系主任', '指导教师', '评阅教师', '学生']

interface Form {
  account: string
  password: string
  userType: string
  studentNo: string
  teacherNo: string
  roleIds: number[]
  status: string
}

const blank: Form = { account: '', password: '123456', userType: '学生', studentNo: '', teacherNo: '', roleIds: [], status: '启用' }

/** 账号管理：账号与学籍/教工档案一对一绑定，角色决定权限集合（报告 3.2 节） */
export default function Users() {
  const ui = useUI()
  const [kw, setKw] = useState('')
  const [userType, setUserType] = useState('')
  const [role, setRole] = useState('')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Account | null>(null)
  const [form, setForm] = useState<Form>(blank)

  const list = useQuery<Account[]>(() => userApi.users(kw, userType, role), [kw, userType, role])
  const roles = useQuery(() => userApi.roles(), [])
  const students = useQuery(() => userApi.students(), [])
  const teachers = useQuery(() => userApi.teachers(), [])

  const freeStudents = students.data?.filter((s) => !s.hasAccount) ?? []
  const freeTeachers = teachers.data?.filter((t) => !t.hasAccount) ?? []

  function openAdd() {
    setEditing(null)
    setForm({ ...blank })
    setOpen(true)
  }

  function openEdit(a: Account) {
    setEditing(a)
    const ids = roles.data?.filter((r) => a.roles.includes(r.roleName)).map((r) => r.roleId) ?? []
    setForm({
      account: a.account,
      password: '',
      userType: a.userType,
      studentNo: a.studentNo ?? '',
      teacherNo: a.teacherNo ?? '',
      roleIds: ids,
      status: a.status,
    })
    setOpen(true)
  }

  async function save() {
    try {
      if (editing) {
        await userApi.updateUser(editing.userId, {
          status: form.status,
          newPassword: form.password || undefined,
          roleIds: form.roleIds,
        })
        ui.ok('账号已更新')
      } else {
        if (!form.account.trim()) {
          ui.err('登录账号不能为空')
          return
        }
        await userApi.addUser({
          account: form.account.trim(),
          password: form.password || '123456',
          userType: form.userType,
          studentNo: form.studentNo || null,
          teacherNo: form.teacherNo || null,
          roleIds: form.roleIds,
          status: form.status,
        })
        ui.ok('账号已新增')
      }
      setOpen(false)
      list.reload()
      students.reload()
      teachers.reload()
    } catch (e) {
      ui.err(e instanceof ApiError ? e.message : '保存失败')
    }
  }

  async function remove(a: Account) {
    if (!(await ui.confirm(`删除账号 ${a.account}？该账号的业务数据不会被删除。`))) return
    try {
      await userApi.delUser(a.userId)
      ui.ok('已删除')
      list.reload()
    } catch (e) {
      ui.err(e instanceof ApiError ? e.message : '删除失败')
    }
  }

  return (
    <>
      <PageHead title="账号管理" desc="账号、身份与角色绑定；密码以 SHA-256 摘要存储">
        <input placeholder="搜索账号 / 姓名 / 编号" value={kw} onChange={(e) => setKw(e.target.value)} style={{ width: 210 }} />
        <select value={userType} onChange={(e) => setUserType(e.target.value)}>
          <option value="">全部身份</option>
          {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">全部角色</option>
          {roles.data?.map((r) => <option key={r.roleId} value={r.roleName}>{r.roleName}</option>)}
        </select>
        <button className="btn primary" onClick={openAdd}>新增账号</button>
      </PageHead>

      <div className="card">
        <DataTable
          rows={list.data}
          loading={list.loading}
          error={list.error}
          onRetry={list.reload}
          rowKey={(r) => r.userId}
          empty="暂无账号数据"
          pageSize={10}
          columns={[
            { key: 'account', title: '登录账号', render: (r) => <span className="mono">{r.account}</span> },
            { key: 'name', title: '姓名', render: (r) => <b>{r.name}</b> },
            { key: 'userType', title: '身份', render: (r) => <Tag tone={r.userType === '管理员' ? 'red' : r.userType === '学生' ? 'gray' : 'blue'}>{r.userType}</Tag> },
            { key: 'roles', title: '角色', render: (r) => (r.roles.length ? r.roles.join('、') : <span className="muted">未分配</span>) },
            { key: 'bind', title: '关联档案', render: (r) => <span className="mono">{r.studentNo ?? r.teacherNo ?? '—'}</span> },
            { key: 'status', title: '状态', render: (r) => <Tag>{r.status}</Tag> },
            { key: 'createdAt', title: '创建时间', render: (r) => fmtDate(r.createdAt) },
            {
              key: 'op',
              title: '操作',
              render: (r) => (
                <div className="row-actions">
                  <button className="btn sm" onClick={() => openEdit(r)}>编辑</button>
                  <button className="btn sm danger" onClick={() => remove(r)}>删除</button>
                </div>
              ),
            },
          ]}
        />
      </div>

      <Modal
        open={open}
        title={editing ? '编辑账号' : '新增账号'}
        subtitle={editing ? <>账号 <span className="mono">{editing.account}</span></> : '工号/学号即登录账号，初始密码 123456'}
        onClose={() => setOpen(false)}
        wide
        footer={
          <>
            <button className="btn" onClick={() => setOpen(false)}>取消</button>
            <button className="btn primary" onClick={save}>保存</button>
          </>
        }
      >
        <div className="grid2">
          <Field label="登录账号">
            <input value={form.account} disabled={!!editing} onChange={(e) => setForm({ ...form, account: e.target.value })} placeholder="学号 / 工号 / 自定义" />
          </Field>
          <Field label={editing ? '重置密码（留空不修改）' : '初始密码'}>
            <input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="默认 123456" />
          </Field>

          {!editing && (
            <>
              <Field label="身份类型">
                <select value={form.userType} onChange={(e) => setForm({ ...form, userType: e.target.value })}>
                  {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="账号状态">
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="启用">启用</option>
                  <option value="禁用">禁用</option>
                </select>
              </Field>

              {form.userType === '学生' && (
                <Field label="绑定学籍（未开户学生）" span>
                  <select value={form.studentNo} onChange={(e) => setForm({ ...form, studentNo: e.target.value })}>
                    <option value="">不绑定</option>
                    {freeStudents.map((s) => (
                      <option key={s.studentNo} value={s.studentNo}>{s.studentNo} · {s.name} · {s.className}</option>
                    ))}
                  </select>
                </Field>
              )}
              {form.userType !== '学生' && form.userType !== '管理员' && (
                <Field label="绑定教工档案（未开户教师）" span>
                  <select value={form.teacherNo} onChange={(e) => setForm({ ...form, teacherNo: e.target.value })}>
                    <option value="">不绑定</option>
                    {freeTeachers.map((t) => (
                      <option key={t.teacherNo} value={t.teacherNo}>{t.teacherNo} · {t.name} · {t.title ?? '教师'}</option>
                    ))}
                  </select>
                </Field>
              )}
            </>
          )}

          {editing && (
            <Field label="账号状态">
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="启用">启用</option>
                <option value="禁用">禁用</option>
              </select>
            </Field>
          )}

          <Field label="角色（决定可见菜单与按钮）" span>
            <div className="check-row">
              {roles.data?.map((r) => (
                <label key={r.roleId}>
                  <input
                    type="checkbox"
                    checked={form.roleIds.includes(r.roleId)}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        roleIds: e.target.checked
                          ? [...form.roleIds, r.roleId]
                          : form.roleIds.filter((x) => x !== r.roleId),
                      })
                    }
                  />
                  {r.roleName}
                </label>
              ))}
            </div>
          </Field>
        </div>
      </Modal>
    </>
  )
}
