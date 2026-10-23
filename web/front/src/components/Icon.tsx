/** 线性图标集：统一 24×24 视框、currentColor 描边，避免引入图标库 */

export type IconName =
  | 'dashboard' | 'dept' | 'major' | 'class' | 'user' | 'role' | 'log'
  | 'topic' | 'audit' | 'pool' | 'match' | 'project' | 'stage' | 'task'
  | 'submit' | 'review' | 'extend' | 'progress' | 'score' | 'assign' | 'publish'
  | 'defense' | 'notice' | 'message' | 'stat' | 'param' | 'backup'
  | 'sun' | 'moon' | 'logout' | 'plus' | 'search' | 'close' | 'check' | 'key' | 'file'
  | 'panel' | 'chevron' | 'refresh' | 'dot'

const PATHS: Record<IconName, string> = {
  dashboard: 'M3 13h8V3H3v10Zm0 8h8v-5H3v5Zm10 0h8V11h-8v10Zm0-18v5h8V3h-8Z',
  dept: 'M3 21h18M5 21V7l7-4 7 4v14M9 21v-5h6v5M9 11h.01M15 11h.01',
  major: 'M12 3 2 8l10 5 10-5-10-5ZM4 11v6l8 4 8-4v-6',
  class: 'M3 5h18v11H3V5Zm5 15h8M12 16v4',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-8 9c0-3.3 3.6-5.5 8-5.5s8 2.2 8 5.5',
  role: 'M12 3l8 4v5c0 5-3.4 8.3-8 9-4.6-.7-8-4-8-9V7l8-4ZM9 12l2 2 4-4',
  log: 'M5 4h14v16H5V4Zm3 4h8M8 12h8M8 16h5',
  topic: 'M4 5h16v14H4V5Zm3 4h6M7 12h10M7 15h7',
  audit: 'M12 3l9 4-9 4-9-4 9-4Zm-9 9 9 4 9-4M3 17l9 4 9-4',
  pool: 'M4 7h16M4 12h16M4 17h10',
  match: 'M8 7h8l-2-2m2 2-2 2M16 17H8l2-2m-2 2 2 2',
  project: 'M3 7h6l2 2h10v10H3V7Z',
  stage: 'M4 6h4v4H4V6Zm6 8h4v4h-4v-4Zm6-8h4v4h-4V6ZM8 8h8M14 12v4',
  task: 'M8 4h8a2 2 0 0 1 2 2v14H6V6a2 2 0 0 1 2-2Zm1 5h6M9 13h6M9 17h4',
  submit: 'M12 16V4m0 0 4 4m-4-4L8 8M4 16v3h16v-3',
  review: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm5 12 5 5',
  extend: 'M12 8v5l3 2M12 3a9 9 0 1 0 9 9',
  progress: 'M4 19V5m0 14h16M8 15V9m4 6V6m4 9v-4',
  score: 'M5 5h14v14H5V5Zm3 9 2 2 5-5',
  assign: 'M9 5h6v3H9V5Zm-2 3h10v12H7V8Zm3 5h4m-4 4h6',
  publish: 'M12 20V9m0 0 4 4m-4-4-4 4M5 4h14',
  defense: 'M12 3 3 8v8l9 5 9-5V8l-9-5Zm0 5 4 2.2v4.6L12 17l-4-2.2V10.2L12 8Z',
  notice: 'M4 10v4h3l4 4V6l-4 4H4Zm12-2a5 5 0 0 1 0 8',
  message: 'M4 5h16v11H9l-5 4V5Z',
  stat: 'M4 20V10m5 10V4m5 16v-7m5 7V8',
  param: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8-3 2-1.5-2-3.5-2 .8-2-1.2-.4-2.1H9.4L9 7.6 7 8.8l-2-.8L3 11.5 5 13l-2 1.5 2 3.5 2-.8 2 1.2.4 2.1h5.2l.4-2.1 2-1.2 2 .8 2-3.5L20 12Z',
  backup: 'M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3Zm0 0v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3',
  sun: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10ZM12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19',
  moon: 'M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z',
  logout: 'M15 4h4v16h-4M11 8l-4 4 4 4M7 12h8',
  plus: 'M12 5v14M5 12h14',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm5 12 5 5',
  close: 'M6 6l12 12M18 6 6 18',
  check: 'M5 12l5 5L19 7',
  key: 'M15 3a6 6 0 1 0-1.6 10.8L9 18H6v3H3v-3l7.2-7.2A6 6 0 0 1 15 3Z',
  file: 'M6 3h8l4 4v14H6V3Zm8 0v4h4M9 12h6M9 16h6',
  panel: 'M3 5h18v14H3V5Zm9 0v14',
  chevron: 'M6 9l6 6 6-6',
  refresh: 'M20 5v5h-5M20 10a8 8 0 1 0-2.3 5.7L20 10Z',
  dot: 'M12 12h.01',
}

const FILLED: IconName[] = ['dashboard']

export default function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
  const filled = FILLED.includes(name)
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flex: 'none' }}
    >
      <path d={PATHS[name]} />
    </svg>
  )
}
