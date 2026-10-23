# 毕业设计管理系统

计算机类专业毕业设计（论文）全流程管理系统。技术栈：**ASP.NET Core 10 + EF Core 9（Pomelo MySQL）+ MySQL 8** 后端，
**React 19 + TypeScript + Vite** 前端，**JetBrains Rider** 开发。

业务覆盖报告第 3 章的六大功能模块：基础与用户管理、题目与选题管理、过程管理、成绩与答辩管理、
信息服务与系统维护，以及面向毕业生的个人工作台。

---

## 一、目录结构

```
web/
├─ back/                          # 后端（ASP.NET Core 10 Web API）
│  ├─ Authorization/              # 菜单/按钮级权限、角色约束过滤器
│  │  └─ PermAttribute.cs         #   PermAttribute、RoleOnlyAttribute
│  ├─ Controllers/                # 接口层（按业务模块划分，共 7 个）
│  │  ├─ AuthController.cs        #   登录、当前用户、修改密码
│  │  ├─ BaseDataController.cs    #   院系 / 专业 / 班级 / 年级
│  │  ├─ UserController.cs        #   账号、角色、权限、操作日志
│  │  ├─ TopicController.cs       #   题目申报审核、志愿、互选、课题
│  │  ├─ ProcessController.cs     #   阶段节点、任务书、材料、评阅、延期、进度
│  │  ├─ ScoreController.cs       #   成绩分项、审核发布、答辩分组与评分
│  │  └─ ServiceController.cs     #   公告、消息、统计、参数、备份、上传
│  ├─ DTOs/                       # 请求/响应模型（按模块独立成层）
│  ├─ Data/
│  │  └─ GradDb.cs                #   DbContext：28 张表 + 14 个视图映射
│  ├─ Filters/
│  │  └─ DbErrorFilter.cs         #   全局异常过滤（数据库业务错误 → 400 中文提示）
│  ├─ Models/                     # 实体按业务域分目录，一个实体一个文件（共 42 个）
│  │  ├─ Organization/            #   Department, Major, ClassInfo, Student, Teacher, VstudentInfo
│  │  ├─ Security/                #   SysUser, SysRole, SysPermission, SysUserRole,
│  │  │                           #   SysRolePermission, OperationLog, VuserAccount
│  │  ├─ Topic/                   #   Topic, TopicMajor, TopicSelection, Project,
│  │  │                           #   VtopicPool, VtopicSelectionStat
│  │  ├─ Process/                 #   Stage, StageNode, TaskBook, Submission, Review,
│  │  │                           #   ExtensionRequest, VstageProgress, VoverdueList,
│  │  │                           #   VmaterialReview, VblindReview, VtaskBook
│  │  ├─ Score/                   #   Score, DefenseGroup, DefenseArrange, DefenseScore,
│  │  │                           #   VscoreReport, VscoreStat, VdefenseSchedule
│  │  └─ Service/                 #   Notice, Message, SysParam, Vnotice, VteacherWorkload
│  │                              #   每个字符串字段带 [MaxLength(n)]，TEXT 与 DECIMAL 用
│  │                              #   [Column(TypeName = "text" / "decimal(p,s)")] 显式声明存储类型
│  ├─ Services/
│  │  ├─ PasswordUtil.cs          #   SHA-256 摘要
│  │  ├─ UserClaims.cs            #   JWT 声明键、登录档案、ClaimsPrincipal 扩展
│  │  ├─ JwtTokenService.cs       #   令牌签发
│  │  ├─ ProfileLoader.cs         #   登录档案装配（角色 + 权限 + 学号/工号）
│  │  ├─ ScopeService.cs          #   数据范围与成绩录入权（按"关系"收敛）
│  │  └─ LogService.cs            #   操作日志
│  ├─ Program.cs                  # 启动装配、CORS、静态托管、SPA 回退
│  ├─ UploadPaths.cs              # 上传根目录解析（固定到项目下）+ 路径穿越防护
│  ├─ appsettings.json            # 连接串、JWT、上传目录
│  ├─ uploads/                    # 上传材料存放目录（/uploads 静态映射到此）
│  ├─ wwwroot/                    # 前端构建产物（vite build 输出）
│  └─ back.csproj
│
├─ front/                         # 前端（React 19 + TS + Vite）
│  ├─ src/
│  │  ├─ api/                     # 请求层：client + 按模块拆分的接口文件
│  │  │  ├─ client.ts             #   fetch 封装、JWT 注入、错误规整、401 登出
│  │  │  ├─ auth.ts base.ts user.ts topic.ts process.ts score.ts service.ts
│  │  │  └─ index.ts
│  │  ├─ components/              # 通用组件
│  │  │  ├─ Layout.tsx            #   侧边栏（可收起）+ 顶栏 + 通知中心卡片 + 账号菜单 + 改密
│  │  │  ├─ Login.tsx             #   登录页（含演示账号快速填入）
│  │  │  ├─ DataTable.tsx         #   列定义驱动的表格（排序/分页/三态）
│  │  │  ├─ Modal.tsx State.tsx   #   弹窗与加载/空/错误态
│  │  │  ├─ Chart.tsx             #   SVG 条形图、环形图、分组柱状图
│  │  │  ├─ StatCard.tsx Tag.tsx Icon.tsx UIProvider.tsx Forbidden.tsx
│  │  ├─ hooks/
│  │  │  ├─ useAuth.tsx           #   登录态 Context、权限判定、默认首页
│  │  │  ├─ useTheme.ts           #   深浅主题（红色主色，持久化 localStorage）
│  │  │  └─ useQuery.ts           #   列表加载三态 + 防抖
│  │  ├─ pages/                   # 页面（按六大模块分目录）
│  │  │  ├─ Dashboard.tsx MyProject.tsx
│  │  │  ├─ base/    Departments, Majors, Classes
│  │  │  ├─ user/    Users, Roles, Logs
│  │  │  ├─ topic/   MyTopics, TopicAudit, TopicPool, TopicMatch, Projects
│  │  │  ├─ process/ Stages, TaskBooks, Submissions, Extensions, Progress
│  │  │  ├─ score/   Scores, Audit, Defense, Stat
│  │  │  └─ service/ Notices, Messages, Analytics, Maintain
│  │  ├─ types/index.ts           # 与接口一一对应的数据结构
│  │  ├─ utils/                   # 时间、数值格式化
│  │  ├─ styles/index.css         # 设计系统（红色主题变量 + 组件样式）
│  │  ├─ permissions.ts           # 菜单定义与权限过滤
│  │  ├─ App.tsx                  # 路由表与权限守卫
│  │  └─ main.tsx
│  ├─ vite.config.ts              # /api 代理到 5132，构建输出到 ../back/wwwroot
│  ├─ scripts/
│  │  ├─ verify-ui.mjs            # 逐角色遍历 21 个页面：截图 + 收集 console/5xx/越权
│  │  └─ verify-interactions.mjs  # 图表悬停、编辑回填、Esc 关弹窗、操作列换行、表格居中
│  └─ package.json
│
└─ database/
   ├─ schema.sql                  # 建库脚本：28 表 + 11 索引 + 2 函数 + 14 视图 + 5 触发器 + 3 存储过程
   ├─ seed.sql                    # 种子数据（4 院系 / 6 专业 / 5 班级 / 43 账号 / 36 题目 / 30 课题 …）
   ├─ smoke_api.py                # 接口冒烟测试：逐角色访问 36 个只读接口
   ├─ probe_shapes.py             # 响应结构探查（供前端类型对齐）
   └─ split_models.py             # 实体拆分脚本：按业务域建目录，并按 information_schema 补长度/精度
```

