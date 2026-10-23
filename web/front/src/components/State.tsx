import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { titleOf } from '../permissions'

/** 加载态 */
export function Loading({ text = '数据加载中…' }: { text?: string }) {
  return (
    <div className="loading">
      <div className="spinner" />
      {text}
    </div>
  )
}

/** 空态 */
export function Empty({ text = '暂无数据', icon = '—' }: { text?: string; icon?: string }) {
  return (
    <div className="empty">
      <div className="ico">{icon}</div>
      {text}
    </div>
  )
}

/** 错误态：把后端返回的中文提示直接展示 */
export function ErrorBox({ text, onRetry }: { text: string; onRetry?: () => void }) {
  return (
    <div className="empty">
      <div className="ico">!</div>
      {text}
      {onRetry && (
        <div style={{ marginTop: 12 }}>
          <button className="btn sm" onClick={onRetry}>重试</button>
        </div>
      )}
    </div>
  )
}

/**
 * 页面标题区。顶栏已展示当前菜单标题（titleOf），
 * 页面标题与之相同、或仅多一级身份前缀（如"学生工作台" vs "工作台"）时
 * 不再重复渲染标题，仅保留说明文字与操作区。
 */
export function PageHead({
  title,
  desc,
  children,
}: {
  title: string
  desc?: string
  children?: ReactNode
}) {
  const { pathname } = useLocation()
  const top = titleOf(pathname)
  const duplicate = !!top && (title === top || (top.length > 1 && title.endsWith(top)))
  return (
    <div className="page-head">
      <div>
        {!duplicate && <h2>{title}</h2>}
        {desc && <p>{desc}</p>}
      </div>
      {children && <div className="grow" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>{children}</div>}
    </div>
  )
}

/** 表单字段：label 支持必填标记，hint 为字段下方的说明文字 */
export function Field({
  label,
  children,
  span,
  required,
  hint,
}: {
  label: string
  children: ReactNode
  /** 占满整行（两列网格中） */
  span?: boolean
  /** 必填项，标签后加红色星号 */
  required?: boolean
  /** 字段下方的灰色说明 */
  hint?: string
}) {
  return (
    <div className={`field${span ? ' span2' : ''}`}>
      <label>
        {required && <i className="req" aria-hidden="true">*</i>}
        {label}
      </label>
      {children}
      {hint && <div className="field-hint">{hint}</div>}
    </div>
  )
}
