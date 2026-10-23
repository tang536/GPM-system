import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'

type Kind = 'ok' | 'err' | 'info'
interface Toast {
  id: number
  msg: string
  kind: Kind
  /** 停留时长（毫秒），到期自动消失并显示倒计时 */
  dur: number
}

interface UIApi {
  toast: (msg: string, kind?: Kind, dur?: number) => void
  ok: (msg: string, dur?: number) => void
  err: (msg: string, dur?: number) => void
  confirm: (text: string) => Promise<boolean>
}

const UICtx = createContext<UIApi | null>(null)
const DEFAULT_DUR = 3000

/** 单条提示：自带倒计时（进度条 + 剩余秒数），到期回调关闭 */
function ToastItem({ t, onClose }: { t: Toast; onClose: (id: number) => void }) {
  const [left, setLeft] = useState(() => Math.ceil(t.dur / 1000))
  const startRef = useRef(Date.now())

  useEffect(() => {
    const timer = setInterval(() => {
      const remain = t.dur - (Date.now() - startRef.current)
      if (remain <= 0) {
        clearInterval(timer)
        onClose(t.id)
        return
      }
      setLeft(Math.ceil(remain / 1000))
    }, 200)
    return () => clearInterval(timer)
  }, [t.id, t.dur, onClose])

  const icon = t.kind === 'ok' ? '✓' : t.kind === 'err' ? '✕' : 'i'
  return (
    <div className={`toast ${t.kind}`} role="status">
      <span className="toast-ico" aria-hidden>{icon}</span>
      <span className="toast-msg">{t.msg}</span>
      <span className="toast-sec">{left}s</span>
      <span className="toast-progress" style={{ animationDuration: `${t.dur}ms` }} />
    </div>
  )
}

/** 轻提示与二次确认：替代 window.alert/confirm，保持样式与主题一致 */
export function UIProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const [ask, setAsk] = useState<{ text: string; resolve: (v: boolean) => void } | null>(null)
  const seq = useRef(0)

  const close = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id))
  }, [])

  const toast = useCallback((msg: string, kind: Kind = 'info', dur: number = DEFAULT_DUR) => {
    const id = ++seq.current
    setToasts((t) => [...t.slice(-4), { id, msg, kind, dur }])
  }, [])

  const api = useMemo<UIApi>(
    () => ({
      toast,
      ok: (m, dur) => toast(m, 'ok', dur),
      err: (m, dur) => toast(m, 'err', dur),
      confirm: (text: string) =>
        new Promise<boolean>((resolve) => {
          setAsk({ text, resolve })
        }),
    }),
    [toast],
  )

  return (
    <UICtx.Provider value={api}>
      {children}
      <div className="toast-box">
        {toasts.map((t) => (
          <ToastItem key={t.id} t={t} onClose={close} />
        ))}
      </div>
      {ask && (
        <div className="mask" onClick={() => { ask.resolve(false); setAsk(null) }}>
          <div className="modal" style={{ width: 400 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>请确认</h3>
            </div>
            <div className="modal-body" style={{ paddingTop: 16 }}>{ask.text}</div>
            <div className="modal-foot">
              <button className="btn" onClick={() => { ask.resolve(false); setAsk(null) }}>取消</button>
              <button className="btn primary" onClick={() => { ask.resolve(true); setAsk(null) }}>确定</button>
            </div>
          </div>
        </div>
      )}
    </UICtx.Provider>
  )
}

export function useUI(): UIApi {
  const ctx = useContext(UICtx)
  if (!ctx) throw new Error('useUI 必须在 UIProvider 内使用')
  return ctx
}
