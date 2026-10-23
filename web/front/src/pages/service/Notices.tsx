import { useEffect, useRef, useState } from 'react'
import { ApiError, serviceApi } from '../../api'
import Icon from '../../components/Icon'
import Modal from '../../components/Modal'
import FeedDetail from '../../components/FeedDetail'
import { Field, PageHead } from '../../components/State'
import Tag from '../../components/Tag'
import { useUI } from '../../components/UIProvider'
import { useAuth } from '../../hooks/useAuth'
import { useQuery } from '../../hooks/useQuery'
import type { Notice } from '../../types'
import { fmtDateTime } from '../../utils/datetime'

const SCOPES = ['全院', '教师', '指导教师', '评阅教师', '学生', '毕业生']
const TYPES = ['通知', '公告', '政策']

const blank = { title: '', content: '', noticeType: '通知', scopes: ['全院'], isTop: false }

/** 发布范围多选：全院与具体范围互斥，面板内复选框多选 */
function ScopeMulti({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  function toggle(s: string) {
    if (s === '全院') {
      onChange(value.includes('全院') ? [] : ['全院'])
      return
    }
    const next = value.includes(s)
      ? value.filter((x) => x !== s)
      : [...value.filter((x) => x !== '全院'), s]
    onChange(next)
  }

  return (
    <div className="multi-sel" ref={ref}>
      <button type="button" className={`multi-sel-btn${open ? ' open' : ''}`} onClick={() => setOpen((o) => !o)}>
        <span className={`multi-sel-label${value.length ? '' : ' muted'}`}>
          {value.length ? value.join('、') : '请选择发布范围'}
        </span>
        <Icon name="chevron" size={13} />
      </button>
      {open && (
        <div className="multi-sel-panel">
          {SCOPES.map((s) => (
            <label key={s}>
              <input type="checkbox" checked={value.includes(s)} onChange={() => toggle(s)} />
              <span>{s}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

/** 公告信息：按发布范围投放，发布时自动向范围内人员推送站内消息 */
export default function Notices() {
  const ui = useUI()
  const { me, isAdmin } = useAuth()
  const canPublish = isAdmin || !!me?.roles.includes('系主任')
  const [kw, setKw] = useState('')
  const [type, setType] = useState('')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Notice | null>(null)
  const [form, setForm] = useState(blank)
  // 公告详情弹窗
  const [detail, setDetail] = useState<Notice | null>(null)

  const list = useQuery<Notice[]>(() => serviceApi.notices(kw, type), [kw, type])

  function openAdd() {
    setEditing(null)
    setForm({ ...blank })
    setOpen(true)
  }

  function openEdit(n: Notice) {
    setEditing(n)
    const scopes = (n.scope ?? '').split(',').map((s) => s.trim()).filter(Boolean)
    setForm({ title: n.title, content: n.content, noticeType: n.noticeType, scopes: scopes.length ? scopes : ['全院'], isTop: n.isTop })
    setOpen(true)
  }

  async function save() {
    if (!form.title.trim() || !form.content.trim()) {
      ui.err('标题与内容不能为空')
      return
    }
    if (form.scopes.length === 0) {
      ui.err('请至少选择一个发布范围')
      return
    }
    try {
      const body = { title: form.title.trim(), content: form.content, noticeType: form.noticeType, scopes: form.scopes, isTop: form.isTop }
      if (editing) await serviceApi.updateNotice(editing.noticeId, body)
      else await serviceApi.addNotice(body)
      ui.ok(editing ? '公告已更新' : '公告已发布，并按范围推送消息')
      setOpen(false)
      list.reload()
    } catch (e) {
      ui.err(e instanceof ApiError ? e.message : '保存失败')
    }
  }

  return (
    <>
      <PageHead title="公告信息" desc="公告按发布范围投放：全院公告所有身份可见，其余按身份定向推送">
        <input placeholder="搜索标题 / 内容" value={kw} onChange={(e) => setKw(e.target.value)} style={{ width: 200 }} />
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">全部类型</option>
          {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        {canPublish && <button className="btn primary" onClick={openAdd}>发布公告</button>}
      </PageHead>

      {list.loading && <div className="card"><div className="loading"><div className="spinner" />加载中…</div></div>}
      {list.error && <div className="card"><div className="empty">{list.error}</div></div>}

      <div className="card">
        {list.data?.map((n) => (
          <div className="notice-item clickable" key={n.noticeId} onClick={() => setDetail(n)}>
            <h4>
              {n.isTop && <Tag tone="red">置顶</Tag>}
              <Tag tone="blue">{n.noticeType}</Tag>
              {n.title}
            </h4>
            <p>{n.content}</p>
            <div className="notice-meta">
              <span>范围：{(n.scope || '全院').split(',').join('、')}</span>
              <span>发布人：{n.publisher}</span>
              <span>{fmtDateTime(n.publishTime)}</span>
              {canPublish && (
                <span className="row-actions" onClick={(e) => e.stopPropagation()}>
                  <button className="btn sm" onClick={() => openEdit(n)}>编辑</button>
                  <button
                    className="btn sm danger"
                    onClick={async () => {
                      if (!(await ui.confirm(`删除公告「${n.title}」？`))) return
                      try {
                        await serviceApi.delNotice(n.noticeId)
                        ui.ok('已删除')
                        list.reload()
                      } catch (e) {
                        ui.err(e instanceof ApiError ? e.message : '删除失败')
                      }
                    }}
                  >
                    删除
                  </button>
                </span>
              )}
            </div>
          </div>
        ))}
        {list.data?.length === 0 && <div className="empty">暂无公告</div>}
      </div>

      <Modal
        open={open}
        title={editing ? '编辑公告' : '发布公告'}
        onClose={() => setOpen(false)}
        wide
        footer={
          <>
            <button className="btn" onClick={() => setOpen(false)}>取消</button>
            <button className="btn primary" onClick={save}>保存</button>
          </>
        }
      >
        <Field label="公告标题">
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </Field>
        <div className="grid2">
          <Field label="公告类型">
            <select value={form.noticeType} onChange={(e) => setForm({ ...form, noticeType: e.target.value })}>
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="发布范围（可多选）">
            <ScopeMulti value={form.scopes} onChange={(scopes) => setForm({ ...form, scopes })} />
          </Field>
        </div>
        <Field label="公告内容">
          <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} style={{ minHeight: 140 }} />
        </Field>
        <div className="check-row">
          <label>
            <input type="checkbox" checked={form.isTop} onChange={(e) => setForm({ ...form, isTop: e.target.checked })} />
            置顶显示（在公告列表最前方展示）
          </label>
        </div>
      </Modal>

      {/* 公告详情弹窗 */}
      <FeedDetail
        open={!!detail}
        data={detail ? {
          kind: 'notice',
          title: detail.title,
          content: detail.content,
          time: detail.publishTime,
          tags: [
            ...(detail.isTop ? [{ text: '置顶', tone: 'red' as const }] : []),
            { text: detail.noticeType, tone: 'blue' as const },
          ],
          meta: [
            { label: '发布范围', value: (detail.scope || '全院').split(',').join('、') },
            { label: '发布人', value: detail.publisher },
          ],
        } : null}
        onClose={() => setDetail(null)}
      />
    </>
  )
}
