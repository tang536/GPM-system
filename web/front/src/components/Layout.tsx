import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { authApi, serviceApi, ApiError } from '../api'
import { homePathOf, useAuth } from '../hooks/useAuth'
import { useTheme } from '../hooks/useTheme'
import { titleOf, visibleMenus } from '../permissions'
import Icon from './Icon'
import Modal from './Modal'
import FeedDetail from './FeedDetail'
import GlobalSearch from './GlobalSearch'
import { Field } from './State'
import { useUI } from './UIProvider'
import { fmtDateTime } from '../utils/datetime'
import type { Message, Notice } from '../types'

/** 通知中心卡片的一条：公告或站内消息 */
interface FeedItem {
  kind: 'notice' | 'message'
  id: number
  title: string
  time: string
  unread: boolean
  /** 详情弹窗用：全文与附加信息 */
  content: string
  tags: { text: string; tone?: 'red' | 'blue' }[]
  meta: { label: string; value: string }[]
}

/** 主框架：左侧六模块导航（按权限过滤）+ 顶栏（主题、通知中心、账号菜单） */
export default function Layout() {
  const { me, logout } = useAuth()
  const { theme, toggle } = useTheme()
  const nav = useNavigate()
  const loc = useLocation()
  const ui = useUI()
  const [unread, setUnread] = useState(0)
  const [pwdOpen, setPwdOpen] = useState(false)
  const [oldPwd, setOldPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [busy, setBusy] = useState(false)

  // 侧栏收起状态持久化
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('grad-sidebar') === 'collapsed')
  useEffect(() => {
    localStorage.setItem('grad-sidebar', collapsed ? 'collapsed' : 'expanded')
  }, [collapsed])

  // 全局搜索面板
  const [searchOpen, setSearchOpen] = useState(false)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen((o) => !o)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  // 顶栏两个弹出层：账号菜单与通知中心
  const [acctOpen, setAcctOpen] = useState(false)
  const [msgOpen, setMsgOpen] = useState(false)
  const acctRef = useRef<HTMLDivElement>(null)
  const msgRef = useRef<HTMLDivElement>(null)

  const [feed, setFeed] = useState<FeedItem[]>([])
  const [feedLoading, setFeedLoading] = useState(false)
  const [feedLoaded, setFeedLoaded] = useState(false)
  // 通知详情弹窗（公告/消息全文）
  const [detail, setDetail] = useState<FeedItem | null>(null)

  const groups = visibleMenus(me)

  useEffect(() => {
    let alive = true
    const load = () =>
      serviceApi
        .unread()
        .then((r) => alive && setUnread(r.count))
        .catch(() => undefined)
    load()
    const timer = setInterval(load, 30000)
    return () => {
      alive = false
      clearInterval(timer)
    }
  }, [loc.pathname])

  // 点击空白处关闭弹出层
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (acctRef.current && !acctRef.current.contains(t)) setAcctOpen(false)
      if (msgRef.current && !msgRef.current.contains(t)) setMsgOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  /** 加载通知中心数据；返回是否成功，供调用方决定是否给成功反馈 */
  async function loadFeed(): Promise<boolean> {
    setFeedLoading(true)
    try {
      const [notices, messages] = await Promise.all([
        serviceApi.notices() as Promise<Notice[]>,
        serviceApi.messages() as Promise<Message[]>,
      ])
      const items: FeedItem[] = [
        ...notices.slice(0, 8).map((n) => ({
          kind: 'notice' as const,
          id: n.noticeId,
          title: n.title,
          time: n.publishTime,
          unread: false,
          content: n.content,
          tags: [
            ...(n.isTop ? [{ text: '置顶', tone: 'red' as const }] : []),
            { text: n.noticeType, tone: 'blue' as const },
          ],
          meta: [
            { label: '发布范围', value: (n.scope || '全院').split(',').join('、') },
            { label: '发布人', value: n.publisher },
          ],
        })),
        ...messages.slice(0, 8).map((m) => ({
          kind: 'message' as const,
          id: m.messageId,
          title: m.title,
          time: m.sendTime,
          unread: !m.isRead,
          content: m.content,
          tags: [{ text: m.msgType, tone: 'blue' as const }],
          meta: [{ label: '发送人', value: m.senderName ?? '系统' }],
        })),
      ]
      items.sort((a, b) => (a.time < b.time ? 1 : -1))
      setFeed(items.slice(0, 10))
      setFeedLoaded(true)
      return true
    } catch {
      ui.err('通知加载失败')
      return false
    } finally {
      setFeedLoading(false)
    }
  }

  /** 刷新按钮：成功后明确提示，避免用户无感知 */
  async function refreshFeed() {
    if (await loadFeed()) ui.ok('通知已刷新')
  }

  function toggleMsg() {
    const next = !msgOpen
    setMsgOpen(next)
    setAcctOpen(false)
    if (next && !feedLoaded) loadFeed()
  }

  async function openFeedItem(item: FeedItem) {
    if (item.kind === 'message' && item.unread) {
      try {
        await serviceApi.readOne(item.id)
        setUnread((n) => Math.max(0, n - 1))
        setFeed((f) => f.map((x) => (x.kind === 'message' && x.id === item.id ? { ...x, unread: false } : x)))
      } catch {
        /* 已读失败不阻断查看 */
      }
    }
    // 点击通知：弹窗查看全文（不再跳转到列表页）
    setMsgOpen(false)
    setDetail(item)
  }

  async function markAllRead() {
    try {
      await serviceApi.readAll()
      setUnread(0)
      setFeed((f) => f.map((x) => ({ ...x, unread: false })))
      ui.ok('已全部标记为已读')
    } catch (e) {
      ui.err(e instanceof ApiError ? e.message : '操作失败')
    }
  }

  async function submitPwd() {
    if (newPwd.length < 6) {
      ui.err('新密码至少 6 位')
      return
    }
    setBusy(true)
    try {
      await authApi.changePassword(oldPwd, newPwd)
      ui.ok('密码已修改，请重新登录')
      setPwdOpen(false)
      logout()
      nav('/login', { replace: true })
    } catch (e) {
      ui.err(e instanceof ApiError ? e.message : '修改失败')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={`shell${collapsed ? ' collapsed' : ''}`}>
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="avatar">毕</div>
          <div>
            <div className="name">毕业设计管理系统</div>
            <div className="sub">GRADUATION DESIGN</div>
          </div>
        </div>

        <nav className="nav">
          {groups.map((g) => (
            <div key={g.group}>
              <div className="nav-group">{g.group}</div>
              {g.items.map((m) => (
                <NavLink
                  key={m.key}
                  to={m.path}
                  className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                  title={collapsed ? m.label : undefined}
                >
                  <Icon name={m.icon} size={15} />
                  <span>{m.label}</span>
                  {m.key === 'message' && unread > 0 && <span className="badge-num">{unread}</span>}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-foot">
          数据库 MySQL 8 · 28 表 / 14 视图
          <br />
          触发器 5 · 存储过程 3 · 函数 2
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <button
            className="icon-btn"
            title={collapsed ? '展开侧边栏' : '收起侧边栏'}
            onClick={() => setCollapsed((c) => !c)}
          >
            <Icon name="panel" size={16} />
          </button>
          <div>
            <h1>{titleOf(loc.pathname)}</h1>
            <div className="crumb">{me?.userType ?? ''} · {me?.roles.join(' / ') ?? ''}</div>
          </div>

          <div className="topbar-right">
            <button className="icon-btn" title="全局搜索（Ctrl+K）" onClick={() => setSearchOpen(true)}>
              <Icon name="search" size={16} />
            </button>
            <button className="icon-btn" title="切换深浅主题" onClick={toggle}>
              <Icon name={theme === 'light' ? 'moon' : 'sun'} size={16} />
            </button>

            {/* 通知中心：公告与站内消息合并为一个弹出卡片，所有身份可用 */}
            <div className="pop-wrap" ref={msgRef}>
              <button
                className={`icon-btn${msgOpen ? ' on' : ''}`}
                title="通知中心"
                onClick={toggleMsg}
              >
                <Icon name="notice" size={16} />
                {unread > 0 && <span className="dot-count">{unread > 99 ? '99+' : unread}</span>}
              </button>
              {msgOpen && (
                <div className="pop msg-pop">
                  <div className="pop-head">
                    <b>通知中心</b>
                    <div className="grow" />
                    <button className="icon-btn sm" title="刷新" onClick={refreshFeed} disabled={feedLoading}>
                      <Icon name="refresh" size={14} />
                    </button>
                    <button className="btn sm" onClick={markAllRead} disabled={unread === 0}>全部已读</button>
                    <button className="icon-btn sm" title="关闭" onClick={() => setMsgOpen(false)}>
                      <Icon name="close" size={14} />
                    </button>
                  </div>
                  <div className="pop-body">
                    {feedLoading && !feed.length ? (
                      <div className="pop-empty">加载中…</div>
                    ) : !feed.length ? (
                      <div className="pop-empty">暂无通知与公告</div>
                    ) : (
                      feed.map((item) => (
                        <button
                          key={`${item.kind}-${item.id}`}
                          className={`feed-item${item.unread ? ' unread' : ''}`}
                          onClick={() => openFeedItem(item)}
                        >
                          <span className={`feed-ico ${item.kind}`}>
                            <Icon name={item.kind === 'notice' ? 'notice' : 'message'} size={14} />
                          </span>
                          <span className="feed-main">
                            <span className="feed-title ellipsis">{item.title}</span>
                            <span className="feed-time">{fmtDateTime(item.time)}</span>
                          </span>
                          {item.unread && <span className="feed-dot" />}
                        </button>
                      ))
                    )}
                  </div>
                  <div className="pop-foot">
                    <button className="btn sm ghost" onClick={() => { setMsgOpen(false); nav('/service/notice') }}>
                      查看全部公告
                    </button>
                    <button className="btn sm ghost" onClick={() => { setMsgOpen(false); nav('/service/message') }}>
                      查看全部消息
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 账号菜单：修改密码与退出登录合并为一个入口 */}
            <div className="pop-wrap" ref={acctRef}>
              <button
                className={`who${acctOpen ? ' on' : ''}`}
                title="账号菜单"
                onClick={() => { setAcctOpen((o) => !o); setMsgOpen(false) }}
              >
                <div className="avatar">{(me?.name ?? '?').slice(0, 1)}</div>
                <div>
                  <div className="n">{me?.name}</div>
                  <div className="r">{me?.account}</div>
                </div>
                <Icon name="chevron" size={13} />
              </button>
              {acctOpen && (
                <div className="pop acct-pop">
                  <div className="acct-head">
                    <div className="avatar lg">{(me?.name ?? '?').slice(0, 1)}</div>
                    <div>
                      <div className="n">{me?.name}</div>
                      <div className="r">{me?.account} · {me?.roles.join(' / ')}</div>
                    </div>
                  </div>
                  <button className="pop-item" onClick={() => { setAcctOpen(false); setPwdOpen(true) }}>
                    <Icon name="key" size={15} /> 修改密码
                  </button>
                  <button
                    className="pop-item danger"
                    onClick={() => { ui.ok('已退出登录'); logout(); nav('/login', { replace: true }) }}
                  >
                    <Icon name="logout" size={15} /> 退出登录
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>

      <Modal
        open={pwdOpen}
        title="修改本人密码"
        onClose={() => setPwdOpen(false)}
        footer={
          <>
            <button className="btn" onClick={() => setPwdOpen(false)}>取消</button>
            <button className="btn primary" disabled={busy} onClick={submitPwd}>保存</button>
          </>
        }
      >
        <Field label="原密码">
          <input type="password" value={oldPwd} onChange={(e) => setOldPwd(e.target.value)} placeholder="请输入原密码" />
        </Field>
        <Field label="新密码（不少于 6 位）">
          <input type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} placeholder="请输入新密码" />
        </Field>
        <p className="muted" style={{ fontSize: 12.5 }}>
          密码以 SHA-256 摘要存储，修改后需重新登录。
        </p>
      </Modal>

      {/* 通知详情：公告/消息全文弹窗 */}
      <FeedDetail open={!!detail} data={detail} onClose={() => setDetail(null)} />

      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  )
}

/** 登录后按身份跳到默认首页 */
export function useHome() {
  const { me } = useAuth()
  const nav = useNavigate()
  return () => nav(homePathOf(me), { replace: true })
}
