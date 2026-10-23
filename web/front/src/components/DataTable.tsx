import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Empty, ErrorBox, Loading } from './State'
import { useAuth } from '../hooks/useAuth'

export interface Column<T> {
  key: string
  title: string
  render?: (row: T, index: number) => ReactNode
  /** 列内文字对齐；不写则与表头一致居中 */
  align?: 'left' | 'center' | 'right'
  width?: number | string
  /** 该列参与客户端排序 */
  sortValue?: (row: T) => string | number
  /** 仅指定用户类型可见（userType 取值：管理员/系主任/指导教师/评阅教师/学生）。
   *  用于仅管理侧需要的列 */
  onlyFor?: string[]
  /** 指定用户类型不可见该列。典型用法：hideFor: ['学生']——
   *  学生查看自己的数据时隐藏"学生/学号/课题编号"等自我标识列 */
  hideFor?: string[]
}

/** 表头与单元格使用同一套对齐类，保证数据相对表头居中 */
function alignClass(a?: 'left' | 'center' | 'right') {
  return a === 'right' ? 'num' : a === 'left' ? 'txt-left' : 'txt-center'
}

interface Props<T> {
  columns: Column<T>[]
  rows: T[] | null
  loading?: boolean
  error?: string | null
  rowKey: (row: T) => string | number
  onRetry?: () => void
  empty?: string
  pageSize?: number
  footer?: ReactNode
}

/**
 * 通用数据表：列定义驱动 + 客户端排序 + 分页 + 三态（加载/错误/空）。
 * 页面只需提供列与数据，避免每个列表页重复写表格骨架。
 * 列支持 onlyFor / hideFor 按用户类型过滤：学生端不展示"学生/学号/课题编号"等自我标识列。
 */
export default function DataTable<T>({
  columns: rawColumns,
  rows,
  loading,
  error,
  rowKey,
  onRetry,
  empty = '暂无数据',
  pageSize = 12,
  footer,
}: Props<T>) {
  const [page, setPage] = useState(1)
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [asc, setAsc] = useState(true)
  const { me } = useAuth()

  // 按身份过滤列：学生端自动隐藏"学生/学号/课题编号"等自我标识列，只看业务关键信息。
  // 注意：userType 有五档（管理员/系主任/指导教师/评阅教师/学生），"管理侧列"统一用
  // hideFor: ['学生'] 表达，避免白名单枚举遗漏身份
  const columns = useMemo(
    () =>
      rawColumns.filter(
        (c) =>
          (!c.onlyFor || (!!me && c.onlyFor.includes(me.userType))) &&
          (!c.hideFor || !(me && c.hideFor.includes(me.userType))),
      ),
    [rawColumns, me],
  )

  const sorted = useMemo(() => {
    if (!rows) return []
    if (!sortKey) return rows
    const col = columns.find((c) => c.key === sortKey)
    if (!col?.sortValue) return rows
    const copy = [...rows]
    copy.sort((a, b) => {
      const va = col.sortValue!(a)
      const vb = col.sortValue!(b)
      if (va === vb) return 0
      return (va > vb ? 1 : -1) * (asc ? 1 : -1)
    })
    return copy
  }, [rows, sortKey, asc, columns])

  const total = sorted.length
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const current = Math.min(page, pages)
  const view = sorted.slice((current - 1) * pageSize, current * pageSize)

  if (loading) return <Loading />
  if (error) return <ErrorBox text={error} onRetry={onRetry} />
  if (!rows || rows.length === 0) return <Empty text={empty} />

  return (
    <>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={alignClass(c.align)}
                  style={{ width: c.width, cursor: c.sortValue ? 'pointer' : undefined }}
                  onClick={() => {
                    if (!c.sortValue) return
                    if (sortKey === c.key) setAsc(!asc)
                    else {
                      setSortKey(c.key)
                      setAsc(true)
                    }
                  }}
                >
                  {c.title}
                  {sortKey === c.key && (asc ? ' ↑' : ' ↓')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {view.map((row, i) => (
              <tr key={rowKey(row)}>
                {columns.map((c) => (
                  <td key={c.key} className={alignClass(c.align)}>
                    {c.render ? c.render(row, i) : String((row as Record<string, unknown>)[c.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {(pages > 1 || footer) && (
        <div className="pager">
          {footer}
          <span style={{ marginLeft: 'auto' }}>共 {total} 条</span>
          {pages > 1 && (
            <>
              <button className="btn sm" disabled={current <= 1} onClick={() => setPage(current - 1)}>上一页</button>
              <span>{current} / {pages}</span>
              <button className="btn sm" disabled={current >= pages} onClick={() => setPage(current + 1)}>下一页</button>
            </>
          )}
        </div>
      )}
    </>
  )
}
