import { useEffect, type ReactNode } from 'react'

interface Props {
  open: boolean
  title: string
  /** 副标题：放置编号、说明等辅助信息，避免把长编号拼进标题 */
  subtitle?: ReactNode
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}

/** 通用弹窗：点击遮罩、右上角按钮或 Esc 关闭，脚部按钮由页面决定 */
export default function Modal({ open, title, subtitle, onClose, children, footer, wide }: Props) {
  // Esc 关闭：弹窗打开时监听，卸载或关闭时移除，避免影响其他键盘操作
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="mask" onMouseDown={onClose}>
      <div
        className={`modal${wide ? ' wide' : ''}`}
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="modal-head">
          <div className="modal-title-wrap">
            <h3>{title}</h3>
            {subtitle && <div className="modal-sub">{subtitle}</div>}
          </div>
          <div className="grow" />
          <button className="modal-close" onClick={onClose} aria-label="关闭">✕</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  )
}
