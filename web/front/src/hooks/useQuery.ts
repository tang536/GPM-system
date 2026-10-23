import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError } from '../api'

export interface QueryResult<T> {
  data: T | null
  loading: boolean
  error: string | null
  reload: () => void
}

/**
 * 列表数据加载：依赖变化自动重取，避免每个页面重复写 loading/error 三态。
 * 传入 null 表示当前不需要请求（如未选年级）。
 */
export function useQuery<T>(fetcher: (() => Promise<T>) | null, deps: unknown[] = []): QueryResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(!!fetcher)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  useEffect(() => {
    const fn = fetcherRef.current
    if (!fn) {
      setData(null)
      setLoading(false)
      return
    }
    let alive = true
    setLoading(true)
    setError(null)
    fn()
      .then((d) => {
        if (alive) setData(d)
      })
      .catch((e: unknown) => {
        if (alive) setError(e instanceof ApiError ? e.message : '加载失败')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick])

  const reload = useCallback(() => setTick((t) => t + 1), [])
  return { data, loading, error, reload }
}

/** 搜索框防抖，避免逐字符请求 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [v, setV] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setV(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return v
}