## 二、环境与启动

| 组件 | 版本 |
| --- | --- |
| .NET SDK | 10.0.x |
| MySQL | 8.0+（本机 9.6 已验证） |
| Node.js | 20+（本机 22 已验证） |

### 1. 建库与导入数据

```bash
mysql -uroot -p < web/database/schema.sql
mysql -uroot -p graddb < web/database/seed.sql
```

`schema.sql` 会先 `DROP DATABASE IF EXISTS graddb` 再重建，执行前请确认无其他用途的同名库。

### 2. 配置连接串

`web/back/appsettings.json`：

```json
"ConnectionStrings": { "Grad": "Server=127.0.0.1;Port=3306;Database=graddb;User=root;Password=你的密码;CharSet=utf8mb4" }
```

### 3. 启动后端

```bash
cd web/back
dotnet run
# 监听 http://localhost:5132
```

### 4. 启动前端（开发模式）

```bash
cd web/front
npm install
npm run dev
# 访问 http://localhost:5173，/api 自动代理到 5132
```

### 5. 一体化部署（单端口）

```bash
cd web/front && npm run build     # 产物输出到 web/back/wwwroot
cd ../back && dotnet run          # 直接访问 http://localhost:5132
```

后端已配置 `UseDefaultFiles + UseStaticFiles + MapFallback`，刷新任意前端路由都会回退到 `index.html`。

