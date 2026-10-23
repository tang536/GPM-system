// 综合验证：①标题去重 ②Toast 倒计时反馈 ③登录成功/失败提示
import { chromium } from 'playwright'

const BASE = process.env.BASE ?? 'http://127.0.0.1:5132'
const problems = []

async function login(page, account) {
  // 先清登录态：带着有效 token 访问 /login 会被重定向回工作台
  await page.evaluate(() => localStorage.removeItem('grad.token'))
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  await page.fill('input[placeholder*="学号"]', account)
  await page.fill('input[placeholder*="密码"]', '123456')
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/(dashboard|my-project)/, { timeout: 15000 })
}

const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await context.newPage()
page.on('pageerror', (e) => problems.push(`JS 异常: ${e.message}`))

// ============ 1) 登录成功 Toast（带倒计时） ============
await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
await page.fill('input[placeholder*="学号"]', 'huangmin')
await page.fill('input[placeholder*="密码"]', '123456')
await page.click('button[type="submit"]')
await page.waitForURL(/\/(dashboard|my-project)/, { timeout: 15000 })

const toast = page.locator('.toast').first()
if (await toast.count() === 0) {
  problems.push('登录成功未弹出 Toast')
} else {
  const text = await toast.innerText()
  console.log(`登录 Toast: ${JSON.stringify(text)}`)
  if (!text.includes('登录成功')) problems.push(`登录 Toast 文案异常: ${text}`)
  const sec1 = await toast.locator('.toast-sec').innerText()
  const hasBar = await toast.locator('.toast-progress').count()
  console.log(`倒计时显示: ${sec1}, 进度条: ${hasBar > 0}`)
  if (!/\d+s/.test(sec1)) problems.push(`Toast 缺少倒计时秒数: ${sec1}`)
  if (hasBar === 0) problems.push('Toast 缺少倒计时进度条')
  await page.waitForTimeout(1300)
  const sec2 = await toast.locator('.toast-sec').innerText().catch(() => 'gone')
  console.log(`1.3s 后倒计时: ${sec2}`)
  const n1 = parseInt(sec1), n2 = parseInt(sec2)
  if (!Number.isNaN(n1) && !Number.isNaN(n2) && n2 >= n1) {
    problems.push(`倒计时未递减: ${sec1} -> ${sec2}`)
  }
}

// ============ 2) 登录失败 Toast ============
// 先清登录态：已登录时访问 /login 会被重定向回工作台
await page.evaluate(() => localStorage.removeItem('grad.token'))
await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
await page.fill('input[placeholder*="学号"]', 'huangmin')
await page.fill('input[placeholder*="密码"]', 'wrong-pwd')
await page.click('button[type="submit"]')
await page.waitForTimeout(1200)
const errToast = page.locator('.toast.err').first()
if (await errToast.count() === 0) {
  problems.push('登录失败未弹出错误 Toast')
} else {
  const text = await errToast.innerText()
  console.log(`失败 Toast: ${JSON.stringify(text)}`)
  if (text.includes('登录成功')) problems.push('失败场景弹出了成功 Toast')
}
// 应停留在登录页
if (!page.url().includes('/login')) problems.push(`登录失败后跳转到了 ${page.url()}`)

// ============ 3) 标题去重 ============
await login(page, 'huangmin')
// 教师端：题目管理（菜单 label 与 PageHead title 相同）
await page.goto(`${BASE}/topic/apply`, { waitUntil: 'networkidle' })
let h1 = await page.locator('.topbar h1').innerText()
let h2count = await page.locator('.page-head h2').count()
console.log(`/topic/apply 顶栏="${h1}" 页内h2数=${h2count}`)
if (h1.trim() !== '题目管理') problems.push(`顶栏标题异常: ${h1}`)
if (h2count !== 0) problems.push('标题重复时仍渲染了页内 h2')

// 教师端：成绩审核发布
await page.goto(`${BASE}/score/audit`, { waitUntil: 'networkidle' })
h1 = await page.locator('.topbar h1').innerText()
h2count = await page.locator('.page-head h2').count()
console.log(`/score/audit 顶栏="${h1}" 页内h2数=${h2count}`)
if (h1.trim() !== '成绩审核发布') problems.push(`顶栏标题异常: ${h1}`)
if (h2count !== 0) problems.push('标题重复时仍渲染了页内 h2')

// 学生端：我的毕业设计
await login(page, '202101010001')
await page.goto(`${BASE}/my-project`, { waitUntil: 'networkidle' })
h1 = await page.locator('.topbar h1').innerText()
h2count = await page.locator('.page-head h2').count()
console.log(`/my-project 顶栏="${h1}" 页内h2数=${h2count}`)
if (h1.trim() !== '我的毕业设计') problems.push(`顶栏标题异常: ${h1}`)
if (h2count !== 0) problems.push('标题重复时仍渲染了页内 h2')

// desc 说明文字应保留
const descCount = await page.locator('.page-head p').count()
console.log(`页内说明文字段数: ${descCount}`)
if (descCount === 0) problems.push('去重后说明文字被误删')

// ============ 4) 工作台（title 带身份前缀）也应去重 ============
await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' })
h1 = await page.locator('.topbar h1').innerText()
h2count = await page.locator('.page-head h2').count()
console.log(`/dashboard 顶栏="${h1}" 页内h2数=${h2count}`)
if (h2count !== 0) problems.push('工作台标题（身份前缀）未去重')

console.log(problems.length ? `\n[FAIL]\n` + problems.join('\n') : '\n[PASS] 标题去重 / Toast 倒计时 / 登录反馈全部通过')
await browser.close()
process.exit(problems.length ? 1 : 0)
