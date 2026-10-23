import Icon from './Icon'

/**
 * 材料文件链接。库中存储的是 "/uploads/课题号/文件名" 相对路径，
 * 统一经 /api/files/download 下发：开发期 Vite 只代理 /api，直链 /uploads
 * 会落到 SPA 兜底路由报"页面不存在或已被移除"；该接口 query 为纯 ASCII，
 * 且后端按扩展名决定浏览器预览(inline)还是附件下载(attachment)。
 */
export default function FileLink({
  path,
  download,
}: {
  path?: string
  /** 为 true 时强制作为附件保存；默认由后端按类型决定（PDF/图片可预览） */
  download?: boolean
}) {
  if (!path) return <span className="muted">未上传</span>
  const name = path.split('/').pop() || path
  const href = `/api/files/download?path=${encodeURIComponent(path)}${download ? '&dl=true' : ''}`
  return (
    <a
      className="file-link"
      href={href}
      target="_blank"
      rel="noreferrer"
      title={`${name}\n${path}`}
    >
      <Icon name="file" size={13} />
      <span className="ellipsis">{name}</span>
    </a>
  )
}
