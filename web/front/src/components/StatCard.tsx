import type { ReactNode } from 'react'
import Icon from './Icon'

export interface StatItem {
  key: string
  label: string
  value: ReactNode
  desc?: string
  highlight?: boolean
  /** 点击直达的功能页面路径；配置后整卡可点击跳转 */
  to?: string
}

export default function StatCard({
  item,
  onNavigate,
}: {
  item: StatItem
  onNavigate?: (path: string) => void
}) {
  const clickable = !!item.to && !!onNavigate
  const body = (
    <>
      <div className="k">{item.label}</div>
      <div className="v">{item.value}</div>
      {item.desc && <div className="d">{item.desc}</div>}
      {clickable && (
        <span className="stat-go" aria-hidden="true">
          <Icon name="chevron" size={14} />
        </span>
      )}
    </>
  )
  if (clickable) {
    return (
      <button
        type="button"
        className={`stat${item.highlight ? ' hl' : ''} clickable`}
        onClick={() => onNavigate?.(item.to!)}
        title={`前往：${item.label}`}
      >
        {body}
      </button>
    )
  }
  return <div className={`stat${item.highlight ? ' hl' : ''}`}>{body}</div>
}

export function StatGrid({
  items,
  onNavigate,
}: {
  items: StatItem[]
  onNavigate?: (path: string) => void
}) {
  return (
    <div className="stat-grid">
      {items.map((it) => (
        <StatCard key={it.key} item={it} onNavigate={onNavigate} />
      ))}
    </div>
  )
}
