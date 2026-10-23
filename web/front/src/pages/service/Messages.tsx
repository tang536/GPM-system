import { useState } from 'react'
import { ApiError, serviceApi } from '../../api'
import FeedDetail from '../../components/FeedDetail'
import { PageHead } from '../../components/State'
import { StatGrid } from '../../components/StatCard'
import Tag from '../../components/Tag'
import { useUI } from '../../components/UIProvider'
import { useQuery } from '../../hooks/useQuery'
import type { Message } from '../../types'
import { fmtDateTime } from '../../utils/datetime'

/** 站内消息：审核结果、成绩发布、延期审批等业务事件自动推送 */
export default function Messages() {
  const ui = useUI()
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [detail, setDetail] = useState<Message | null>(null)

  const list = useQuery<Message[]>(() => serviceApi.messages(unreadOnly), [unreadOnly])
  const unread = useQuery(() => serviceApi.unread(), [])

  /** 点击消息：弹窗查看全文；未读的顺带标记已读 */
  async function openOne(m: Message) {
    setDetail(m)
    if (!m.isRead) {
      try {
        await serviceApi.readOne(m.messageId)
        list.reload()
        unread.reload()
      } catch (e) {
        ui.err(e instanceof ApiError ? e.message : '标记已读失败')
      }
    }
  }

  async function readAll() {
    try {
      await serviceApi.readAll()
      ui.ok('已全部标记为已读')
      list.reload()
      unread.reload()
    } catch (e) {
      ui.err(e instanceof ApiError ? e.message : '操作失败')
    }
  }

  return (
    <>
      <PageHead title="站内消息" desc="课题审核、材料评阅、延期审批、成绩发布等事件由系统自动推送">
        <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13 }}>
          <input type="checkbox" checked={unreadOnly} onChange={(e) => setUnreadOnly(e.target.checked)} />
          只看未读
        </label>
        <button className="btn" onClick={readAll}>全部标记已读</button>
      </PageHead>

      <StatGrid
        items={[
          { key: 'u', label: '未读消息', value: unread.data?.count ?? 0, desc: '需要处理的事项', highlight: (unread.data?.count ?? 0) > 0 },
          { key: 't', label: '消息总数', value: list.data?.length ?? 0, desc: unreadOnly ? '仅未读' : '全部' },
        ]}
      />

      <div className="card">
        {list.loading && <div className="loading"><div className="spinner" />加载中…</div>}
        {list.data?.map((m) => (
          <div key={m.messageId} style={{ borderBottom: '1px solid var(--border)' }}>
            <div
              className="notice-item clickable"
              style={{ background: m.isRead ? undefined : 'var(--brand-soft)' }}
              onClick={() => openOne(m)}
            >
              <h4>
                {!m.isRead && <Tag tone="red">未读</Tag>}
                <Tag tone="blue">{m.msgType}</Tag>
                {m.title}
              </h4>
              <p className="ellipsis" style={{ maxWidth: '100%' }}>{m.content}</p>
              <div className="notice-meta">
                <span>发送人：{m.senderName ?? '系统'}</span>
                <span>{fmtDateTime(m.sendTime)}</span>
              </div>
            </div>
          </div>
        ))}
        {list.data?.length === 0 && <div className="empty">没有消息</div>}
      </div>

      {/* 消息详情弹窗 */}
      <FeedDetail
        open={!!detail}
        data={detail ? {
          kind: 'message',
          title: detail.title,
          content: detail.content,
          time: detail.sendTime,
          tags: [{ text: detail.msgType, tone: 'blue' as const }],
          meta: [{ label: '发送人', value: detail.senderName ?? '系统' }],
        } : null}
        onClose={() => setDetail(null)}
      />
    </>
  )
}
