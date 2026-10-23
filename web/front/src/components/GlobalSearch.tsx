import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import type { IconName } from './Icon'
import Icon from './Icon'
import { visibleMenus } from '../permissions'
import { useAuth } from '../hooks/useAuth'
import { useDebounce } from '../hooks/useQuery'
import type { MenuItem } from '../permissions'
import { scoreApi, serviceApi, topicApi, userApi } from '../api'
import type { Account, Message, Notice, PoolTopic, Project, ScoreRow, Topic } from '../types'
import FeedDetail, { type FeedDetailData } from './FeedDetail'
import { fmtDate } from '../utils/datetime'

/** 每组内容命中最多展示条数 */
const PER_GROUP = 5

/** 数据内容命中：来自公告 / 消息 / 题目 / 课题 / 成绩 / 账号 */
interface ContentHit {
  kind: 'notice' | 'message' | 'topic' | 'project' | 'score' | 'user'
  icon: IconName
  title: string
  sub: string
  /** 跳转目标页面；公告 / 消息为弹窗查看，无跳转 */
  path?: string
  detail?: FeedDetailData
}

type Row =
  | { t: 'menu'; key: string; menu: MenuItem }
  | { t: 'data'; key: string; hit: ContentHit }

interface Group {
  label: string
  rows: Row[]
}

/**
 * 全局搜索（命令面板）：既搜页面菜单，也搜实际内容——
 * 公告、站内消息、题目、课题、成绩、账号，按身份权限取数；
 * 公告 / 消息点击后弹窗查看全文，其余跳转到对应管理页面。Ctrl/⌘+K 唤起。
 */