## 三、账号与角色

初始密码统一为 `123456`（数据库存 SHA-256 摘要）。

| 账号 | 身份 | 可见范围 |
| --- | --- | --- |
| `admin` | 系统管理员 | 全部模块（含账号、角色、日志、参数、备份） |
| `liangzy` | 系主任 + 指导教师 | 题目审核、互选调剂、成绩审核发布、答辩、统计 |
| `huangmin` | 指导教师 + 评阅教师 | 题目申报、任务书、阶段评阅、本人学生成绩 |
| `202101010001` | 毕业生 | 我的毕业设计、选题、材料提交、延期申请、成绩查询 |

另有 8 位教师、34 位学生账号，账号即工号/学号，密码同为 `123456`。

## 四、权限与数据范围

- **功能权限**：`sys_permission.perm_path` 作为权限标识，角色 → 权限多对多；
  前端据此过滤菜单与按钮，后端 `[Perm("/xxx")]` 二次校验，**系统管理员不默认放行**——
  报告 7.6 节要求"管理员账号只用于维护，不用于日常业务"，因此管理员的权限集合只含
  基础数据（院系/专业/班级）、账号角色权限日志、阶段节点、成绩审核发布、公告、消息、
  查询统计、系统参数、数据备份、成绩权重共 15 项；题目申报/审核、选题、互选、任务书、
  材料提交、评阅、延期、评阅分配、成绩录入、答辩均不授予。
- **数据范围**：按"关系"而非"角色"收敛——
  毕业生只看本人课题；指导教师看本人指导 + 被分派评阅 + 担任答辩组长的课题；系主任与管理员不受限。
- **成绩录入权**：过程分只允许指导教师、评阅分只允许被分派评阅教师、答辩分只允许答辩组长，
  越权写入返回 403（见 `ScopeService.ScoreRightsAsync`）。
- **角色约束**：`[RoleOnly(...)]` 用于同一权限点内进一步限定角色（如答辩管理仅系主任）。
  JWT 已关闭入站声明映射（`MapInboundClaims = false`），`roles` 保持自定义键，
  否则会被框架改写成标准角色声明导致角色判定失效。

## 五、数据库设计要点

- 28 张关系表全部满足 **BCNF**；派生属性（总评成绩、成绩等级）不落表，由视图 `v_score_report` 实时计算。
- 14 个视图统一 `v_` 前缀，覆盖成绩报表、阶段进度、逾期名单、题目池、教师工作量等统计场景。
- 5 个触发器：`trg_student_ai/ad/au` 维护班级人数，`trg_submission_bi` 校验阶段节点/格式/逾期，
  `trg_score_bu` 锁定已发布成绩。
- 3 个存储过程：`sp_confirm_selection`（互选确认并生成 14 位课题编号）、
  `sp_publish_score`（成绩发布 + 站内消息）、`sp_overdue_notice`（逾期提醒推送）。
- 2 个确定性函数：`fn_total_score`（加权总评）、`fn_score_level`（等级换算）。

## 六、性能相关约定

- 实体 42 个文件全部声明字段长度：`varchar/char` 用 `[MaxLength(n)]`（与库中长度一致），
  `TEXT` 与 `DECIMAL` 用 `[Column(TypeName = "text")]` / `[Column(TypeName = "decimal(5,2)")]`，
  避免按“不限长字符串 / 默认 decimal 精度”处理导致的隐式转换与截断。
- 列表接口一律先查主表标量列，再按当前页主键批量补集合（面向专业、用户角色、角色权限），
  不在投影里写 `ToList()` 子查询——既消除 EF 的多集合告警，也把 N+1 降为 2 次查询。
- 视图模型统一 `[Keyless] + ToView`，只读不跟踪。

## 七、验证记录

