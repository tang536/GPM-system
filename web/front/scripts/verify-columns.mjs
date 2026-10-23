// 专项验证：表格列按身份过滤（学生端隐藏自我标识列，管理端保留全列）
import { chromium } from 'playwright'

const BASE = process.env.BASE ?? 'http://127.0.0.1:5132'
const problems = []

async function login(page, account) {
  // 先到同源页面再清登录态（about:blank 上访问 localStorage 会被拒）；
  // 带着有效 token 访问 /login 会被重定向回工作台
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  await page.evaluate(() => localStorage.removeItem('grad.token'))
  await page.reload({ waitUntil: 'networkidle' })
  await page.fill('input[placeholder*="学号"]', account)
  await page.fill('input[placeholder*="密码"]', '123456')
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/(dashboard|my-project)/, { timeout: 15000 })
}

async function headers(page) {
  return page.locator('.table-wrap thead th').allInnerTexts()
}

const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await context.newPage()
page.on('pageerror', (e) => problems.push(`JS 异常: ${e.message}`))

// ============ 学生视角 ============
await login(page, '202101010001')

// 课题清单：学生只剩 题目/指导教师/当前阶段/状态/开始日期
await page.goto(`${BASE}/projects`, { waitUntil: 'networkidle' })
let h = await headers(page)
console.log(`学生 /projects 表头: ${JSON.stringify(h)}`)
for (const hidden of ['课题编号', '学生', '学号', '班级', '届别']) {
  if (h.some((x) => x.trim() === hidden)) problems.push(`学生课题清单仍显示「${hidden}」列`)
}
for (const kept of ['题目', '指导教师', '当前阶段', '状态', '开始日期']) {
  if (!h.some((x) => x.trim() === kept)) problems.push(`学生课题清单缺少关键列「${kept}」`)
}

// 过程材料：学生视角无 课题编号/学生/学号
await page.goto(`${BASE}/process/submission`, { waitUntil: 'networkidle' })
h = await headers(page)
console.log(`学生 /process/submission 表头: ${JSON.stringify(h)}`)
for (const hidden of ['课题编号', '学生', '学号']) {
  if (h.some((x) => x.trim() === hidden)) problems.push(`学生过程材料仍显示「${hidden}」列`)
}
for (const kept of ['阶段', '文件', '状态', '评阅意见']) {
  if (!h.some((x) => x.trim() === kept)) problems.push(`学生过程材料缺少关键列「${kept}」`)
}

// 学生选题：题目库无"届别"列
await page.goto(`${BASE}/topic/pool`, { waitUntil: 'networkidle' })
const poolHeader = page.locator('.card').last().locator('.table-wrap thead th')
h = await poolHeader.allInnerTexts()
console.log(`学生 /topic/pool 题目库表头: ${JSON.stringify(h)}`)
if (h.some((x) => x.trim() === '届别')) problems.push('学生选题题目库仍显示「届别」列')
for (const kept of ['题目名称', '指导教师', '剩余名额']) {
  if (!h.some((x) => x.trim() === kept)) problems.push(`学生选题缺少关键列「${kept}」`)
}

// 任务书：学生视角无 课题编号/学生
await page.goto(`${BASE}/process/task`, { waitUntil: 'networkidle' })
h = await headers(page)
console.log(`学生 /process/task 表头: ${JSON.stringify(h)}`)
for (const hidden of ['课题编号', '学生']) {
  if (h.some((x) => x.trim() === hidden)) problems.push(`学生任务书仍显示「${hidden}」列`)
}
for (const kept of ['题目', '指导教师', '确认状态']) {
  if (!h.some((x) => x.trim() === kept)) problems.push(`学生任务书缺少关键列「${kept}」`)
}

// ============ 教师视角（回归：管理侧列必须保留） ============
await login(page, 'huangmin')

await page.goto(`${BASE}/projects`, { waitUntil: 'networkidle' })
h = await headers(page)
console.log(`教师 /projects 表头: ${JSON.stringify(h)}`)
for (const kept of ['课题编号', '学生', '学号', '班级', '届别', '题目', '指导教师', '当前阶段', '状态', '开始日期']) {
  if (!h.some((x) => x.trim() === kept)) problems.push(`教师课题清单缺少列「${kept}」（管理侧列被误删）`)
}

await page.goto(`${BASE}/process/submission`, { waitUntil: 'networkidle' })
// 教师端默认筛选"待评阅"，先切到全部状态再断言表头（避免空态无表头）
await page.selectOption('.page-head select >> nth=1', '').catch(() => {})
await page.waitForTimeout(600)
h = await headers(page)
console.log(`教师 /process/submission 表头: ${JSON.stringify(h)}`)
for (const kept of ['课题编号', '学生', '学号', '阶段']) {
  if (!h.some((x) => x.trim() === kept)) problems.push(`教师过程材料缺少列「${kept}」（管理侧列被误删）`)
}

// ============ 题目管理双视角（合并页） ============
// 教师：默认"我的申报"，打开即见本人题目与编辑按钮
await page.goto(`${BASE}/topic/apply`, { waitUntil: 'networkidle' })
h = await headers(page)
console.log(`教师 /topic/apply 表头: ${JSON.stringify(h)}`)
for (const kept of ['题目名称', '申报教师', '状态', '操作']) {
  if (!h.some((x) => x.trim() === kept)) problems.push(`教师题目管理缺少列「${kept}」`)
}
if (await page.getByRole('button', { name: '编辑' }).count() === 0) {
  problems.push('教师题目管理（我的申报）未渲染「编辑」按钮')
}
if (await page.getByRole('button', { name: '申报题目' }).count() === 0) {
  problems.push('教师题目管理缺少「申报题目」按钮')
}

// 系主任：默认"待审核"+"全部题目"，渲染审核按钮而非编辑按钮
await login(page, 'liangzy')
await page.goto(`${BASE}/topic/apply`, { waitUntil: 'networkidle' })
h = await headers(page)
console.log(`系主任 /topic/apply 表头: ${JSON.stringify(h)}`)
for (const kept of ['题目名称', '申报教师', '状态', '操作']) {
  if (!h.some((x) => x.trim() === kept)) problems.push(`系主任题目管理缺少列「${kept}」`)
}
const auditBtn = page.getByRole('button', { name: '审核' })
if (await auditBtn.count() === 0) {
  problems.push('系主任题目管理未渲染「审核」按钮（有待审核题目时应出现）')
} else {
  await auditBtn.first().click()
  await page.waitForTimeout(400)
  const modal = page.locator('.modal, [role="dialog"]').last()
  const modalText = await modal.innerText().catch(() => '')
  console.log(`审核弹框: ${JSON.stringify(modalText.slice(0, 60))}…`)
  if (!modalText.includes('题目审核')) problems.push('审核弹框内容异常')
  if (!(await modal.getByRole('button', { name: '通过并发布' }).count())) {
    problems.push('审核弹框缺少「通过并发布」按钮')
  }
  await page.keyboard.press('Escape')
}
if (await page.getByRole('button', { name: '申报题目' }).count() > 0) {
  problems.push('系主任视角不应显示「申报题目」按钮')
}

console.log(problems.length ? `\n[FAIL]\n` + problems.join('\n') : '\n[PASS] 表格列身份过滤全部通过')
await browser.close()
process.exit(problems.length ? 1 : 0)
