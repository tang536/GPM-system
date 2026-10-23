import type { IconName } from './components/Icon'
import type { Me } from './types'

export interface MenuItem {
  key: string
  label: string
  path: string
  group: string
  icon: IconName
  /** 与 sys_permission.perm_path 一致；能访问该路径即显示菜单 */
  perm?: string
  /** 额外的身份约束（如学生专属页） */
  roles?: string[]
  /** 任一权限即可见（用于一个页面承载多个权限点的场景） */
  anyOf?: string[]
  /** 命中任一身份则隐藏（用于某角色不需要的通用页，如毕业生不需要通用工作台） */
  hideRoles?: string[]
}

/**
 * 六大功能模块的菜单定义，与报告 3.3~3.6 节一一对应。
 * 可见性完全由后端签发的权限决定，前端不自行放宽。
 */
export const MENUS: MenuItem[] = [
  { key: 'dashboard', label: '工作台', path: '/dashboard', group: '概览', icon: 'dashboard', hideRoles: ['毕业生'] },
  { key: 'my-project', label: '工作台', path: '/my-project', group: '概览', icon: 'project', roles: ['毕业生'] },

  { key: 'basic', label: '基础数据', path: '/base/data', group: '一、基础与用户管理', icon: 'dept', anyOf: ['/base/dept', '/base/major', '/base/class'] },
  { key: 'user', label: '账号管理', path: '/auth/user', group: '一、基础与用户管理', icon: 'user', perm: '/auth/user' },
  { key: 'role', label: '角色权限', path: '/auth/role', group: '一、基础与用户管理', icon: 'role', anyOf: ['/auth/role', '/auth/permission'] },
  { key: 'log', label: '操作日志', path: '/auth/log', group: '一、基础与用户管理', icon: 'log', perm: '/auth/log' },

  // 题目申报 + 题目审核合并为"题目管理"：同一列表接口，教师管理自己的申报、系主任审核
  { key: 'topic-manage', label: '题目管理', path: '/topic/apply', group: '二、题目与选题管理', icon: 'topic', anyOf: ['/topic/apply', '/topic/audit'] },
  { key: 'topic-pool', label: '学生选题', path: '/topic/pool', group: '二、题目与选题管理', icon: 'pool', perm: '/topic/select' },
  { key: 'topic-match', label: '互选与调剂', path: '/topic/match', group: '二、题目与选题管理', icon: 'match', perm: '/topic/match' },
  { key: 'projects', label: '课题清单', path: '/projects', group: '二、题目与选题管理', icon: 'project', hideRoles: ['毕业生'] },

  { key: 'stage', label: '阶段与节点', path: '/process/stage', group: '三、过程管理', icon: 'stage', perm: '/process/stage' },
  { key: 'task', label: '任务书', path: '/process/task', group: '三、过程管理', icon: 'task', perm: '/process/task' },
  { key: 'submit', label: '过程材料', path: '/process/submission', group: '三、过程管理', icon: 'submit', anyOf: ['/process/submit', '/process/review'] },
  { key: 'extend', label: '延期申请', path: '/process/extension', group: '三、过程管理', icon: 'extend', perm: '/process/extend' },
  { key: 'progress', label: '进度跟踪', path: '/process/progress', group: '三、过程管理', icon: 'progress', perm: '/process/progress' },

  { key: 'score', label: '成绩评定', path: '/score/manage', group: '四、成绩与答辩', icon: 'score', perm: '/score/manage' },
  { key: 'score-audit', label: '成绩审核发布', path: '/score/audit', group: '四、成绩与答辩', icon: 'publish', perm: '/score/audit' },
  { key: 'defense', label: '答辩管理', path: '/score/defense', group: '四、成绩与答辩', icon: 'defense', perm: '/score/defense' },

  { key: 'notice', label: '公告信息', path: '/service/notice', group: '五、信息服务与维护', icon: 'notice', perm: '/service/notice' },
  { key: 'message', label: '站内消息', path: '/service/message', group: '五、信息服务与维护', icon: 'message', perm: '/service/message' },
  { key: 'stats', label: '统计中心', path: '/service/stat', group: '五、信息服务与维护', icon: 'stat', anyOf: ['/score/manage', '/service/stat'] },
  { key: 'maintain', label: '系统维护', path: '/service/maintain', group: '五、信息服务与维护', icon: 'backup', anyOf: ['/service/param', '/service/backup'] },
]

/** 按权限过滤可见菜单；返回按 group 分组后的结构，供侧边栏渲染 */
export function visibleMenus(me: Me | null): { group: string; items: MenuItem[] }[] {
  if (!me) return []
  // 与后端保持一致：只认后端签发的权限，管理员不额外放行
  const has = (p?: string) => !!p && me.perms.includes(p)
  const roleOk = (roles?: string[]) => !roles || roles.some((r) => me.roles.includes(r))

  const list = MENUS.filter((m) => {
    if (m.hideRoles && m.hideRoles.some((r) => me.roles.includes(r))) return false
    if (!roleOk(m.roles)) return false
    if (m.anyOf) return m.anyOf.some(has)
    if (m.perm) return has(m.perm)
    return true
  })

  const groups: { group: string; items: MenuItem[] }[] = []
  for (const m of list) {
    const g = groups.find((x) => x.group === m.group)
    if (g) g.items.push(m)
    else groups.push({ group: m.group, items: [m] })
  }
  return groups
}

/** 菜单路径 → 标题，供顶栏面包屑使用 */
export function titleOf(path: string): string {
  return MENUS.find((m) => m.path === path)?.label ?? '工作台'
}
