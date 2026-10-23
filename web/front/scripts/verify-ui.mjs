/**
 * 端到端页面验证：真实浏览器逐角色登录、遍历主要页面、收集控制台错误并截图。
 * 运行： node scripts/verify-ui.mjs
 */
import { chromium } from 'playwright'
import fs from 'node:fs'

const BASE = process.env.BASE ?? 'http://127.0.0.1:5132'
const OUT = 'shots'
fs.mkdirSync(OUT, { recursive: true })

const errors = []

async function shoot(page, name) {
  await page.waitForTimeout(420)
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false })
  console.log(`  截图 ${OUT}/${name}.png`)
}

async function login(page, account, password = '123456') {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  await page.locator('input').first().fill(account)
  await page.locator('input[type=password]').fill(password)
  await page.getByRole('button', { name: /登录系统/ }).click()
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 15000 })
  await page.waitForLoadState('networkidle')
}

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await ctx.newPage()

page.on('console', (m) => {
  if (m.type() === 'error') errors.push(`[console] ${m.text()}`)
})
page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`))
page.on('response', (r) => {
  if (r.status() >= 500) errors.push(`[http ${r.status()}] ${r.url()}`)
})

console.log('1) 登录页')
await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
await shoot(page, '01-login')

console.log('2) 系统管理员：遍历模块')
await login(page, 'admin')
await shoot(page, '02-dashboard-admin')

// 管理员只承担系统维护类功能（报告 7.6 节"管理员账号只用于维护，不用于日常业务"）：
// 前一组是维护类页面，应正常渲染；后一组是业务类页面，应显示 403 无权页。
const adminPages = [
  ['/base/dept', '03-dept', true],
  ['/auth/role', '04-roles', true],
  ['/score/audit', '08-score-audit', true],
  ['/service/stat', '10-analytics', true],
  ['/service/maintain', '11-maintain', true],
  ['/topic/apply', '05-topic-apply', false],
  ['/topic/match', '06-topic-match', false],
  ['/process/progress', '07-progress', false],
  ['/score/defense', '09-defense', false],
]
for (const [path, name, allowed] of adminPages) {
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' })
  const body = await page.locator('body').innerText()
  if (allowed && body.includes('无权访问')) errors.push(`[403] ${path} 管理员应可访问却渲染了无权页`)
  if (!allowed && !body.includes('无权访问')) errors.push(`[越权] ${path} 管理员不应可访问却渲染了正常页`)
  await shoot(page, name)
}

console.log('3) 深色主题')
await page.getByTitle('切换深浅主题').first().click()
await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' })
await shoot(page, '12-dark-dashboard')
await page.getByTitle('切换深浅主题').first().click()

console.log('4) 系主任：审核与发布')
await page.getByTitle('账号菜单').click()
await page.locator('.pop-item.danger').click()
await page.waitForURL(/\/login/, { timeout: 10000 })
await login(page, 'liangzy')
await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' })
await shoot(page, '13-dashboard-dean')
await page.goto(`${BASE}/topic/apply`, { waitUntil: 'networkidle' })
await shoot(page, '14-topic-manage')
await page.goto(`${BASE}/score/audit`, { waitUntil: 'networkidle' })
await shoot(page, '15-score-audit-dean')

console.log('5) 指导教师：任务书与过程材料')
await page.getByTitle('账号菜单').click()
await page.locator('.pop-item.danger').click()
await page.waitForURL(/\/login/, { timeout: 10000 })
await login(page, 'huangmin')
await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' })
await shoot(page, '16-dashboard-teacher')
await page.goto(`${BASE}/process/submission`, { waitUntil: 'networkidle' })
await shoot(page, '17-submissions')

console.log('6) 毕业生：我的毕业设计与选题')
await page.getByTitle('账号菜单').click()
await page.locator('.pop-item.danger').click()
await page.waitForURL(/\/login/, { timeout: 10000 })
await login(page, '202101010001')
await page.goto(`${BASE}/my-project`, { waitUntil: 'networkidle' })
await shoot(page, '18-my-project')
await page.goto(`${BASE}/topic/pool`, { waitUntil: 'networkidle' })
await shoot(page, '19-topic-pool')
await page.goto(`${BASE}/process/submission`, { waitUntil: 'networkidle' })
await shoot(page, '20-submissions-student')

console.log('7) 越权访问应显示 403')
await page.goto(`${BASE}/auth/user`, { waitUntil: 'networkidle' })
const forbidden = await page.locator('body').innerText()
if (!forbidden.includes('403')) errors.push('[403] 学生访问 /auth/user 未显示 403 页')
await shoot(page, '21-forbidden')

await browser.close()

console.log('\n===== 结果 =====')
if (errors.length === 0) {
  console.log('页面验证通过：无 JS 异常、无 5xx、无越权泄漏')
} else {
  console.log(`发现 ${errors.length} 个问题：`)
  for (const e of [...new Set(errors)]) console.log(' -', e)
  process.exitCode = 1
}
