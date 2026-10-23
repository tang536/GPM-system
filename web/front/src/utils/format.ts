/** 数值与文本格式化小工具 */

export function score(v: number | null | undefined, digits = 1): string {
  if (v === null || v === undefined) return '—'
  return Number(v).toFixed(digits)
}

export function pct(part: number, total: number): string {
  if (!total) return '0%'
  return `${Math.round((part / total) * 100)}%`
}

export function fileSize(kb: number): string {
  if (kb >= 1024) return `${(kb / 1024).toFixed(1)} MB`
  return `${kb} KB`
}

/** 取姓名首字用于头像 */
export function initial(name?: string | null): string {
  return (name ?? '?').slice(0, 1)
}