export default function GlobalSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { me, hasPerm } = useAuth()
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const [dataGroups, setDataGroups] = useState<Group[]>([])
  const [searching, setSearching] = useState(false)
  const [detail, setDetail] = useState<FeedDetailData | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const kw = useDebounce(q.trim(), 300)

  useEffect(() => {
    if (open) {
      setQ('')
      setActive(0)
      const t = setTimeout(() => inputRef.current?.focus(), 30)
      return () => clearTimeout(t)
    }
  }, [open])

  useEffect(() => setActive(0), [kw])

  // 内容检索：按身份决定查询范围，失败的数据源静默跳过，不阻塞其他结果
  useEffect(() => {
    if (!open || !kw) {
      setDataGroups([])
      setSearching(false)
      return
    }
    let alive = true
    setSearching(true)
    const slots: Group[] = []
    const slot = (label: string): Row[] => {
      const s: Group = { label, rows: [] }
      slots.push(s)
      return s.rows
    }
    const jobs: Promise<void>[] = []
    const guard = (fn: () => void) => {
      jobs.push(
        Promise.resolve().then(fn).catch(() => undefined),
      )
    }

    // 公告：标题 / 内容检索，所有人可见（后端按发布范围过滤）
    const noticeRows = slot('公告')
    guard(() =>
      serviceApi.notices(kw).then((rs: Notice[]) => {
        rs.slice(0, PER_GROUP).forEach((n) =>
          noticeRows.push({
            t: 'data',
            key: `notice-${n.noticeId}`,
            hit: {
              kind: 'notice',
              icon: 'notice',
              title: n.title,
              sub: `${n.noticeType} · ${fmtDate(n.publishTime)}`,
              detail: {
                kind: 'notice',
                title: n.title,
                content: n.content,
                time: n.publishTime,
                tags: [
                  ...(n.isTop ? [{ text: '置顶', tone: 'red' as const }] : []),
                  { text: n.noticeType, tone: 'blue' as const },
                ],
                meta: [
                  { label: '发布范围', value: (n.scope || '全院').split(',').join('、') },
                  { label: '发布人', value: n.publisher },
                ],
              },
            },
          }),
        )
      }),
    )

    // 站内消息：接口不带关键词，拉取后按标题 / 内容本地过滤
    const msgRows = slot('站内消息')
    guard(() =>
      serviceApi.messages().then((rs: Message[]) => {
        rs.filter((m) => m.title.includes(kw) || m.content.includes(kw))
          .slice(0, PER_GROUP)
          .forEach((m) =>
            msgRows.push({
              t: 'data',
              key: `msg-${m.messageId}`,
              hit: {
                kind: 'message',
                icon: 'message',
                title: m.title,
                sub: `${m.msgType} · ${fmtDate(m.sendTime)}`,
                detail: {
                  kind: 'message',
                  title: m.title,
                  content: m.content,
                  time: m.sendTime,
                  tags: [{ text: m.msgType, tone: 'blue' as const }],
                  meta: [{ label: '发送人', value: m.senderName ?? '系统' }],
                },
              },
            }),
          )
      }),
    )

    // 题目：教师 / 管理员搜题目管理，学生搜可选题目池
    if (hasPerm('/topic/apply') || hasPerm('/topic/audit')) {
      const topicRows = slot('题目')
      guard(() =>
        topicApi.list(kw).then((rs: Topic[]) => {
          rs.slice(0, PER_GROUP).forEach((t) =>
            topicRows.push({
              t: 'data',
              key: `topic-${t.topicNo}`,
              hit: {
                kind: 'topic',
                icon: 'topic',
                title: t.topicName,
                sub: `${t.topicNo} · ${t.topicType} · ${t.teacherName} · ${t.status}`,
                path: '/topic/apply',
              },
            }),
          )
        }),
      )
    }
    if (hasPerm('/topic/select')) {
      const poolRows = slot('可选题目')
      guard(() =>
        topicApi.pool(kw).then((rs: PoolTopic[]) => {
          rs.slice(0, PER_GROUP).forEach((t) =>
            poolRows.push({
              t: 'data',
              key: `pool-${t.topicNo}`,
              hit: {
                kind: 'topic',
                icon: 'pool',
                title: t.topicName,
                sub: `${t.topicNo} · ${t.topicType} · ${t.teacherName}`,
                path: '/topic/pool',
              },
            }),
          )
        }),
      )
    }

    // 课题：按数据范围收敛（学生只见本人）
    const projRows = slot('课题')
    guard(() =>
      topicApi.projects(kw).then((rs: Project[]) => {
        rs.slice(0, PER_GROUP).forEach((p) =>
          projRows.push({
            t: 'data',
            key: `proj-${p.projectNo}`,
            hit: {
              kind: 'project',
              icon: 'project',
              title: p.topicName,
              sub: `${p.projectNo} · ${p.studentName}（${p.studentNo}）· ${p.teacherName}`,
              path: '/projects',
            },
          }),
        )
      }),
    )

    // 成绩：管理员进成绩评定，毕业生进工作台（后端按身份收敛数据）
    if (hasPerm('/score/manage')) {
      const scoreRows = slot('成绩')
      guard(() =>
        scoreApi.list(kw).then((rs: ScoreRow[]) => {
          rs.slice(0, PER_GROUP).forEach((s) =>
            scoreRows.push({
              t: 'data',
              key: `score-${s.projectNo}`,
              hit: {
                kind: 'score',
                icon: 'score',
                title: `${s.studentName} · ${s.topicName}`,
                sub: `${s.projectNo} · 总评 ${s.totalScore ?? '—'} · ${s.publishStatus}`,
                path: '/score/manage',
              },
            }),
          )
        }),
      )
    } else if (me?.roles.includes('毕业生')) {
      const scoreRows = slot('我的成绩')
      guard(() =>
        scoreApi.list(kw).then((rs: ScoreRow[]) => {
          rs.slice(0, PER_GROUP).forEach((s) =>
            scoreRows.push({
              t: 'data',
              key: `score-${s.projectNo}`,
              hit: {
                kind: 'score',
                icon: 'score',
                title: s.topicName,
                sub: `总评 ${s.totalScore ?? '—'} · ${s.publishStatus}`,
                path: '/my-project',
              },
            }),
          )
        }),
      )
    }

    // 账号：仅账号管理员可检索
    if (hasPerm('/auth/user')) {
      const userRows = slot('账号')
      guard(() =>
        userApi.users(kw).then((rs: Account[]) => {
          rs.slice(0, PER_GROUP).forEach((u) =>
            userRows.push({
              t: 'data',
              key: `user-${u.userId}`,
              hit: {
                kind: 'user',
                icon: 'user',
                title: `${u.name}（${u.account}）`,
                sub: `${u.userType}${u.studentNo ? ` · ${u.studentNo}` : ''} · ${u.status}`,
                path: '/auth/user',
              },
            }),
          )
        }),
      )
    }

    Promise.all(jobs).then(() => {
      if (!alive) return
      setDataGroups(slots.filter((s) => s.rows.length > 0))
      setSearching(false)
    })
    return () => {
      alive = false
    }
  }, [kw, open, me, hasPerm])

  // 页面菜单命中：保留原有能力，作为内容之外的补充
  const menuHits = useMemo<MenuItem[]>(() => {
    if (!me) return []
    const all = visibleMenus(me).flatMap((g) => g.items)
    if (!kw) return all.slice(0, 8)
    const k = kw.toLowerCase()
    return all
      .filter((m) => m.label.toLowerCase().includes(k) || m.path.toLowerCase().includes(k) || m.group.toLowerCase().includes(k))
      .slice(0, 6)
  }, [kw, me])

  const groups = useMemo<Group[]>(() => {
    const menuGroup: Group = { label: kw ? '页面' : '常用页面', rows: menuHits.map((m) => ({ t: 'menu' as const, key: `menu-${m.key}`, menu: m })) }
    return [...dataGroups, menuGroup].filter((g) => g.rows.length > 0)
  }, [dataGroups, menuHits, kw])

  const flat = useMemo(() => groups.flatMap((g) => g.rows), [groups])
  const totalHits = flat.length

  function go(path: string) {
    onClose()
    nav(path)
  }

  function openHit(row: Row) {
    if (row.t === 'menu') {
      go(row.menu.path)
      return
    }
    const h = row.hit
    if (h.detail) {
      // 公告 / 消息：先收起面板，再弹窗查看全文
      onClose()
      setDetail(h.detail)
      return
    }
    if (h.path) go(h.path)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(a + 1, totalHits - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (flat[active]) openHit(flat[active])
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  /** 命中片段高亮 */
  function mark(text: string): ReactNode {
    if (!kw) return text
    const i = text.toLowerCase().indexOf(kw.toLowerCase())
    if (i < 0) return text
    return (
      <>
        {text.slice(0, i)}
        <mark>{text.slice(i, i + kw.length)}</mark>
        {text.slice(i + kw.length)}
      </>
    )
  }

  let idx = -1

  return (
    <>
      <FeedDetail open={!!detail} data={detail} onClose={() => setDetail(null)} />
      {open && (
        <div className="search-mask" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
          <div className="search-palette">
            <div className="search-input-row">
              <Icon name="search" size={16} />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="搜索公告、题目、课题、成绩等数据，或页面菜单…"
              />
              <kbd>Esc</kbd>
            </div>

            <div className="search-results">
              {searching && <div className="search-tip">正在搜索内容…</div>}
              {!searching && totalHits === 0 && (
                <div className="search-empty">没有匹配的内容或页面，换个关键词试试</div>
              )}
              {groups.map((g) => (
                <div className="search-group-wrap" key={g.label}>
                  <div className="search-group">{g.label}</div>
                  {g.rows.map((row) => {
                    idx += 1
                    const i = idx
                    if (row.t === 'menu') {
                      const m = row.menu
                      return (
                        <button
                          key={row.key}
                          className={`search-hit${i === active ? ' active' : ''}`}
                          onMouseEnter={() => setActive(i)}
                          onClick={() => go(m.path)}
                        >
                          <span className="search-hit-ico">
                            <Icon name={m.icon as IconName} size={15} />
                          </span>
                          <span className="search-hit-main">
                            <span className="search-hit-label">{mark(m.label)}</span>
                            <span className="search-hit-sub">{m.group} · {m.path}</span>
                          </span>
                          {i === active && <span className="search-hit-enter">↵</span>}
                        </button>
                      )
                    }
                    const h = row.hit
                    return (
                      <button
                        key={row.key}
                        className={`search-hit${i === active ? ' active' : ''}`}
                        onMouseEnter={() => setActive(i)}
                        onClick={() => openHit(row)}
                      >
                        <span className="search-hit-ico">
                          <Icon name={h.icon} size={15} />
                        </span>
                        <span className="search-hit-main">
                          <span className="search-hit-label">{mark(h.title)}</span>
                          <span className="search-hit-sub">{mark(h.sub)}</span>
                        </span>
                        <span className="search-hit-kind">{h.kind === 'notice' ? '查看' : h.kind === 'message' ? '查看' : '前往'}</span>
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>

            <div className="search-foot">
              <span><kbd>↑</kbd><kbd>↓</kbd> 选择</span>
              <span><kbd>Enter</kbd> {kw ? '查看 / 跳转' : '跳转'}</span>
              <span className="grow" />
              <span>{kw ? `${totalHits} 条结果` : '输入关键词搜索数据与页面'}</span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