```
dotnet build        → 0 个警告，0 个错误
npx tsc -b          → 通过
npm run build       → 产物 index.js 约 393 KB（gzip 111 KB）
python smoke_api.py → 36 个接口在 4 种身份下全部返回 200 或预期 403
node scripts/verify-ui.mjs        → 5 种身份 21 张页面截图，无 JS 异常、无 5xx、越权页面正确显示 403
node scripts/verify-interactions.mjs → 图表悬停 tooltip/高亮、编辑回填、Esc 关弹框、操作列不换行、表格居中
文件链路实测        → /uploads/xxx.pdf 匿名 200（application/pdf）；下载接口带中文文件名头；
                       路径穿越（../、/etc/passwd）全部 404；上传保留原始文件名、重名自动追加序号
后端运行日志        → 无 EF 模型校验告警、无多集合查询告警
```

### 角色边界专项（接口层）

| 身份 | 题目申报 | 下达任务书 | 提交材料 | 延期申请 | 阶段节点 | 成绩发布 |
| --- | --- | --- | --- | --- | --- | --- |
| 系统管理员 | 403 | 403 | 403 | 403 | 200 | 200 |
| 系主任 | 403 | 403 | 403 | 200 | 200 | 200 |
| 指导教师 | 200 | 200 | 403 | 200 | 403 | 403 |
| 毕业生 | 403 | 403 | 200 | 200 | 403 | 403 |

### 交互与体验修正记录

- **入口跟随权限**：任何跳转入口（侧栏菜单、工作台卡片按钮、顶栏铃铛）都按 `hasPerm` 渲染，
  没有权限的身份看不到入口，从根上避免"点进去是 403"。曾发现工作台"进度跟踪"按钮
  只看 `/service/stat` 就渲染，导致管理员（有统计权、无进度跟踪权）一点即 403，已修。
- **图表交互**：分组柱悬停显示 tooltip（如"应交 18 · 已交 12"）并高亮该组；
  环形图悬停加粗扇区、中心切换为该段数值、图例联动高亮；条形榜悬停行背景与数值变色。
- **编辑功能**：题目申报编辑崩溃的根因是 `majorCodes` 前后端类型不一致（字符串 vs 数组），已统一为数组。
- **操作列**：`.row-actions` 固定 `flex-wrap: nowrap`，编辑/删除不再换行。
- **表格对齐**：表头与数据默认 `text-align: center`，仅数字列右对齐。
- **手填编号**：材料提交、延期申请、任务书、手工调剂中的课题/学号/题目编号全部改为下拉选择。

### 弹窗与表单规范

- 标题只放动作名（"编辑题目"），编号与说明移到 `subtitle` 副标题，不再拼成"编辑题目 202600000024"。
- 表头带淡红渐变识别条 + 入场动画（位移 + 缩放），遮罩模糊加深。
- `Field` 支持 `required`（红色星号）与 `hint`（字段说明）；弹窗内 `.grid2` 两列栅格，窄屏自动单列。
- 控件统一：输入框聚焦有品牌色描边光晕；下拉框替换为内嵌 SVG 雪佛龙（去掉原生箭头）；
  复选框改为 16px 圆角方块、选中填充品牌色并绘对勾；多选项收入 `.check-row` 容器，
  长列表用可滚动的 `.check-list`（如角色权限勾选）。

### 材料文件链路（上传 / 下载 / 预览）

- 上传根目录固定为项目下 `back/uploads/`（`UploadPaths` 从 `AppContext.BaseDirectory`
  向上查找 `.csproj` 定位，不依赖 ContentRootPath——以 dll 方式运行时它指向 `bin/Debug/net10.0`，
  文件会被构建清理，且不在静态映射范围内）。
- `Program.cs` 用 `PhysicalFileProvider` 把 `/uploads` 映射为静态文件目录：
  库中 `file_path` 存的 `/uploads/课题号/文件名.pdf` 直接可打开（PDF 浏览器内预览，doc/zip 下载）。
- 另提供 `GET /api/files/download?path=...`（匿名，带 `Content-Disposition` 中文文件名头），
  并用 `UploadPaths.ResolvePhysical` 拦截 `../`、绝对路径等穿越写法（越界返回 404）。
