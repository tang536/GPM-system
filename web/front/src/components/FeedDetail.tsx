import Modal from './Modal'
import Tag from './Tag'
import { fmtDateTime } from '../utils/datetime'

export interface FeedDetailData {
  kind: 'notice' | 'message'
  title: string
  content: string
  time: string
  /** 标题前的类型标签，如 置顶 / 公告类型 / 消息类型 */
  tags?: { text: string; tone?: 'red' | 'blue' }[]
  /** 底部附加信息：范围、发布人、发送人等 */
  meta?: { label: string; value: string }[]
}

/** 公告 / 站内消息详情弹窗：通知中心、仪表盘、消息页共用 */
export default function FeedDetail({
  open,
  data,
  onClose,
}: {
  open: boolean
  data: FeedDetailData | null
  onClose: () => void
}) {
  if (!data) return null
  return (
    <Modal
      open={open}
      title={data.title}
      subtitle={fmtDateTime(data.time)}
      onClose={onClose}
      footer={<button className="btn" onClick={onClose}>关闭</button>}
    >
      {data.tags && data.tags.length > 0 && (
        <div className="feed-detail-tags">
          {data.tags.map((t) => (
            <Tag key={t.text} tone={t.tone}>{t.text}</Tag>
          ))}
        </div>
      )}
      <div className="longtext-full">{data.content}</div>
      {data.meta && data.meta.length > 0 && (
        <div className="feed-detail-meta">
          {data.meta.map((m) => (
            <div key={m.label} className="feed-detail-meta-row">
              <span className="muted">{m.label}</span>
              <span>{m.value}</span>
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}
