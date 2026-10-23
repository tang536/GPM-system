import type { ReactNode } from 'react'

/** 业务状态 → 颜色语义（红色主题下：红=异常/待办，绿=完成） */
const MAP: { keys: string[]; cls: string }[] = [
  { keys: ['已发布', '已匹配', '已确认', '通过', '已通过', '同意', '启用', '正常', '已提交', '优', '优秀'], cls: 'green' },
  { keys: ['待审核', '待确认', '待审批', '待评阅', '待发布', '审核中', '进行中', '申请中', '草稿'], cls: 'amber' },
  { keys: ['驳回', '不通过', '拒绝', '逾期', '未提交', '未通过', '不及格', '禁用', '异常', '缺失'], cls: 'red' },
  { keys: ['已归档', '已结束', '已锁定'], cls: 'blue' },
]

export function tagClass(value?: string | null): string {
  if (!value) return 'gray'
  for (const m of MAP) if (m.keys.some((k) => value.includes(k))) return m.cls
  return 'gray'
}

export default function Tag({ children, tone }: { children: ReactNode; tone?: string }) {
  const cls = tone ?? tagClass(typeof children === 'string' ? children : '')
  return <span className={`tag ${cls}`}>{children}</span>
}

/** 成绩等级标签：优秀=绿，良好=蓝，中等/及格=琥珀，不及格=红 */
export function LevelTag({ level }: { level: string | null }) {
  if (!level) return <span className="muted">—</span>
  const tone =
    level === '优秀' ? 'green' : level === '良好' ? 'blue' : level === '不及格' ? 'red' : 'amber'
  return <span className={`tag ${tone}`}>{level}</span>
}