- 上传保留原始文件名（剔除路径非法字符），重名自动追加 `(1)`、`(2)` 序号，不再覆盖。
- 前端三处文件列（学生端、材料提交/评阅、评阅弹窗）统一用 `FileLink` 组件渲染为可点击链接。
- 种子数据中 102 条 `/uploads/...` 路径由 `database/gen_placeholder_files.py` 生成占位 PDF
  （最小合法 PDF：Helvetica + 正确 xref 偏移表），保证演示环境开箱即可下载预览。

### 冗余页面合并

- **统计查询 → 成绩分布页签**：与"成绩统计"整页列完全相同（班级/专业/五档人数/平均分），
  已移除该页签，成绩分布统一看"成绩统计"页（信息量更大，含图表）。
- **材料提交 + 阶段评阅 → 过程材料**：两个页面调的是同一个 `/api/submissions` 接口、同一份数据，
  现已合并为 `/process/submission` 一页：学生视角有上传表单 + 阶段节点提醒；
  教师视角有待评阅统计卡 + 状态筛选 + 评阅/修改意见。菜单按 `anyOf: ['/process/submit', '/process/review']` 显示。

### 顶栏与全局交互

- **账号菜单**：修改密码与退出登录合并为头像单按钮下拉（点击空白处自动收起）。
- **通知中心**：铃铛弹出卡片合并展示公告与站内消息（按时间倒序取最新 10 条），
  支持刷新、单条点击已读并跳转、一键全部已读；公告与消息权限对所有角色开放，故所有身份均显示。
- **全局搜索**：命令面板形态，`Ctrl/⌘+K` 或顶栏放大镜唤起；只检索当前身份可见的菜单
  （结果不会指向 403 页），支持 ↑↓ 选择、Enter 跳转、Esc 关闭，命中片段高亮。
- **侧栏收起**：顶栏左上角面板按钮收起/展开侧栏（236px ⇄ 68px），状态持久化到 localStorage。
### 文件点击 404 修复（开发链路）

- **现象**：点击文件列报"页面不存在或已被移除"。
- **根因**：该文案来自 SPA 兜底路由。开发模式下请求经 Vite（5173），而 Vite 代理只转发了
  `/api`，未转发 `/uploads`；`/uploads/课题号/文件.pdf` 直链落到 Vite 的 SPA 回退，
  返回 index.html → React Router 匹配不到路由 → 渲染兜底页。后端直连（curl）一直是 200，
  旧后端实例/URL 编码问题均已排除。
- **修复（双保险）**：
  1. `FileLink` 不再使用 `/uploads` 直链，统一走 `GET /api/files/download?path=...`
     （`encodeURIComponent` 保证 URL 纯 ASCII，规避 Kestrel 对请求行非 ASCII 字节返回 400 的问题）；
  2. `vite.config.ts` 补 `/uploads` → 5132 代理，兜底任何遗留直链。
- 下载接口按扩展名区分：PDF / 图片 / 文本 `inline`（浏览器内预览），
  doc/xls/zip/rar 等 `attachment`（保存文件）；`?dl=true` 强制下载。
  `Content-Disposition` 同时给 ASCII `filename` 与 `filename*=UTF-8''`（RFC 6266）。
- 验证：`scripts/verify-filelink.mjs` 真实点击 `a.file-link`，断言下载文件名与链接一致、
  内容是合法 PDF、当前页面不离开原路由、不出现兜底文案；5132（生产托管）与 5173（开发代理）
  双环境通过。

### 页面标题去重

- 顶栏 `<h1>` 展示当前菜单标题（`titleOf(pathname)`），各页 `PageHead` 原先重复渲染同名 `<h2>`。
- 现由 `PageHead` 统一判断：页面标题与顶栏标题相同、或仅多一级身份前缀（如"学生工作台" vs
  "工作台"）时不再渲染 `<h2>`，说明文字（`desc`）与操作按钮区保留。
- 验证：`scripts/verify-v3.mjs` 逐页断言 `.page-head h2` 数量为 0 且 `.page-head p` 保留。

### 操作反馈与 Toast 倒计时

- 所有涉及数据库增删改的操作均有反馈：成功 `ui.ok` / 失败 `ui.err`（后端中文错误信息直达），
  由 `scripts/audit-feedback.mjs` 静态审计全部写调用点（add/update/del/save/submit/audit/
  publish/review/confirm/readAll/changePassword 等 50+ 方法）确认无遗漏。
