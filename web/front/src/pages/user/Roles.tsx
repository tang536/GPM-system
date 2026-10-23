import { useState } from 'react'
import { ApiError, userApi } from '../../api'
import DataTable from '../../components/DataTable'
import Modal from '../../components/Modal'
import { Field, PageHead } from '../../components/State'
import Tag from '../../components/Tag'
import { useUI } from '../../components/UIProvider'
import { useQuery } from '../../hooks/useQuery'
import type { Role } from '../../types'

/** 角色权限：角色 → 菜单/按钮权限的分配矩阵（报告 3.2 节 RBAC 模型） */
export default function Roles() {
  const ui = useUI()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Role | null>(null)
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [permIds, setPermIds] = useState<number[]>([])

  const roles = useQuery<Role[]>(() => userApi.roles(), [])
  const perms = useQuery(() => userApi.perms(), [])

  function openAdd() {
    setEditing(null)
    setName('')
    setDesc('')
    setPermIds([])
    setOpen(true)
  }

  function openEdit(r: Role) {
    setEditing(r)
    setName(r.roleName)
    setDesc(r.roleDesc ?? '')
    setPermIds(r.permIds)
    setOpen(true)
  }

  async function save() {
    if (!name.trim()) {
      ui.err('角色名称不能为空')
      return
    }
    try {
      if (editing) await userApi.updateRole(editing.roleId, { roleName: name, roleDesc: desc, permIds })
      else await userApi.addRole({ roleName: name, roleDesc: desc, permIds })
      ui.ok('已保存')
      setOpen(false)
      roles.reload()
    } catch (e) {
      ui.err(e instanceof ApiError ? e.message : '保存失败')
    }
  }

  const grouped = perms.data ?? []

  return (
    <>
      <PageHead title="角色与权限" desc="权限以菜单/按钮为粒度定义（sys_permission.perm_path），按角色批量授予">
        <button className="btn primary" onClick={openAdd}>新增角色</button>
      </PageHead>

      <div className="card" style={{ marginBottom: 16 }}>
        <DataTable
          rows={roles.data}
          loading={roles.loading}
          error={roles.error}
          onRetry={roles.reload}
          rowKey={(r) => r.roleId}
          empty="暂无角色"
          columns={[
            { key: 'roleName', title: '角色名称', render: (r) => <b>{r.roleName}</b> },
            { key: 'roleDesc', title: '职责说明', render: (r) => r.roleDesc ?? '—' },
            { key: 'userCount', title: '账号数', align: 'right', render: (r) => r.userCount },
            { key: 'permCount', title: '权限数', align: 'right', render: (r) => <Tag tone={r.permCount > 0 ? 'red' : 'gray'}>{r.permCount}</Tag> },
            {
              key: 'op',
              title: '操作',
              render: (r) => (
                <div className="row-actions">
                  <button className="btn sm" onClick={() => openEdit(r)}>配置权限</button>
                  <button
                    className="btn sm danger"
                    onClick={async () => {
                      if (!(await ui.confirm(`删除角色 ${r.roleName}？`))) return
                      try {
                        await userApi.delRole(r.roleId)
                        ui.ok('已删除')
                        roles.reload()
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

      <div className="card">
        <div className="card-head">
          <h3>权限清单（共 {grouped.length} 项）</h3>
          <div className="grow" />
          <span className="muted" style={{ fontSize: 12.5 }}>菜单权限控制页面可见性，按钮权限控制操作是否可执行</span>
        </div>
        <DataTable
          rows={grouped}
          loading={perms.loading}
          error={perms.error}
          onRetry={perms.reload}
          rowKey={(r) => r.permId}
          pageSize={10}
          columns={[
            { key: 'permId', title: '编号', align: 'right', render: (r) => r.permId },
            { key: 'permName', title: '权限名称', render: (r) => r.permName },
            { key: 'permType', title: '类型', render: (r) => <Tag tone={r.permType === '按钮' ? 'blue' : 'gray'}>{r.permType}</Tag> },
            { key: 'permPath', title: '权限标识', render: (r) => <span className="mono">{r.permPath}</span> },
            { key: 'roleCount', title: '已授予角色数', align: 'right', render: (r) => r.roleCount },
          ]}
        />
      </div>

      <Modal
        open={open}
        title={editing ? '配置角色' : '新增角色'}
        subtitle={editing ? <>当前角色 <span className="mono">{editing.roleName}</span></> : '定义角色名称并勾选可访问的菜单与按钮'}
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
          <Field label="角色名称">
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="职责说明">
            <input value={desc} onChange={(e) => setDesc(e.target.value)} />
          </Field>
        </div>

        <div style={{ marginTop: 6, marginBottom: 8, fontSize: 12.5, color: 'var(--muted)' }}>
          勾选该角色可访问的菜单与按钮：
        </div>
        <div className="check-list">
          {perms.data?.map((p) => (
            <label key={p.permId}>
              <input
                type="checkbox"
                checked={permIds.includes(p.permId)}
                onChange={(e) =>
                  setPermIds(e.target.checked ? [...permIds, p.permId] : permIds.filter((x) => x !== p.permId))
                }
              />
              <span style={{ minWidth: 120 }}>{p.permName}</span>
              <span className="mono muted">{p.permPath}</span>
            </label>
          ))}
        </div>
      </Modal>
    </>
  )
}
