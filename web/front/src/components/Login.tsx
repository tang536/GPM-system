import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError } from '../api'
import { homePathOf, useAuth } from '../hooks/useAuth'
import { useTheme } from '../hooks/useTheme'
import { useUI } from './UIProvider'
import Icon from './Icon'

/** 演示账号：与种子数据一致，便于答辩现场逐角色切换 */
const DEMO = [
  { account: 'admin', name: '系统管理员', desc: '全部模块' },
  { account: 'liangzy', name: '系主任', desc: '审核 / 发布' },
  { account: 'huangmin', name: '指导教师', desc: '指导 + 评阅' },
  { account: '202101010001', name: '毕业生', desc: '全流程提交' },
]

export default function Login() {
  const { login } = useAuth()
  const { theme, toggle } = useTheme()
  const ui = useUI()
  const nav = useNavigate()
  const [account, setAccount] = useState('admin')
  const [password, setPassword] = useState('123456')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      const profile = await login(account.trim(), password)
      ui.ok(`登录成功，欢迎回来，${profile.name || profile.account}`)
      // 必须用返回值而不是闭包里的 me：此刻 me 仍为 null
      nav(homePathOf(profile), { replace: true })
    } catch (e2) {
      ui.err(e2 instanceof ApiError ? e2.message : '登录失败，请稍后重试')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-page">
      <section className="login-brand">
        <div>
          <div className="brand-mark">
            <span className="brand-dot">毕</span>
            毕业设计管理系统
          </div>
          <h1 className="brand-title">
            选题 · 过程 · 成绩
            <br />
            一体化的毕业设计管理平台
          </h1>
          <p className="brand-sub">
            覆盖题目申报与审核、师生互选与调剂、任务书与阶段材料、阶段评阅与延期审批、
            成绩分项评定与答辩安排，直至成绩审核发布的完整业务链。
          </p>
          <div className="brand-roles">
            <span>系统管理员</span>
            <span>系主任</span>
            <span>指导教师</span>
            <span>评阅教师</span>
            <span>毕业生</span>
          </div>
        </div>
        <div className="brand-foot">
          数据库 MySQL 8 · 28 张关系表全部满足 BCNF
          <br />
          14 个视图 · 5 个触发器 · 3 个存储过程 · 2 个确定性函数
        </div>
      </section>

      <section className="login-side">
        <form className="login-card" onSubmit={submit}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 18 }}>
            <div>
              <h2>登录</h2>
              <div className="hint">请使用学号、工号或管理员账号登录</div>
            </div>
            <button
              type="button"
              className="icon-btn"
              style={{ marginLeft: 'auto' }}
              title="切换深浅主题"
              onClick={toggle}
            >
              <Icon name={theme === 'light' ? 'moon' : 'sun'} size={16} />
            </button>
          </div>

          <div className="field">
            <label>账号</label>
            <input
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              placeholder="学号 / 工号 / admin"
              autoComplete="username"
              style={{ width: '100%' }}
            />
          </div>
          <div className="field">
            <label>密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              autoComplete="current-password"
              style={{ width: '100%' }}
            />
          </div>

          <button className="btn primary block" type="submit" disabled={busy}>
            {busy ? '登录中…' : '登录系统'}
          </button>

          <div className="quick-users">
            <p>演示账号（点击填入，密码均为 123456）</p>
            <div className="quick-grid">
              {DEMO.map((d) => (
                <button
                  type="button"
                  key={d.account}
                  className="quick-item"
                  onClick={() => {
                    setAccount(d.account)
                    setPassword('123456')
                  }}
                >
                  <b>{d.name}</b>
                  {d.account} · {d.desc}
                </button>
              ))}
            </div>
          </div>
        </form>
      </section>
    </div>
  )
}