- 登录同样纳入反馈：成功 `登录成功，欢迎回来，{姓名}`；失败展示后端原因（如"密码不正确"）。
- Toast 带倒计时：进度条收缩 + 剩余秒数徽标（`3s → 2s → 1s`），到期自动消失；
  同屏最多堆叠 5 条，`ok/err/info` 三型带状态图标。
- 单条通知"标记已读"为导航附属动作，静默处理（红点计数即时变化即为反馈），不弹 Toast 避免打扰。

### 表格列身份过滤

- `DataTable` 的列定义新增 `onlyFor` / `hideFor` 两个身份字段，组件内结合 `useAuth()` 的
  `me.userType` 过滤后再渲染表头与单元格，接口仍返回全列数据（不做多套 DTO），由前端按视角裁剪。
- 学生身份是主要精简对象：他已知自己是毕业生，无需再看课题编号、学生、学号等管理标识列。
  - `/projects`（课题清单）：课题编号 / 学生 / 学号 / 班级 / 届别五列 `hideFor: ['学生']`，
    学生只剩 题目 / 指导教师 / 当前阶段 / 状态 / 开始日期；
  - `/process/submission`（过程材料）：课题编号 / 学生 / 学号 `hideFor: ['学生']`；
  - `/process/task`（任务书）：课题编号 / 学生 `hideFor: ['学生']`；
  - `/topic/pool`（题目库）：届别 `hideFor: ['学生']`。
- 教师 / 系主任 / 管理员视角保留全列（管理场景需要这些标识）。
- 搜索框 placeholder 同步按身份切换（如课题清单：学生搜"题目 / 教师"，其余身份搜"学号 / 姓名 / 题目 / 教师"）。
- 验证：`scripts/verify-columns.mjs` 以三种身份登录，逐页断言表头集合（学生 5/8/4/7 列 vs 教师 10/11/4/11 列）。

### 题目两页合并（题目管理）

- 原"我的申报"（教师）与"题目审核"（系主任）两个页面数据同源、功能互补，合并为 `/topic/apply`
  一个"题目管理"页，按身份呈现不同默认视图与操作：
  - **教师**：默认范围"我的申报"（`mine=true`）、状态"全部"，可申报 / 编辑 / 删除本人题目
    （行操作仅当 `r.applicantNo === me.teacherNo` 时显示）；
  - **系主任**：默认范围"全部题目"、状态"待审核"，渲染审核按钮与审核弹窗（通过并发布 / 驳回 + 意见）。
- 菜单合并为一条（`anyOf: ['/topic/apply', '/topic/audit']`），删除 `/topic/audit` 路由与
  `MyTopics.tsx` / `TopicAudit.tsx` 两个旧页面文件。
- 范围筛选用 `scope ?? (isDean ? 'all' : 'mine')` 派生默认值；修复了教师首屏因默认
  "全部题目 + 按编号倒序"看不到本人题目（翻到第二页）的问题。
- 配套修复：过程材料页状态筛选原先用派生默认值，导致下拉显示"全部状态"而实际按"待评阅"
  取数且无法选回"全部状态"，已把默认值提升为 state 初值。
- 种子数据补一条 2026 届待审核题目（`202600000025`，申报教师吴静），保证系主任默认视图有数据、
  审核流程可演示。
- 验证：`scripts/verify-columns.mjs` 断言系主任视角表头 11 列、存在"审核"按钮、点击弹窗含
  "题目审核"标题与"通过并发布"、无"申报题目"按钮。

### 十二项界面与交互问题修正（UI/UX 轮）

1. **学生端逾期名单隐藏**：`Progress.tsx` 按 `hasPerm('/service/stat')` 门控，无权限时不发起
   `overdue()` 请求、不渲染"逾期名单"Tab（接口本身返回 403）。
2. **长文本"查看"功能**：新增 `LongText` 组件（超长截断 + "查看"按钮 + 弹窗全文，`pre-wrap`
   限高滚动），接入评阅意见（`MyProject` / `Submissions`）、审核意见（`TopicManage`）、
   延期理由（`Extensions`）四处。
3. **学生课题清单去冗余**：学生视角恒为一条记录，`Projects.tsx` 改为信息卡片（题目 + 状态 +
   课题编号 / 指导教师 / 届别 / 当前阶段 / 开始日期），去掉表格与筛选器；教师 / 管理端保留表格，
   原 `hideFor` 学生列过滤随之移除。
