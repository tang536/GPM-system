import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import Forbidden from './components/Forbidden'
import Layout from './components/Layout'
import Login from './components/Login'
import { Loading } from './components/State'
import { UIProvider } from './components/UIProvider'
import { AuthProvider, homePathOf, useAuth } from './hooks/useAuth'
import { useTheme } from './hooks/useTheme'

import Dashboard from './pages/Dashboard'
import MyProject from './pages/MyProject'
import BasicData from './pages/base/BasicData'
import Users from './pages/user/Users'
import Roles from './pages/user/Roles'
import Logs from './pages/user/Logs'
import TopicManage from './pages/topic/TopicManage'
import TopicPool from './pages/topic/TopicPool'
import TopicMatch from './pages/topic/TopicMatch'
import Projects from './pages/topic/Projects'
import Stages from './pages/process/Stages'
import TaskBooks from './pages/process/TaskBooks'
import Submissions from './pages/process/Submissions'
import Extensions from './pages/process/Extensions'
import Progress from './pages/process/Progress'
import Scores from './pages/score/Scores'
import ScoreAudit from './pages/score/Audit'
import Defense from './pages/score/Defense'
import Notices from './pages/service/Notices'
import Messages from './pages/service/Messages'
import StatsCenter from './pages/service/StatsCenter'
import Maintain from './pages/service/Maintain'

/** 需要登录；未登录跳登录页 */
function RequireAuth({ children }: { children: ReactNode }) {
  const { me, loading } = useAuth()
  const loc = useLocation()
  if (loading) {
    return (
      <div className="content">
        <Loading text="正在校验登录状态…" />
      </div>
    )
  }
  if (!me) return <Navigate to="/login" replace state={{ from: loc.pathname }} />
  return <>{children}</>
}

/** 需要权限：不满足时渲染 403 页，而不是把用户弹回首页 */
function RequirePerm({
  perm,
  anyOf,
  roles,
  children,
}: {
  perm?: string
  anyOf?: string[]
  roles?: string[]
  children: ReactNode
}) {
  const { hasPerm, me } = useAuth()
  if (roles && !roles.some((r) => me?.roles.includes(r))) return <Forbidden text="该页面仅对特定身份开放" />
  if (anyOf && !anyOf.some((p) => hasPerm(p))) return <Forbidden />
  if (perm && !hasPerm(perm)) return <Forbidden />
  return <>{children}</>
}

function LoginRoute() {
  const { me, loading } = useAuth()
  if (loading) {
    return (
      <div className="content">
        <Loading text="正在校验登录状态…" />
      </div>
    )
  }
  if (me) return <Navigate to={homePathOf(me)} replace />
  return <Login />
}

export default function App() {
  useTheme() // 初始化主题（含跟随系统）

  return (
    <UIProvider>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginRoute />} />

          <Route
            element={
              <RequireAuth>
                <Layout />
              </RequireAuth>
            }
          >
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route
              path="/my-project"
              element={
                <RequirePerm roles={['毕业生']}>
                  <MyProject />
                </RequirePerm>
              }
            />

            <Route path="/base/data" element={<RequirePerm anyOf={['/base/dept', '/base/major', '/base/class']}><BasicData /></RequirePerm>} />

            <Route path="/auth/user" element={<RequirePerm perm="/auth/user"><Users /></RequirePerm>} />
            <Route path="/auth/role" element={<RequirePerm anyOf={['/auth/role', '/auth/permission']}><Roles /></RequirePerm>} />
            <Route path="/auth/log" element={<RequirePerm perm="/auth/log"><Logs /></RequirePerm>} />

          <Route path="/topic/apply" element={<RequirePerm anyOf={['/topic/apply', '/topic/audit']}><TopicManage /></RequirePerm>} />
            <Route path="/topic/pool" element={<RequirePerm perm="/topic/select"><TopicPool /></RequirePerm>} />
            <Route path="/topic/match" element={<RequirePerm perm="/topic/match"><TopicMatch /></RequirePerm>} />
            <Route path="/projects" element={<Projects />} />

            <Route path="/process/stage" element={<RequirePerm perm="/process/stage"><Stages /></RequirePerm>} />
            <Route path="/process/task" element={<RequirePerm perm="/process/task"><TaskBooks /></RequirePerm>} />
            <Route path="/process/submission" element={<RequirePerm anyOf={['/process/submit', '/process/review']}><Submissions /></RequirePerm>} />
            <Route path="/process/extension" element={<RequirePerm perm="/process/extend"><Extensions /></RequirePerm>} />
            <Route path="/process/progress" element={<RequirePerm perm="/process/progress"><Progress /></RequirePerm>} />

            <Route path="/score/manage" element={<RequirePerm perm="/score/manage"><Scores /></RequirePerm>} />
            <Route path="/score/audit" element={<RequirePerm perm="/score/audit"><ScoreAudit /></RequirePerm>} />
            <Route path="/score/defense" element={<RequirePerm perm="/score/defense"><Defense /></RequirePerm>} />
            <Route path="/score/stat" element={<Navigate to="/service/stat" replace />} />

            <Route path="/service/notice" element={<RequirePerm perm="/service/notice"><Notices /></RequirePerm>} />
            <Route path="/service/message" element={<RequirePerm perm="/service/message"><Messages /></RequirePerm>} />
            <Route path="/service/stat" element={<RequirePerm anyOf={['/score/manage', '/service/stat']}><StatsCenter /></RequirePerm>} />
            <Route path="/service/maintain" element={<RequirePerm anyOf={['/service/param', '/service/backup']}><Maintain /></RequirePerm>} />

            <Route path="*" element={<Forbidden text="页面不存在或已被移除" />} />
          </Route>
        </Routes>
      </AuthProvider>
    </UIProvider>
  )
}
