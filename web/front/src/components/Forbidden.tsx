import { useNavigate } from 'react-router-dom'

/** 403：身份无权访问该模块时的兜底页 */
export default function Forbidden({ text = '当前身份无权访问该功能' }: { text?: string }) {
  const nav = useNavigate()
  return (
    <div className="forbidden">
      <div>
        <div className="code">403</div>
        <p className="muted" style={{ margin: '10px 0 18px' }}>{text}</p>
        <button className="btn primary" onClick={() => nav('/dashboard')}>返回工作台</button>
      </div>
    </div>
  )
}
