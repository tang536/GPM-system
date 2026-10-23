// 审计：pages/ 与 components/Login 中所有写操作是否带 ui.ok/ui.err 反馈
// 启发式：写调用行向下 25 行内应出现 ui.ok/ui.err/ui.toast，或 catch 块给出提示
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', 'src')

// 写操作方法名（与 api 层定义逐一核对）
const WRITE = new Set([
  'add', 'addClass', 'addDept', 'addGroup', 'addMajor', 'addNotice', 'addRole', 'addUser',
  'update', 'updateClass', 'updateDept', 'updateGroup', 'updateMajor', 'updateNotice', 'updateRole', 'updateUser',
  'del', 'delClass', 'delDept', 'delGroup', 'delMajor', 'delNotice', 'delRole', 'delUser',
  'save', 'create', 'remove', 'submit', 'upload', 'changePassword',
  'applyExtension', 'approve', 'audit', 'publish', 'review', 'confirm', 'confirmTask',
  'readAll', 'readOne', 'assign', 'arrange', 'arranges',
  'saveNode', 'saveTaskBook', 'saveDefenseScore',
  'setParam', 'setWeights', 'createBackup', 'select',
])

function walk(dir) {
  const out = []
  for (const e of readdirSync(dir)) {
    const p = join(dir, e)
    if (statSync(p).isDirectory()) out.push(...walk(p))
    else if (p.endsWith('.tsx')) out.push(p)
  }
  return out
}

const files = [...walk(join(SRC, 'pages')), join(SRC, 'components/Login.tsx')]
const missing = []

for (const f of files) {
  const lines = readFileSync(f, 'utf8').split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/(\w+)Api\.(\w+)\(/)
    if (!m) continue
    const [, , method] = m
    if (!WRITE.has(method)) continue
    // 向下找反馈：ui.ok/ui.err/ui.toast/toast( 或 catch 中的提示
    let found = false
    for (let j = i; j < Math.min(i + 25, lines.length); j++) {
      if (/ui\.(ok|err|toast)\(|\btoast\(/.test(lines[j])) { found = true; break }
    }
    if (!found) {
      const rel = f.slice(SRC.length).replace(/\\/g, '/')
      missing.push(`${rel}:${i + 1}  ${method}()  →  ${lines[i].trim().slice(0, 90)}`)
    }
  }
}

console.log(missing.length ? `[MISSING ${missing.length}]\n` + missing.join('\n') : '[ALL COVERED] 所有写操作均有反馈')
