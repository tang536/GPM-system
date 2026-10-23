// 专项验证：图表悬停反馈、教师端题目申报编辑、操作列换行、表格居中
import { chromium } from 'playwright'

const BASE = process.env.BASE ?? 'http://127.0.0.1:5132'
const SHOTS = 'shots'
const problems = []

async function login(page, account) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  await page.fill('input[placeholder*="学号"]', account)
  await page.fill('input[placeholder*="密码"]', '123456')
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/(dashboard|my-project)/, { timeout: 15000 })
}

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
page.on('pageerror', (e) => problems.push(`JS 异常: ${e.message}`))

// ============ 1) 教师端题目管理：编辑功能（合并后教师视角） ============
await login(page, 'huangmin')
await page.goto(`${BASE}/topic/apply`, { waitUntil: 'networkidle' })
const rows = await page.locator('table tbody tr').count()
console.log(`题目管理列表行数: ${rows}`)
if (rows === 0) problems.push('题目管理列表无数据')

// 合并后教师默认"我的申报"范围，列表即本人题目，编辑按钮立即可见
const editBtns = page.getByRole('button', { name: '编辑' })
const editCount = await editBtns.count()
if (editCount === 0) {
  problems.push('题目管理未渲染「编辑」按钮（教师应能编辑本人申报的题目）')
} else {
  // 已发布且已有学生的题目按业务规则禁用编辑；找到第一个可用的验证回填
  let opened = false
  for (let i = 0; i < editCount; i++) {
    const b = editBtns.nth(i)
    if (await b.isEnabled()) {
      await b.click()
      opened = true
      break
    }
  }
  if (!opened) {
    console.log('本人题目均已锁定（已发布且已有学生），编辑按钮禁用符合业务规则')
  } else {
    await page.waitForTimeout(500)
    // 只在弹框内找输入框
    const modal = page.locator('.modal-card, .modal, [role="dialog"]').last()
    const nameInput = modal.locator('input').first()
    const val = await nameInput.inputValue().catch(() => '')
    console.log(`编辑弹框「题目名称」回填: ${JSON.stringify(val)}`)
    if (!val) problems.push('编辑弹框未回填原数据（编辑功能不可用）')
    else {
      const majorSel = await modal.locator('select, [class*="major"]').count()
      console.log(`弹框内可选择控件数: ${majorSel}`)
      await page.screenshot({ path: `${SHOTS}/30-topic-edit.png` })
    }
    // Esc 关闭弹框
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
    if (await page.locator('.mask').count()) problems.push('Esc 未能关闭弹框')
    else console.log('Esc 关闭弹框: 正常')
  }
}

// 操作列是否换行：比较 .row-actions 高度与单个按钮高度
const acts = page.locator('table tbody tr .row-actions').first()
if (await acts.count()) {
  const actH = (await acts.first().boundingBox())?.height ?? 0
  const btnH = (await acts.first().locator('button').first().boundingBox())?.height ?? 0
  console.log(`操作区高 ${Math.round(actH)} / 单按钮高 ${Math.round(btnH)}`)
  if (btnH > 0 && actH > btnH * 1.6) problems.push(`操作列按钮换行：操作区高 ${Math.round(actH)} 远超单行`)
} else {
  problems.push('操作列未使用 .row-actions 容器')
}

// 表格数据居中
const tdAlign = await page.locator('table tbody tr').first().locator('td').nth(2)
  .evaluate((el) => getComputedStyle(el).textAlign)
console.log(`数据列对齐: ${tdAlign}`)
if (tdAlign !== 'center') problems.push(`数据列未居中（实际 ${tdAlign}）`)

// ============ 2) 图表悬停反馈（管理员工作台含图表） ============
await page.getByTitle('账号菜单').click()
await page.locator('.pop-item.danger').click()
await page.waitForURL(/\/login/, { timeout: 10000 })
await login(page, 'admin')
await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' })
await page.waitForTimeout(700)

// 分组柱：悬停某一组，应出现 .chart-tip
const colItems = page.locator('.col-item')
console.log(`分组柱组数: ${await colItems.count()}`)
if (await colItems.count()) {
  await colItems.nth(1).hover()
  await page.waitForTimeout(400)
  const tipCount = await page.locator('.chart-tip').count()
  const onCount = await page.locator('.col-item.on').count()
  const tipText = tipCount ? await page.locator('.chart-tip').first().innerText() : ''
  console.log(`悬停分组柱: tip=${tipCount} 高亮组=${onCount} 文案="${tipText}"`)
  if (tipCount === 0) problems.push('分组柱悬停无 tooltip')
  if (onCount === 0) problems.push('分组柱悬停无高亮')
  await page.screenshot({ path: `${SHOTS}/31-chart-hover-col.png` })
}

// 环形图：到成绩统计页（多扇区：成绩等级分布）验证悬停
await page.goto(`${BASE}/score/stat`, { waitUntil: 'networkidle' })
await page.waitForTimeout(700)
const slices = page.locator('.donut-slice')
const sliceCount = await slices.count()
console.log(`成绩统计页环形图扇区数: ${sliceCount}`)
if (sliceCount >= 2) {
  // 环形图各扇区是同心圆叠加，按元素定位会被相邻扇区拦截；
  // 改用屏幕坐标：把鼠标移到环带正顶部（第一扇区起点）
  const svgBox = await page.locator('.donut svg').first().boundingBox()
  await page.mouse.move(svgBox.x + svgBox.width / 2, svgBox.y + 10)
  await page.waitForTimeout(400)
  const center = await page.locator('.donut svg text').first().evaluate((el) => el.textContent ?? '')
  const legendOn = await page.locator('.donut-legend-item.on').count()
  console.log(`悬停后中心数值: ${center} | 图例高亮项: ${legendOn}`)
  if (legendOn === 0) problems.push('环形图悬停无图例高亮')
  if (!center || center === '0') problems.push('环形图悬停后中心未显示该段数值')
  await page.screenshot({ path: `${SHOTS}/32-chart-hover-donut.png` })

  // 图例悬停（普通 DOM 元素，定位可靠）
  const legendItem = page.locator('.donut-legend-item').nth(1)
  await legendItem.hover()
  await page.waitForTimeout(350)
  const legendOn2 = await page.locator('.donut-legend-item.on').count()
  console.log(`悬停图例后高亮项: ${legendOn2}`)
  if (legendOn2 === 0) problems.push('图例悬停无高亮')
} else {
  problems.push(`成绩统计页环形图扇区不足（${sliceCount}），无法验证悬停`)
}

// 条形榜：悬停行应高亮
const barRows = page.locator('.bar-row')
console.log(`条形榜行数: ${await barRows.count()}`)
if (await barRows.count()) {
  await barRows.first().hover()
  await page.waitForTimeout(300)
  const bg = await barRows.first().evaluate((el) => getComputedStyle(el).backgroundColor)
  console.log(`悬停条形行背景: ${bg}`)
  if (bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent') problems.push('条形榜悬停无背景反馈')
}

await browser.close()
console.log('\n===== 专项验证结果 =====')
if (problems.length === 0) console.log('全部通过')
else { for (const p of problems) console.log(' -', p); process.exitCode = 1 }
