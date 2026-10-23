/** 与后端接口一一对应的数据结构定义（字段名与 JSON 保持一致） */

export interface Me {
  id: number
  account: string
  name: string
  userType: string
  studentNo: string | null
  teacherNo: string | null
  roles: string[]
  perms: string[]
}

export interface Department {
  deptNo: string
  deptName: string
  leader: string | null
  office: string | null
  phone: string | null
  majorCount: number
  teacherCount: number
}

export interface Major {
  majorCode: string
  majorName: string
  deptNo: string
  deptName: string
  duration: number
  discipline: string | null
  classCount: number
}

export interface ClassInfo {
  classNo: string
  className: string
  majorCode: string
  majorName: string
  deptName: string
  grade: number
  studentCount: number
  headTeacher: string | null
}

export interface Cohort {
  cohort: string
  stageCount: number
  projectCount: number
}

export interface Account {
  userId: number
  account: string
  userType: string
  status: string
  createdAt: string
  name: string
  studentNo: string | null
  teacherNo: string | null
  roles: string[]
}

export interface StudentRow {
  studentNo: string
  name: string
  gender: string
  classNo: string
  className: string
  enrollYear: number
  phone: string | null
  email: string | null
  hasAccount: boolean
  hasProject: boolean
}

export interface TeacherRow {
  teacherNo: string
  name: string
  gender: string
  title: string | null
  deptNo: string
  deptName: string
  researchField: string | null
  phone: string | null
  email: string | null
  maxStudents: number
  introduction: string | null
  hasAccount: boolean
  studentCount: number
  topicCount: number
}

export interface Role {
  roleId: number
  roleName: string
  roleDesc: string | null
  userCount: number
  permCount: number
  permIds: number[]
}

export interface Permission {
  permId: number
  permName: string
  permType: string
  permPath: string
  roleCount: number
}

export interface OpLog {
  logId: number
  userId: number | null
  account: string
  opType: string
  opModule: string
  description: string
  opTime: string
  ip: string | null
}

export interface Topic {
  topicNo: string
  topicName: string
  topicType: string
  researchField: string | null
  difficulty: string
  applicantNo: string
  teacherName: string
  teacherTitle: string | null
  capacity: number
  takenCount: number
  applyCount: number
  cohort: string
  status: string
  auditOpinion: string | null
  majorCodes: string[]
  majorNames: string[]
  mySelected: boolean
}

export interface PoolTopic {
  topicNo: string
  topicName: string
  topicType: string
  researchField: string | null
  difficulty: string
  teacherName: string
  teacherTitle: string | null
  capacity: number
  takenCount: number
  remainCount: number
  cohort: string
}

export interface TopicStat {
  topicNo: string
  topicName: string
  teacherName: string
  majorNames: string | null
  capacity: number
  applyCount: number
  takenCount: number
  remainCount: number
  status: string
  cohort: string
}

export interface Selection {
  selectionId: number
  studentNo: string
  studentName: string
  className: string
  topicNo: string
  topicName: string
  teacherName: string
  capacity: number
  takenCount: number
  preference: number
  status: string
  confirmTime: string | null
}

export interface Project {
  projectNo: string
  studentNo: string
  studentName: string
  className: string
  topicNo: string
  topicName: string
  cohort: string
  teacherNo: string
  teacherName: string
  currentStage: number | null
  projectStatus: string
  startDate: string
  endDate: string | null
}

export interface Stage {
  stageId: number
  stageName: string
  stageOrder: number
  cohort: string
  startTime: string | null
  deadline: string | null
  allowFormat: string | null
  maxSize: number | null
  allowLate: boolean
}

export interface TaskBook {
  taskId: number
  projectNo: string
  studentNo: string
  studentName: string
  topicName: string
  teacherName: string
  designTask: string | null
  techRequirement: string | null
  schedule: string | null
  issueTime: string
  confirmStatus: string
}

export interface Submission {
  submissionId: number
  projectNo: string
  studentNo: string
  studentName: string
  teacherName: string
  stageId: number
  stageName: string
  version: number
  filePath: string
  submitTime: string
  auditStatus: string
  conclusion: string | null
  opinion: string | null
}

export interface Extension {
  requestId: number
  projectNo: string
  studentNo: string
  studentName: string
  teacherName: string
  stageName: string
  reason: string
  applyTime: string
  approverNo: string | null
  approverName: string | null
  result: string
  delayDays: number | null
}

export interface ProgressRow {
  projectNo: string
  studentNo: string
  studentName: string
  className: string
  teacherName: string
  stageName: string
  stageId: number
  deadline: string | null
  lastSubmit: string | null
  lastVersion: number | null
  submitStatus: string
}

export interface OverdueRow {
  projectNo: string
  studentNo: string
  studentName: string
  teacherName: string
  topicName: string
  stageName: string
  deadline: string
  overdueDays: number
}

export interface ScoreRow {
  projectNo: string
  studentNo: string
  studentName: string
  className: string
  majorName: string
  deptName: string
  topicName: string
  teacherName: string
  processScore: number | null
  reviewScore: number | null
  defenseScore: number | null
  totalScore: number | null
  scoreLevel: string | null
  publishStatus: string
  canProcess: boolean
  canReview: boolean
  canDefense: boolean
  locked: boolean
}

export interface ScoreStat {
  deptName: string
  majorName: string
  className: string
  excellentCount: number
  goodCount: number
  mediumCount: number
  passCount: number
  failCount: number
  avgScore: number | null
  maxScore: number | null
  minScore: number | null
}

export interface DefenseGroup {
  groupId: number
  cohort: string
  majorCode: string | null
  majorName: string | null
  leaderNo: string
  leaderName: string
  place: string | null
  defenseTime: string | null
  arrangeCount: number
}

export interface DimScore {
  dimension: string
  max?: number
  score: number | null
  remark: string | null
}

export interface DefenseArrange {
  arrangeId: number | null
  groupId: number
  defenseTime: string | null
  place: string | null
  leaderName: string
  defenseOrder: number
  projectNo: string
  studentNo: string
  studentName: string
  topicName: string
  teacherName: string
  dims: DimScore[]
  subtotal: number | null
  canScore: boolean
}

export interface DimDef {
  dimension: string
  max: number
}

export interface Notice {
  noticeId: number
  title: string
  content: string
  noticeType: string
  scope: string
  publisher: string
  publishTime: string
  isTop: boolean
}

export interface Message {
  messageId: number
  title: string
  content: string
  msgType: string
  isRead: boolean
  sendTime: string
  senderName: string | null
}

export interface Overview {
  role: string
  users: number
  students: number
  teachers: number
  topics: number
  pendingTopics: number
  projects: number
  pendingExtend: number
  unpublishedScores: number
  publishedScores: number
  unread: number
  notices: number
}

export interface StageProgressStat {
  stageId: number
  stageName: string
  total: number
  submitted: number
  onTime: number
  overdue: number
  missing: number
  deadline: string | null
}

export interface DeptStat {
  deptNo: string
  deptName: string
  projectCount: number
  studentCount: number
  publishedCount: number
  avgScore: number | null
}

export interface Workload {
  teacherNo: string
  teacherName: string
  title: string | null
  deptName: string
  topicCount: number
  studentCount: number
  reviewCount: number
  avgScore: number | null
}

export interface SysParam {
  paramId: number
  paramName: string
  paramValue: string
  remark: string | null
}

export interface BackupFile {
  name: string
  size: number
  time: string
}
