import { useState } from 'react'
import Modal from './Modal'

interface Props {
  text?: string | null
  /** 弹窗标题，如「评阅意见」 */
  title: string
  /** 副标题：可放阶段、题目等上下文 */
  subtitle?: string
  /** 单元格内最多显示字符数，超出截断并显示「查看」 */
  max?: number
  empty?: string
}

/** 表格长文本：超出长度截断显示，点击「查看」弹窗展示全文 */
export default function LongText({ text, title, subtitle, max = 16, empty = '—' }: Props) {
  const [open, setOpen] = useState(false)
  const t = (text ?? '').trim()
  if (!t) return <>{empty}</>
  const long = t.length > max
  return (
    <>
      <span className="longtext">
        <span className="ellipsis" title={t}>{long ? `${t.slice(0, max)}…` : t}</span>
        {long && (
          <button
            type="button"
            className="longtext-view"
            onClick={(e) => { e.stopPropagation(); setOpen(true) }}
          >
            查看
          </button>
        )}
      </span>
      <Modal open={open} title={title} subtitle={subtitle} onClose={() => setOpen(false)}>
        <div className="longtext-full">{t}</div>
      </Modal>
    </>
  )
}
