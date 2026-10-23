// 专项验证：文件链接点击全链路（修复“页面不存在或已被移除”）
// 用法：BASE=http://127.0.0.1:5173 node scripts/verify-filelink.mjs
import { chromium } from 'playwright'

const BASE = process.env.BASE ?? 'http://127.0.0.1:5132'
const problems = []

async function login(page, account) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  await page.fill('input[placeholder*="学号"]', account)
  await page.fill('input[placeholder*="密码"]', '123456')
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/(dashboard|my-project)/, { timeout: 15000 })
}

const browser = await chromium.launch()
const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1440, height: 900 } })
const page = await context.newPage()
page.on('pageerror', (e) => problems.push(`JS 异常: ${e.message}`))

await login(page, '202101010001')

// 学生端“我的课题”页含开题/答辩申请表等文件链接
await page.goto(`${BASE}/my-project`, { waitUntil: 'networkidle' })
const links = page.locator('a.file-link')
const n = await links.count()
console.log(`文件链接数: ${n}`)
if (n === 0) {
  problems.push('页面未渲染任何 a.file-link')
} else {
  const first = links.first()
  const href = await first.getAttribute('href')
  const name = (await first.innerText()).trim()
  console.log(`首条链接: name=${JSON.stringify(name)} href=${href}`)
  if (!href || !href.startsWith('/api/files/download?path=')) {
    problems.push(`链接未走 /api/files/download 链路: ${href}`)
  } else if (/[^\x00-\x7F]/.test(href)) {
    problems.push(`链接 URL 含非 ASCII 字符（浏览器/Kestrel 编码风险）: ${href}`)
  }

  // 真实点击：headless Chromium 无内嵌 PDF 视图，inline PDF 会转为下载事件
  const [download, popup] = await Promise.all([
    page.waitForEvent('download', { timeout: 15000 }).catch(() => null),
    context.waitForEvent('page', { timeout: 15000 }).catch(() => null),
    first.click(),
  ])
  if (popup) {
    const popupUrl = popup.url()
    console.log(`新标签页 URL: ${popupUrl}`)
    if (popupUrl.includes('page-not-found') || /\/uploads\//.test(popupUrl)) {
      problems.push(`新标签页落到错误页面: ${popupUrl}`)
    }
  }
  if (!download) {
    problems.push('点击文件链接未触发下载（响应异常或被浏览器拦截）')
  } else {
    const suggested = download.suggestedFilename()
    console.log(`下载文件名: ${suggested}`)
    if (suggested !== name) {
      problems.push(`下载文件名与链接显示不一致: ${suggested} != ${name}`)
    }
    const path = await download.path()
    if (path) {
      const { statSync, readFileSync } = await import('node:fs')
      const size = statSync(path).size
      const head = readFileSync(path).subarray(0, 8).toString('latin1')
      console.log(`下载体积: ${size}B, 文件头: ${JSON.stringify(head)}`)
      if (size < 100 || !head.startsWith('%PDF')) {
        problems.push(`下载内容不是合法 PDF（可能是错误页 HTML）: ${head}`)
      }
    }
  }

  // 点击后当前页面应停留在原路由，不得渲染 SPA 兜底“页面不存在或已被移除”
  await page.waitForTimeout(800)
  const url = page.url()
  const bodyText = await page.locator('body').innerText()
  console.log(`当前页面: ${url}`)
  if (!url.includes('/my-project')) problems.push(`点击后页面被导航离开: ${url}`)
  if (bodyText.includes('页面不存在或已被移除')) {
    problems.push('页面渲染了 SPA 兜底文案“页面不存在或已被移除”')
  }
}

// ============ 直接导航文件 URL（复现用户“打开链接”路径） ============
const rawPath = await page.locator('a.file-link').first().getAttribute('href').catch(() => null)
if (rawPath) {
  const resp = await page.request.get(`${BASE}${rawPath}`)
  console.log(`接口直连: HTTP ${resp.status()} ${resp.headers()['content-type']}`)
  if (resp.status() !== 200) problems.push(`文件接口返回 ${resp.status()}`)
  const cd = resp.headers()['content-disposition'] ?? ''
  console.log(`Content-Disposition: ${cd}`)
  if (!cd) problems.push('响应缺少 Content-Disposition 头')
}

console.log(problems.length ? `\n[FAIL]\n` + problems.join('\n') : '\n[PASS] 文件链路全部通过')
await browser.close()
process.exit(problems.length ? 1 : 0)
