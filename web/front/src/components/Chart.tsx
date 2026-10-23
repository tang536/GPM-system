/** 纯 SVG/CSS 图表：条形、环形、分组柱状，避免引入图表库；均带 hover 高亮与数值提示 */
import { useState } from 'react'

export interface BarDatum {
  label: string
  value: number
  hint?: string
}

/** 横向条形榜：用于阶段提交率、教师工作量等排序型数据 */
export function BarList({ data, max, unit = '' }: { data: BarDatum[]; max?: number; unit?: string }) {
  const top = max ?? Math.max(1, ...data.map((d) => d.value))
  return (
    <div className="bar-list">
      {data.map((d) => (
        <div className="bar-row" key={d.label} title={`${d.label}：${d.value}${unit}`}>
          <span className="ellipsis" title={d.label}>{d.label}</span>
          <span className="bar-track">
            <span className="bar-fill" style={{ width: `${Math.min(100, (d.value / top) * 100)}%` }} />
          </span>
          <b className="bar-value">
            {d.value}
            {unit}
          </b>
        </div>
      ))}
    </div>
  )
}

export interface SliceDatum {
  label: string
  value: number
  color: string
}

/** 环形占比图：用于成绩等级分布；悬停扇区加粗并在中心显示该段明细 */
export function Donut({ data, size = 168, thickness = 20 }: {
  data: SliceDatum[]
  size?: number
  thickness?: number
}) {
  const [hover, setHover] = useState<string | null>(null)
  const total = data.reduce((s, d) => s + d.value, 0)
  const r = (size - thickness) / 2
  const c = 2 * Math.PI * r
  let offset = 0
  const active = data.find((d) => d.label === hover) ?? null

  return (
    <div className="donut">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="占比图">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--brand-soft)" strokeWidth={thickness} />
        {total > 0 &&
          data.map((d) => {
            const len = (d.value / total) * c
            const dim = hover !== null && hover !== d.label
            const el = (
              <circle
                key={d.label}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={d.color}
                strokeWidth={hover === d.label ? thickness + 6 : thickness}
                strokeDasharray={`${len} ${c - len}`}
                strokeDashoffset={-offset}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                strokeLinecap="butt"
                className="donut-slice"
                style={{ opacity: dim ? 0.35 : 1 }}
                onMouseEnter={() => setHover(d.label)}
                onMouseLeave={() => setHover(null)}
              />
            )
            offset += len
            return el
          })}
        <text
          x="50%"
          y="48%"
          textAnchor="middle"
          fontSize={active ? '24' : '22'}
          fontWeight="700"
          fill="var(--text)"
          style={{ pointerEvents: 'none' }}
        >
          {active ? active.value : total}
        </text>
        <text
          x="50%"
          y="63%"
          textAnchor="middle"
          fontSize="11"
          fill="var(--muted)"
          style={{ pointerEvents: 'none' }}
        >
          {active ? active.label : '合计'}
        </text>
      </svg>
      <div className="donut-legend">
        {data.map((d) => (
          <div
            key={d.label}
            className={`donut-legend-item${hover === d.label ? ' on' : ''}`}
            onMouseEnter={() => setHover(d.label)}
            onMouseLeave={() => setHover(null)}
          >
            <i style={{ background: d.color }} />
            <span className="muted" style={{ minWidth: 56 }}>{d.label}</span>
            <b>{d.value}</b>
            <span className="muted">{total ? `${Math.round((d.value / total) * 100)}%` : '0%'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export interface ColumnDatum {
  label: string
  a: number
  b?: number
}

/** 纵向分组柱：用于「应交 / 已交」这类阶段对比；悬停时高亮该组并显示数值 */
export function ColumnChart({ data, labelA = '应交', labelB = '已交' }: {
  data: ColumnDatum[]
  labelA?: string
  labelB?: string
}) {
  const [hover, setHover] = useState<string | null>(null)
  const max = Math.max(1, ...data.flatMap((d) => [d.a, d.b ?? 0]))
  const h = 150
  return (
    <div className="col-chart-wrap">
      <div className="col-chart" style={{ height: h }}>
        {data.map((d) => (
          <div
            key={d.label}
            className={`col-item${hover === d.label ? ' on' : ''}`}
            onMouseEnter={() => setHover(d.label)}
            onMouseLeave={() => setHover(null)}
          >
            {hover === d.label && (
              <span className="chart-tip">
                {labelA} {d.a}
                {d.b !== undefined ? ` · ${labelB} ${d.b}` : ''}
              </span>
            )}
            <div className="col-bars" style={{ height: h - 26 }}>
              <span
                className="col-bar muted-bar"
                title={`${labelA} ${d.a}`}
                style={{ height: `${(d.a / max) * (h - 30)}px` }}
              />
              {d.b !== undefined && (
                <span
                  className="col-bar brand-bar"
                  title={`${labelB} ${d.b}`}
                  style={{ height: `${(d.b / max) * (h - 30)}px` }}
                />
              )}
            </div>
            <span className="col-label">{d.label}</span>
          </div>
        ))}
      </div>
      <div className="legend">
        <span><i style={{ background: 'var(--chart-muted)' }} />{labelA}</span>
        <span><i style={{ background: 'var(--brand)' }} />{labelB}</span>
      </div>
    </div>
  )
}