4. **深色主题下拉箭头平铺**：根因是 CSS 特异性——`:root[data-theme='dark'] select`（0,2,1）压过
   `select:focus`（0,1,1），聚焦时箭头背景图被重新应用且 `background` 简写把
   `background-repeat` 重置为 `repeat`，箭头平铺成一片。`select:focus` 改用
   `background-color` 单独声明；双主题计算样式验证 `background-repeat: no-repeat`。
5. **公告 / 站内消息查看**：新增 `FeedDetail` 共享弹窗（标签行 + 全文 + 附加信息），接入
   通知中心（`Layout`）、工作台公告（`Dashboard`）、站内消息（`Messages`）三处；通知中心与
   公告条目改为弹窗查看而非跳转。
6. **全局搜索改内容搜索**：`GlobalSearch` 由"只搜菜单"升级为"内容 + 页面"双模式——按身份权限
   并行检索公告、站内消息、题目 / 可选题目、课题、成绩、账号（300ms 防抖、失败源静默跳过），
   公告 / 消息命中点击后弹窗查看全文，其余跳转对应管理页；菜单命中保留为"页面"分组。
7. **工作台卡面直达**：不新增卡面，改为现有卡面可点击——指标卡（`StatCard` 支持 `to` +
   整卡按钮化 + 箭头指示）、图表卡、阶段明细卡、公告卡，目标按权限解析，无权限不挂跳转。
8. **公告发布对象多选**：`NoticeIn` 增 `Scopes`，`scope` 列扩到 `VARCHAR(100)` 逗号分隔存储；
   后端 `NormalizeScope`（多选优先、去重、空则"全院"）+ 可见性内存过滤 + 接收人并集推送；
   前端 `ScopeMulti` 多选组件（"全院"与具体范围互斥、外点关闭）。
9. **弹窗关闭按钮过大**：`Modal` 关闭按钮去掉 `btn ghost sm` 类（`.btn.sm` 特异性压过
   `.modal-close` 的 `padding:0`），`.modal-close` 重写为 26px 无边框小按钮。
10. **成绩审核勾选后其他人被隐藏**：`Audit.tsx` 删除按勾选过滤列表的 `selectable` 逻辑，
    `shown` 恒为全量待审 + 待发布，勾选只决定"审核 / 发布"的作用对象。
11. **表单内容未相对表头居中**：`.ellipsis` 由 `text-align: left` 改为 `inherit`，长文本
    （换行 / 截断）继承列对齐；短文本收缩包裹原本看不出问题。
12. **刷新 / 退出无反馈**：通知中心刷新成功 `ui.ok('通知已刷新')`（`loadFeed` 返回成败，
    仅成功提示）；退出登录先 `ui.ok('已退出登录')` 再登出跳转（Toast 由 `UIProvider`
    跨路由持有，登录页仍可见）。
- 验证：前端 `tsc -b` 0 错误 + `vite build` 通过；后端 0 警告 0 错误；浏览器探针 16/16 + 2/2
  通过（卡面直达、内容搜索、公告弹窗、学生卡片视图、刷新 / 退出 Toast）。

### 主键类型不匹配修复（FindAsync 键类型）

- 修复 5 处 `DbSet.Find` 键类型与实体主键不一致导致运行时报错的接口（此前从未被编译执行到）：
  - `PUT/DELETE /api/notices/{id}`：`int id` vs `NoticeId`（long）→ 路由改 `{id:long}`、参数 `long`；
  - `PUT/DELETE /api/defense-groups/{id}`：`(uint)id` vs `GroupId`（long）→ 同上；
  - `PUT /api/stages/{id}/node`：`(ushort)id` vs `StageId`（int）→ 直接传 `int`。
- 全量排查其余 20 处 `FindAsync`：基础数据 / 题目走字符串键、任务书 / 提交 / 延期 / 选题 /
  用户走 `long`（路由均为 `{id:long}`）、角色走 `(byte)id` 显式强转，均正确。
- 验证：四个接口实测 `{"ok":true}`；探针改动的两行数据（`stage_node` stage 1、
  `defense_group` group 1）已按 `seed.sql` 还原。
