-- =============================================================
-- 毕业设计管理系统  数据库结构脚本
-- 依据：《数据库原理实践》课程设计报告（唐荣强 陆航）第 5.2/5.3/5.4 节
-- 目标库：MySQL 8.0+ / 9.x，InnoDB，utf8mb4
-- 内容：28 张表、10 个索引、2 个函数、14 个视图、5 个触发器、3 个存储过程
-- =============================================================

DROP DATABASE IF EXISTS graddb;
CREATE DATABASE graddb
    DEFAULT CHARACTER SET utf8mb4
    DEFAULT COLLATE utf8mb4_general_ci;
USE graddb;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================
-- 一、数据表（按"被参照表先建、参照表后建"的顺序）
-- =============================================================

-- 1 院系表
CREATE TABLE department (
    dept_no CHAR(4) NOT NULL COMMENT '院系编号',
    dept_name VARCHAR(40) NOT NULL COMMENT '院系名称',
    leader VARCHAR(20) NULL COMMENT '院系负责人',
    office VARCHAR(50) NULL COMMENT '办公地点',
    phone VARCHAR(20) NULL COMMENT '联系电话',
    PRIMARY KEY (dept_no),
    UNIQUE KEY uk_dept_name (dept_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='院系表';

-- 2 专业表
CREATE TABLE major (
    major_code CHAR(6) NOT NULL COMMENT '专业代码',
    major_name VARCHAR(40) NOT NULL COMMENT '专业名称',
    dept_no CHAR(4) NOT NULL COMMENT '所属院系编号',
    duration TINYINT NOT NULL DEFAULT 4 COMMENT '学制',
    discipline VARCHAR(30) NULL COMMENT '学科门类',
    PRIMARY KEY (major_code),
    UNIQUE KEY uk_major_name (dept_no, major_name),
    CONSTRAINT fk_major_dept FOREIGN KEY (dept_no)
        REFERENCES department (dept_no),
    CONSTRAINT ck_major_duration CHECK (duration BETWEEN 3 AND 8)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='专业表';

-- 3 班级表
CREATE TABLE class_info (
    class_no CHAR(8) NOT NULL COMMENT '班级编号',
    class_name VARCHAR(30) NOT NULL COMMENT '班级名称',
    major_code CHAR(6) NOT NULL COMMENT '专业代码',
    grade SMALLINT NOT NULL COMMENT '年级',
    student_count SMALLINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '班级人数',
    head_teacher VARCHAR(20) NULL COMMENT '班主任',
    PRIMARY KEY (class_no),
    UNIQUE KEY uk_class_name (major_code, class_name),
    CONSTRAINT fk_class_major FOREIGN KEY (major_code)
        REFERENCES major (major_code),
    CONSTRAINT ck_class_grade CHECK (grade BETWEEN 1990 AND 2100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='班级表';

-- 4 用户表
CREATE TABLE sys_user (
    user_id INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '用户编号',
    account VARCHAR(20) NOT NULL COMMENT '登录账号',
    password VARCHAR(64) NOT NULL COMMENT '登录密码',
    user_type VARCHAR(10) NOT NULL COMMENT '用户类型',
    status VARCHAR(8) NOT NULL DEFAULT '启用' COMMENT '账号状态',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    PRIMARY KEY (user_id),
    UNIQUE KEY uk_user_account (account),
    CONSTRAINT ck_user_type CHECK
        (user_type IN ('管理员','系主任','指导教师','评阅教师','学生')),
    CONSTRAINT ck_user_status CHECK (status IN ('启用','停用'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

-- 5 角色表
CREATE TABLE sys_role (
    role_id TINYINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '角色编号',
    role_name VARCHAR(20) NOT NULL COMMENT '角色名称',
    role_desc VARCHAR(100) NULL COMMENT '角色描述',
    PRIMARY KEY (role_id),
    UNIQUE KEY uk_role_name (role_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='角色表';

-- 6 权限表
CREATE TABLE sys_permission (
    perm_id SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '权限编号',
    perm_name VARCHAR(30) NOT NULL COMMENT '权限名称',
    perm_type VARCHAR(8) NOT NULL COMMENT '权限类型',
    perm_path VARCHAR(100) NULL COMMENT '访问路径',
    PRIMARY KEY (perm_id),
    CONSTRAINT ck_perm_type CHECK (perm_type IN ('菜单','按钮'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='权限表';

-- 7 用户角色表
CREATE TABLE sys_user_role (
    user_id INT UNSIGNED NOT NULL COMMENT '用户编号',
    role_id TINYINT UNSIGNED NOT NULL COMMENT '角色编号',
    granted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '授予时间',
    PRIMARY KEY (user_id, role_id),
    CONSTRAINT fk_ur_user FOREIGN KEY (user_id)
        REFERENCES sys_user (user_id) ON DELETE CASCADE,
    CONSTRAINT fk_ur_role FOREIGN KEY (role_id)
        REFERENCES sys_role (role_id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户角色表';

-- 8 角色权限表
CREATE TABLE sys_role_permission (
    role_id TINYINT UNSIGNED NOT NULL COMMENT '角色编号',
    perm_id SMALLINT UNSIGNED NOT NULL COMMENT '权限编号',
    PRIMARY KEY (role_id, perm_id),
    CONSTRAINT fk_rp_role FOREIGN KEY (role_id)
        REFERENCES sys_role (role_id) ON DELETE CASCADE,
    CONSTRAINT fk_rp_perm FOREIGN KEY (perm_id)
        REFERENCES sys_permission (perm_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='角色权限表';

-- 9 指导教师表
CREATE TABLE teacher (
    teacher_no CHAR(8) NOT NULL COMMENT '工号',
    user_id INT UNSIGNED NULL COMMENT '用户编号',
    name VARCHAR(20) NOT NULL COMMENT '姓名',
    gender CHAR(2) NOT NULL COMMENT '性别',
    title VARCHAR(10) NOT NULL COMMENT '职称',
    dept_no CHAR(4) NOT NULL COMMENT '所属院系编号',
    research_field VARCHAR(100) NULL COMMENT '研究方向',
    phone CHAR(11) NULL COMMENT '联系电话',
    email VARCHAR(50) NULL COMMENT '电子邮箱',
    max_students TINYINT UNSIGNED NOT NULL DEFAULT 5 COMMENT '可指导人数',
    introduction VARCHAR(500) NULL COMMENT '个人简介',
    PRIMARY KEY (teacher_no),
    UNIQUE KEY uk_teacher_user (user_id),
    CONSTRAINT fk_teacher_user FOREIGN KEY (user_id)
        REFERENCES sys_user (user_id) ON DELETE SET NULL,
    CONSTRAINT fk_teacher_dept FOREIGN KEY (dept_no)
        REFERENCES department (dept_no),
    CONSTRAINT ck_teacher_gender CHECK (gender IN ('男','女')),
    CONSTRAINT ck_teacher_title CHECK (title IN ('助教','讲师','副教授','教授')),
    CONSTRAINT ck_teacher_max CHECK (max_students BETWEEN 1 AND 10)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='指导教师表';

-- 10 学生表
CREATE TABLE student (
    student_no CHAR(12) NOT NULL COMMENT '学号',
    user_id INT UNSIGNED NULL COMMENT '用户编号',
    name VARCHAR(20) NOT NULL COMMENT '姓名',
    gender CHAR(2) NOT NULL COMMENT '性别',
    class_no CHAR(8) NOT NULL COMMENT '班级编号',
    phone CHAR(11) NULL COMMENT '联系电话',
    email VARCHAR(50) NULL COMMENT '电子邮箱',
    enroll_year SMALLINT NOT NULL COMMENT '入学年份',
    PRIMARY KEY (student_no),
    UNIQUE KEY uk_student_user (user_id),
    CONSTRAINT fk_student_user FOREIGN KEY (user_id)
        REFERENCES sys_user (user_id) ON DELETE SET NULL,
    CONSTRAINT fk_student_class FOREIGN KEY (class_no)
        REFERENCES class_info (class_no),
    CONSTRAINT ck_student_gender CHECK (gender IN ('男','女')),
    CONSTRAINT ck_student_year CHECK (enroll_year BETWEEN 1990 AND 2100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='学生表';

-- 11 阶段表
CREATE TABLE stage (
    stage_id SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '阶段编号',
    stage_name VARCHAR(20) NOT NULL COMMENT '阶段名称',
    stage_order TINYINT UNSIGNED NOT NULL COMMENT '阶段顺序',
    cohort CHAR(4) NOT NULL COMMENT '所属届别',
    PRIMARY KEY (stage_id),
    UNIQUE KEY uk_stage_name (cohort, stage_name),
    UNIQUE KEY uk_stage_order (cohort, stage_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='阶段表';

-- 12 阶段时间节点表
CREATE TABLE stage_node (
    node_id INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '节点编号',
    stage_id SMALLINT UNSIGNED NOT NULL COMMENT '阶段编号',
    start_time DATETIME NOT NULL COMMENT '开始时间',
    deadline DATETIME NOT NULL COMMENT '截止时间',
    allow_format VARCHAR(50) NOT NULL DEFAULT 'pdf,doc,docx,zip' COMMENT '允许提交格式',
    max_size SMALLINT UNSIGNED NOT NULL DEFAULT 20 COMMENT '文件大小上限',
    allow_late TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否允许补交',
    PRIMARY KEY (node_id),
    UNIQUE KEY uk_node_stage (stage_id),
    CONSTRAINT fk_node_stage FOREIGN KEY (stage_id)
        REFERENCES stage (stage_id) ON DELETE CASCADE,
    CONSTRAINT ck_node_time CHECK (deadline > start_time),
    CONSTRAINT ck_node_size CHECK (max_size BETWEEN 1 AND 200)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='阶段时间节点表';

-- 13 题目表
CREATE TABLE topic (
    topic_no CHAR(12) NOT NULL COMMENT '题目编号',
    topic_name VARCHAR(100) NOT NULL COMMENT '题目名称',
    topic_type VARCHAR(10) NOT NULL COMMENT '题目类型',
    research_field VARCHAR(100) NULL COMMENT '研究方向',
    difficulty VARCHAR(6) NOT NULL COMMENT '难度',
    applicant_no CHAR(8) NOT NULL COMMENT '申报人工号',
    capacity TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT '可选人数',
    cohort CHAR(4) NOT NULL COMMENT '所属届别',
    status VARCHAR(10) NOT NULL DEFAULT '待审核' COMMENT '题目状态',
    audit_opinion VARCHAR(200) NULL COMMENT '审核意见',
    PRIMARY KEY (topic_no),
    CONSTRAINT fk_topic_teacher FOREIGN KEY (applicant_no)
        REFERENCES teacher (teacher_no),
    CONSTRAINT ck_topic_type CHECK
        (topic_type IN ('工程设计','软件开发','理论研究','其他')),
    CONSTRAINT ck_topic_diff CHECK (difficulty IN ('易','中','难')),
    CONSTRAINT ck_topic_capacity CHECK (capacity BETWEEN 1 AND 5),
    CONSTRAINT ck_topic_status CHECK
        (status IN ('待审核','已发布','未通过','已停用'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='题目表';

-- 14 题目面向专业表
CREATE TABLE topic_major (
    topic_no CHAR(12) NOT NULL COMMENT '题目编号',
    major_code CHAR(6) NOT NULL COMMENT '专业代码',
    PRIMARY KEY (topic_no, major_code),
    CONSTRAINT fk_tm_topic FOREIGN KEY (topic_no)
        REFERENCES topic (topic_no) ON DELETE CASCADE,
    CONSTRAINT fk_tm_major FOREIGN KEY (major_code)
        REFERENCES major (major_code) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='题目面向专业表';

-- 15 选题记录表
CREATE TABLE topic_selection (
    selection_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '记录编号',
    student_no CHAR(12) NOT NULL COMMENT '学号',
    topic_no CHAR(12) NOT NULL COMMENT '题目编号',
    preference TINYINT UNSIGNED NOT NULL COMMENT '志愿顺序',
    status VARCHAR(10) NOT NULL DEFAULT '待匹配' COMMENT '记录状态',
    confirm_time DATETIME NULL COMMENT '确认时间',
    PRIMARY KEY (selection_id),
    UNIQUE KEY uk_sel_stu_topic (student_no, topic_no),
    UNIQUE KEY uk_sel_stu_pref (student_no, preference),
    CONSTRAINT fk_sel_student FOREIGN KEY (student_no)
        REFERENCES student (student_no) ON DELETE CASCADE,
    CONSTRAINT fk_sel_topic FOREIGN KEY (topic_no)
        REFERENCES topic (topic_no) ON DELETE RESTRICT,
    CONSTRAINT ck_sel_pref CHECK (preference BETWEEN 1 AND 3),
    CONSTRAINT ck_sel_status CHECK
        (status IN ('待匹配','已匹配','已调剂','已放弃'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='选题记录表';

-- 16 课题表
CREATE TABLE project (
    project_no CHAR(14) NOT NULL COMMENT '课题编号',
    student_no CHAR(12) NOT NULL COMMENT '学号',
    topic_no CHAR(12) NOT NULL COMMENT '题目编号',
    teacher_no CHAR(8) NOT NULL COMMENT '指导教师工号',
    current_stage SMALLINT UNSIGNED NULL COMMENT '当前阶段编号',
    project_status VARCHAR(10) NOT NULL DEFAULT '进行中' COMMENT '课题状态',
    start_date DATE NOT NULL COMMENT '开始日期',
    end_date DATE NULL COMMENT '结束日期',
    PRIMARY KEY (project_no),
    UNIQUE KEY uk_project_student (student_no),
    CONSTRAINT fk_project_student FOREIGN KEY (student_no)
        REFERENCES student (student_no) ON DELETE CASCADE,
    CONSTRAINT fk_project_topic FOREIGN KEY (topic_no)
        REFERENCES topic (topic_no) ON DELETE RESTRICT,
    CONSTRAINT fk_project_teacher FOREIGN KEY (teacher_no)
        REFERENCES teacher (teacher_no) ON DELETE RESTRICT,
    CONSTRAINT fk_project_stage FOREIGN KEY (current_stage)
        REFERENCES stage (stage_id),
    CONSTRAINT ck_project_status CHECK
        (project_status IN ('进行中','已答辩','已归档')),
    CONSTRAINT ck_project_date CHECK (end_date IS NULL OR end_date >= start_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='课题表';

-- 17 任务书表
CREATE TABLE task_book (
    task_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '任务书编号',
    project_no CHAR(14) NOT NULL COMMENT '课题编号',
    design_task TEXT NOT NULL COMMENT '设计任务',
    tech_requirement TEXT NULL COMMENT '技术要求',
    schedule TEXT NULL COMMENT '进度安排',
    issue_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '下达时间',
    confirm_status VARCHAR(10) NOT NULL DEFAULT '未确认' COMMENT '确认状态',
    PRIMARY KEY (task_id),
    UNIQUE KEY uk_task_project (project_no),
    CONSTRAINT fk_task_project FOREIGN KEY (project_no)
        REFERENCES project (project_no) ON DELETE CASCADE,
    CONSTRAINT ck_task_status CHECK (confirm_status IN ('未确认','已确认'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='任务书表';

-- 18 提交材料表
CREATE TABLE submission (
    submission_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '材料编号',
    project_no CHAR(14) NOT NULL COMMENT '课题编号',
    stage_id SMALLINT UNSIGNED NOT NULL COMMENT '阶段编号',
    version SMALLINT UNSIGNED NOT NULL COMMENT '版本号',
    file_path VARCHAR(255) NOT NULL COMMENT '文件路径',
    submit_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '提交时间',
    audit_status VARCHAR(10) NOT NULL DEFAULT '待评阅' COMMENT '审核状态',
    PRIMARY KEY (submission_id),
    UNIQUE KEY uk_sub_version (project_no, stage_id, version),
    CONSTRAINT fk_sub_project FOREIGN KEY (project_no)
        REFERENCES project (project_no) ON DELETE CASCADE,
    CONSTRAINT fk_sub_stage FOREIGN KEY (stage_id)
        REFERENCES stage (stage_id) ON DELETE RESTRICT,
    CONSTRAINT ck_sub_version CHECK (version >= 1),
    CONSTRAINT ck_sub_status CHECK
        (audit_status IN ('待评阅','通过','修改后通过','不通过'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='提交材料表';

-- 19 评阅记录表
CREATE TABLE review (
    review_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '评阅编号',
    submission_id BIGINT UNSIGNED NOT NULL COMMENT '材料编号',
    reviewer_no CHAR(8) NOT NULL COMMENT '评阅人工号',
    review_opinion VARCHAR(500) NULL COMMENT '评阅意见',
    conclusion VARCHAR(10) NOT NULL COMMENT '评阅结论',
    review_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '评阅时间',
    PRIMARY KEY (review_id),
    UNIQUE KEY uk_review_sub_reviewer (submission_id, reviewer_no),
    CONSTRAINT fk_review_sub FOREIGN KEY (submission_id)
        REFERENCES submission (submission_id) ON DELETE CASCADE,
    CONSTRAINT fk_review_teacher FOREIGN KEY (reviewer_no)
        REFERENCES teacher (teacher_no) ON DELETE RESTRICT,
    CONSTRAINT ck_review_conc CHECK
        (conclusion IN ('通过','修改后通过','不通过'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='评阅记录表';

-- 20 延期申请表
CREATE TABLE extension_request (
    request_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '申请编号',
    project_no CHAR(14) NOT NULL COMMENT '课题编号',
    stage_id SMALLINT UNSIGNED NOT NULL COMMENT '阶段编号',
    reason VARCHAR(300) NOT NULL COMMENT '申请理由',
    apply_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '申请时间',
    approver_no CHAR(8) NULL COMMENT '审批人工号',
    result VARCHAR(10) NULL DEFAULT '待审批' COMMENT '审批结果',
    delay_days SMALLINT UNSIGNED NULL COMMENT '延期天数',
    PRIMARY KEY (request_id),
    UNIQUE KEY uk_ext_apply (project_no, stage_id, apply_time),
    CONSTRAINT fk_ext_project FOREIGN KEY (project_no)
        REFERENCES project (project_no) ON DELETE CASCADE,
    CONSTRAINT fk_ext_stage FOREIGN KEY (stage_id)
        REFERENCES stage (stage_id) ON DELETE RESTRICT,
    CONSTRAINT fk_ext_teacher FOREIGN KEY (approver_no)
        REFERENCES teacher (teacher_no) ON DELETE RESTRICT,
    CONSTRAINT ck_ext_result CHECK (result IN ('待审批','同意','不同意')),
    CONSTRAINT ck_ext_days CHECK (delay_days IS NULL OR delay_days BETWEEN 1 AND 30)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='延期申请表';

-- 21 成绩表（总评成绩与等级为派生属性，由视图实时计算，不落表）
CREATE TABLE score (
    score_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '成绩编号',
    project_no CHAR(14) NOT NULL COMMENT '课题编号',
    process_score DECIMAL(5,2) NULL COMMENT '过程成绩',
    review_score DECIMAL(5,2) NULL COMMENT '评阅成绩',
    defense_score DECIMAL(5,2) NULL COMMENT '答辩成绩',
    process_weight DECIMAL(3,2) NOT NULL DEFAULT 0.40 COMMENT '过程成绩权重',
    review_weight DECIMAL(3,2) NOT NULL DEFAULT 0.30 COMMENT '评阅成绩权重',
    defense_weight DECIMAL(3,2) NOT NULL DEFAULT 0.30 COMMENT '答辩成绩权重',
    publish_status VARCHAR(10) NOT NULL DEFAULT '未发布' COMMENT '发布状态',
    PRIMARY KEY (score_id),
    UNIQUE KEY uk_score_project (project_no),
    CONSTRAINT fk_score_project FOREIGN KEY (project_no)
        REFERENCES project (project_no) ON DELETE CASCADE,
    CONSTRAINT ck_score_process CHECK (process_score BETWEEN 0 AND 100),
    CONSTRAINT ck_score_review CHECK (review_score BETWEEN 0 AND 100),
    CONSTRAINT ck_score_defense CHECK (defense_score BETWEEN 0 AND 100),
    CONSTRAINT ck_score_sum CHECK
        (process_weight + review_weight + defense_weight = 1),
    CONSTRAINT ck_score_publish CHECK
        (publish_status IN ('未发布','已审核','已发布'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='成绩表';

-- 22 答辩分组表
CREATE TABLE defense_group (
    group_id INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '分组编号',
    cohort CHAR(4) NOT NULL COMMENT '所属届别',
    major_code CHAR(6) NULL COMMENT '面向专业',
    leader_no CHAR(8) NOT NULL COMMENT '组长工号',
    place VARCHAR(50) NOT NULL COMMENT '答辩地点',
    defense_time DATETIME NOT NULL COMMENT '答辩时间',
    PRIMARY KEY (group_id),
    CONSTRAINT fk_group_major FOREIGN KEY (major_code)
        REFERENCES major (major_code) ON DELETE RESTRICT,
    CONSTRAINT fk_group_leader FOREIGN KEY (leader_no)
        REFERENCES teacher (teacher_no) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='答辩分组表';

-- 23 答辩安排表
CREATE TABLE defense_arrange (
    arrange_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '安排编号',
    group_id INT UNSIGNED NOT NULL COMMENT '分组编号',
    project_no CHAR(14) NOT NULL COMMENT '课题编号',
    defense_order TINYINT UNSIGNED NOT NULL COMMENT '答辩顺序',
    PRIMARY KEY (arrange_id),
    UNIQUE KEY uk_arr_order (group_id, defense_order),
    CONSTRAINT fk_arr_group FOREIGN KEY (group_id)
        REFERENCES defense_group (group_id) ON DELETE CASCADE,
    CONSTRAINT fk_arr_project FOREIGN KEY (project_no)
        REFERENCES project (project_no) ON DELETE CASCADE,
    CONSTRAINT ck_arr_order CHECK (defense_order >= 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='答辩安排表';

-- 24 答辩评分表
CREATE TABLE defense_score (
    item_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '评分编号',
    arrange_id BIGINT UNSIGNED NOT NULL COMMENT '安排编号',
    dimension VARCHAR(20) NOT NULL COMMENT '评分维度',
    score DECIMAL(4,1) NOT NULL COMMENT '得分',
    remark VARCHAR(200) NULL COMMENT '评语',
    PRIMARY KEY (item_id),
    UNIQUE KEY uk_ds_arr_dim (arrange_id, dimension),
    CONSTRAINT fk_ds_arrange FOREIGN KEY (arrange_id)
        REFERENCES defense_arrange (arrange_id) ON DELETE CASCADE,
    CONSTRAINT ck_ds_score CHECK (score BETWEEN 0 AND 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='答辩评分表';

-- 25 公告表
CREATE TABLE notice (
    notice_id INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '公告编号',
    title VARCHAR(100) NOT NULL COMMENT '公告标题',
    content TEXT NOT NULL COMMENT '公告内容',
    notice_type VARCHAR(10) NOT NULL COMMENT '公告类型',
    scope VARCHAR(100) NOT NULL DEFAULT '全院' COMMENT '发布范围，多选时以逗号分隔',
    publisher_id INT UNSIGNED NOT NULL COMMENT '发布人用户编号',
    publish_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '发布时间',
    is_top TINYINT(1) NOT NULL DEFAULT 0 COMMENT '置顶标记',
    PRIMARY KEY (notice_id),
    CONSTRAINT fk_notice_user FOREIGN KEY (publisher_id)
        REFERENCES sys_user (user_id) ON DELETE RESTRICT,
    CONSTRAINT ck_notice_type CHECK
        (notice_type IN ('通知','公告','模板','政策'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='公告表';

-- 26 消息表
CREATE TABLE message (
    message_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '消息编号',
    receiver_id INT UNSIGNED NOT NULL COMMENT '接收人用户编号',
    content VARCHAR(500) NOT NULL COMMENT '消息内容',
    message_type VARCHAR(10) NOT NULL COMMENT '消息类型',
    is_read TINYINT(1) NOT NULL DEFAULT 0 COMMENT '已读状态',
    send_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '发送时间',
    PRIMARY KEY (message_id),
    CONSTRAINT fk_msg_user FOREIGN KEY (receiver_id)
        REFERENCES sys_user (user_id) ON DELETE CASCADE,
    CONSTRAINT ck_msg_type CHECK
        (message_type IN ('系统通知','审核结果','评阅反馈','成绩通知','截止提醒'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='消息表';

-- 27 操作日志表
CREATE TABLE operation_log (
    log_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '日志编号',
    user_id INT UNSIGNED NULL COMMENT '用户编号',
    op_type VARCHAR(10) NOT NULL COMMENT '操作类型',
    op_module VARCHAR(30) NOT NULL COMMENT '操作模块',
    description VARCHAR(200) NULL COMMENT '操作描述',
    op_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '操作时间',
    ip VARCHAR(45) NULL COMMENT 'IP 地址',
    PRIMARY KEY (log_id),
    CONSTRAINT fk_log_user FOREIGN KEY (user_id)
        REFERENCES sys_user (user_id) ON DELETE SET NULL,
    CONSTRAINT ck_log_type CHECK
        (op_type IN ('登录','查询','新增','修改','删除'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='操作日志表';

-- 28 系统参数表
CREATE TABLE sys_param (
    param_id SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '参数编号',
    param_name VARCHAR(50) NOT NULL COMMENT '参数名',
    param_value VARCHAR(200) NOT NULL COMMENT '参数值',
    remark VARCHAR(200) NULL COMMENT '参数说明',
    PRIMARY KEY (param_id),
    UNIQUE KEY uk_param_name (param_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统参数表';

-- =============================================================
-- 二、索引（5.3 节：为高频查询建立索引）
-- =============================================================
CREATE INDEX idx_student_class ON student (class_no);
CREATE INDEX idx_topic_cohort ON topic (cohort, status);
CREATE INDEX idx_topic_applicant ON topic (applicant_no);
CREATE INDEX idx_selection_topic ON topic_selection (topic_no, status);
CREATE INDEX idx_project_teacher ON project (teacher_no);
CREATE INDEX idx_sub_project ON submission (project_no, stage_id, version);
CREATE INDEX idx_review_reviewer ON review (reviewer_no);
CREATE INDEX idx_score_status ON score (publish_status);
CREATE INDEX idx_msg_receiver ON message (receiver_id, is_read);
CREATE INDEX idx_log_user_time ON operation_log (user_id, op_time);
CREATE INDEX idx_notice_scope ON notice (scope, publish_time);

-- =============================================================
-- 三、函数（5.3 节：总评成绩与等级统一口径）
-- =============================================================
DELIMITER $$
CREATE FUNCTION fn_total_score(
    p_process DECIMAL(5,2), p_review DECIMAL(5,2), p_defense DECIMAL(5,2),
    p_w1 DECIMAL(3,2), p_w2 DECIMAL(3,2), p_w3 DECIMAL(3,2)
) RETURNS DECIMAL(5,2)
DETERMINISTIC
BEGIN
    IF p_process IS NULL OR p_review IS NULL OR p_defense IS NULL THEN
        RETURN NULL;
    END IF;
    RETURN ROUND(p_process * p_w1 + p_review * p_w2 + p_defense * p_w3, 2);
END $$

CREATE FUNCTION fn_score_level(p_total DECIMAL(5,2)) RETURNS VARCHAR(10)
DETERMINISTIC
BEGIN
    IF p_total IS NULL THEN
        RETURN NULL;
    END IF;
    IF p_total >= 90 THEN RETURN '优秀';
    ELSEIF p_total >= 80 THEN RETURN '良好';
    ELSEIF p_total >= 70 THEN RETURN '中等';
    ELSEIF p_total >= 60 THEN RETURN '及格';
    ELSE RETURN '不及格';
    END IF;
END $$
DELIMITER ;

-- =============================================================
-- 四、视图（4.3 节：14 个视图，统一 v_ 前缀）
-- =============================================================

-- 1 学生信息视图：屏蔽账号与密码，供选题/过程/成绩模块引用
CREATE VIEW v_student_info AS
SELECT s.student_no AS student_no,
       s.name AS student_name,
       s.gender AS gender,
       s.class_no AS class_no,
       c.class_name AS class_name,
       m.major_name AS major_name,
       d.dept_name AS dept_name,
       s.phone AS phone,
       s.email AS email,
       s.enroll_year AS enroll_year
FROM student s
     JOIN class_info c ON s.class_no = c.class_no
     JOIN major m ON c.major_code = m.major_code
     JOIN department d ON m.dept_no = d.dept_no;

-- 2 题目库视图：仅"已发布"题目，含已选人数与剩余名额
CREATE VIEW v_topic_pool AS
SELECT t.topic_no AS topic_no,
       t.topic_name AS topic_name,
       t.topic_type AS topic_type,
       t.research_field AS research_field,
       t.difficulty AS difficulty,
       te.name AS teacher_name,
       te.title AS teacher_title,
       t.capacity AS capacity,
       (SELECT COUNT(*) FROM project p WHERE p.topic_no = t.topic_no) AS taken_count,
       t.capacity - (SELECT COUNT(*) FROM project p WHERE p.topic_no = t.topic_no) AS remain_count,
       t.cohort AS cohort,
       t.topic_no AS topic_no_key
FROM topic t JOIN teacher te ON t.applicant_no = te.teacher_no
WHERE t.status = '已发布';

-- 3 选题统计视图：系主任掌握选题进度与调剂依据
CREATE VIEW v_topic_selection_stat AS
SELECT t.topic_no AS topic_no,
       t.topic_name AS topic_name,
       te.name AS teacher_name,
       (SELECT GROUP_CONCAT(m.major_name SEPARATOR '、')
          FROM topic_major tm JOIN major m ON tm.major_code = m.major_code
         WHERE tm.topic_no = t.topic_no) AS major_names,
       t.capacity AS capacity,
       (SELECT COUNT(*) FROM topic_selection s WHERE s.topic_no = t.topic_no) AS apply_count,
       (SELECT COUNT(*) FROM project p WHERE p.topic_no = t.topic_no) AS taken_count,
       t.capacity - (SELECT COUNT(*) FROM project p WHERE p.topic_no = t.topic_no) AS remain_count,
       t.status AS status,
       t.cohort AS cohort
FROM topic t JOIN teacher te ON t.applicant_no = te.teacher_no;

-- 4 阶段进度视图：每个课题在每个阶段的完成情况
CREATE VIEW v_stage_progress AS
SELECT p.project_no AS project_no,
       s.student_no AS student_no,
       s.name AS student_name,
       c.class_name AS class_name,
       te.name AS teacher_name,
       st.stage_name AS stage_name,
       st.stage_id AS stage_id,
       n.deadline AS deadline,
       (SELECT MAX(sb.submit_time) FROM submission sb
         WHERE sb.project_no = p.project_no AND sb.stage_id = st.stage_id) AS last_submit,
       (SELECT MAX(sb.version) FROM submission sb
         WHERE sb.project_no = p.project_no AND sb.stage_id = st.stage_id) AS last_version,
       CASE WHEN NOT EXISTS (SELECT 1 FROM submission sb
                              WHERE sb.project_no = p.project_no
                                AND sb.stage_id = st.stage_id) THEN '未提交'
            WHEN (SELECT MAX(sb.submit_time) FROM submission sb
                   WHERE sb.project_no = p.project_no
                     AND sb.stage_id = st.stage_id) > n.deadline THEN '逾期提交'
            ELSE '已提交' END AS submit_status
FROM project p
     JOIN student s ON p.student_no = s.student_no
     JOIN class_info c ON s.class_no = c.class_no
     JOIN teacher te ON p.teacher_no = te.teacher_no
     JOIN topic t ON p.topic_no = t.topic_no
     JOIN stage st ON st.cohort = t.cohort
     JOIN stage_node n ON n.stage_id = st.stage_id;

-- 5 逾期名单视图：截止前提醒与逾期统计的数据来源
CREATE VIEW v_overdue_list AS
SELECT p.project_no AS project_no,
       s.student_no AS student_no,
       s.name AS student_name,
       s.phone AS phone,
       te.name AS teacher_name,
       st.stage_name AS stage_name,
       n.deadline AS deadline,
       DATEDIFF(NOW(), n.deadline) AS overdue_days
FROM project p
     JOIN student s ON p.student_no = s.student_no
     JOIN teacher te ON p.teacher_no = te.teacher_no
     JOIN topic t ON p.topic_no = t.topic_no
     JOIN stage st ON st.cohort = t.cohort
     JOIN stage_node n ON n.stage_id = st.stage_id
WHERE n.deadline < NOW()
  AND NOT EXISTS (SELECT 1 FROM submission sb
                   WHERE sb.project_no = p.project_no
                     AND sb.stage_id = st.stage_id);

-- 6 材料评阅视图：教师阶段评阅与系主任抽查
CREATE VIEW v_material_review AS
SELECT sb.submission_id AS submission_id,
       sb.project_no AS project_no,
       s.student_no AS student_no,
       s.name AS student_name,
       st.stage_name AS stage_name,
       sb.version AS version,
       sb.file_path AS file_path,
       sb.submit_time AS submit_time,
       sb.audit_status AS audit_status,
       te.name AS reviewer_name,
       r.conclusion AS conclusion,
       r.review_opinion AS review_opinion,
       r.review_time AS review_time
FROM submission sb
     JOIN project p ON sb.project_no = p.project_no
     JOIN student s ON p.student_no = s.student_no
     JOIN stage st ON sb.stage_id = st.stage_id
     LEFT JOIN review r ON r.submission_id = sb.submission_id
     LEFT JOIN teacher te ON r.reviewer_no = te.teacher_no;

-- 7 盲审视图：隐藏学生与指导教师，供评阅教师使用
CREATE VIEW v_blind_review AS
SELECT sb.submission_id AS submission_id,
       st.stage_name AS stage_name,
       sb.version AS version,
       sb.file_path AS file_path,
       sb.submit_time AS submit_time,
       t.topic_name AS topic_name,
       t.topic_type AS topic_type,
       t.research_field AS research_field,
       p.project_no AS project_no
FROM submission sb
     JOIN project p ON sb.project_no = p.project_no
     JOIN topic t ON p.topic_no = t.topic_no
     JOIN stage st ON sb.stage_id = st.stage_id;

-- 8 任务书视图：学生确认与教师查看确认情况
CREATE VIEW v_task_book AS
SELECT tb.task_id AS task_id,
       tb.project_no AS project_no,
       s.student_no AS student_no,
       s.name AS student_name,
       t.topic_name AS topic_name,
       tb.design_task AS design_task,
       tb.tech_requirement AS tech_requirement,
       tb.schedule AS schedule,
       tb.issue_time AS issue_time,
       tb.confirm_status AS confirm_status
FROM task_book tb
     JOIN project p ON tb.project_no = p.project_no
     JOIN student s ON p.student_no = s.student_no
     JOIN topic t ON p.topic_no = t.topic_no;

-- 9 成绩汇总视图：总评按权重计算、等级由总评换算
CREATE VIEW v_score_report AS
SELECT x.学号 AS student_no,
       x.姓名 AS student_name,
       x.班级 AS class_name,
       x.专业 AS major_name,
       x.院系 AS dept_name,
       x.题目名称 AS topic_name,
       x.指导教师 AS teacher_name,
       x.过程成绩 AS process_score,
       x.评阅成绩 AS review_score,
       x.答辩成绩 AS defense_score,
       x.过程权重 AS process_weight,
       x.评阅权重 AS review_weight,
       x.答辩权重 AS defense_weight,
       x.总评成绩 AS total_score,
       CASE WHEN x.总评成绩 >= 90 THEN '优秀'
            WHEN x.总评成绩 >= 80 THEN '良好'
            WHEN x.总评成绩 >= 70 THEN '中等'
            WHEN x.总评成绩 >= 60 THEN '及格'
            WHEN x.总评成绩 IS NULL THEN NULL
            ELSE '不及格' END AS score_level,
       x.发布状态 AS publish_status,
       x.课题编号 AS project_no,
       x.教师工号 AS teacher_no
FROM (SELECT s.student_no AS 学号, s.name AS 姓名,
             c.class_name AS 班级, m.major_name AS 专业,
             d.dept_name AS 院系, t.topic_name AS 题目名称,
             te.name AS 指导教师,
             sc.process_score AS 过程成绩,
             sc.review_score AS 评阅成绩,
             sc.defense_score AS 答辩成绩,
             sc.process_weight AS 过程权重,
             sc.review_weight AS 评阅权重,
             sc.defense_weight AS 答辩权重,
             ROUND(sc.process_score * sc.process_weight
                 + sc.review_score * sc.review_weight
                 + sc.defense_score * sc.defense_weight, 2) AS 总评成绩,
             sc.publish_status AS 发布状态,
             p.project_no AS 课题编号,
             te.teacher_no AS 教师工号
      FROM score sc
           JOIN project p ON sc.project_no = p.project_no
           JOIN student s ON p.student_no = s.student_no
           JOIN class_info c ON s.class_no = c.class_no
           JOIN major m ON c.major_code = m.major_code
           JOIN department d ON m.dept_no = d.dept_no
           JOIN topic t ON p.topic_no = t.topic_no
           JOIN teacher te ON p.teacher_no = te.teacher_no) x;

-- 10 成绩分布统计视图：按院系/专业/班级统计等级分布
CREATE VIEW v_score_stat AS
SELECT r.dept_name AS dept_name,
       r.major_name AS major_name,
       r.class_name AS class_name,
       SUM(r.score_level = '优秀') AS excellent_count,
       SUM(r.score_level = '良好') AS good_count,
       SUM(r.score_level = '中等') AS medium_count,
       SUM(r.score_level = '及格') AS pass_count,
       SUM(r.score_level = '不及格') AS fail_count,
       ROUND(AVG(r.total_score), 2) AS avg_score,
       MAX(r.total_score) AS max_score,
       MIN(r.total_score) AS min_score
FROM v_score_report r
WHERE r.publish_status = '已发布'
GROUP BY r.dept_name, r.major_name, r.class_name;

-- 11 答辩安排视图：向学生与教师公布
CREATE VIEW v_defense_schedule AS
SELECT g.group_id AS group_id,
       g.defense_time AS defense_time,
       g.place AS place,
       te.name AS leader_name,
       a.defense_order AS defense_order,
       p.project_no AS project_no,
       s.student_no AS student_no,
       s.name AS student_name,
       t.topic_name AS topic_name,
       t2.name AS teacher_name
FROM defense_group g
     JOIN teacher te ON g.leader_no = te.teacher_no
     JOIN defense_arrange a ON a.group_id = g.group_id
     JOIN project p ON a.project_no = p.project_no
     JOIN student s ON p.student_no = s.student_no
     JOIN topic t ON p.topic_no = t.topic_no
     JOIN teacher t2 ON p.teacher_no = t2.teacher_no;

-- 12 教师工作量视图
CREATE VIEW v_teacher_workload AS
SELECT te.teacher_no AS teacher_no,
       te.name AS teacher_name,
       te.title AS title,
       d.dept_name AS dept_name,
       (SELECT COUNT(*) FROM topic t WHERE t.applicant_no = te.teacher_no) AS topic_count,
       (SELECT COUNT(*) FROM project p WHERE p.teacher_no = te.teacher_no) AS student_count,
       (SELECT COUNT(*) FROM review r WHERE r.reviewer_no = te.teacher_no) AS review_count,
       (SELECT ROUND(AVG(r.total_score), 2) FROM v_score_report r
         WHERE r.teacher_no = te.teacher_no) AS avg_score
FROM teacher te JOIN department d ON te.dept_no = d.dept_no;

-- 13 账号视图：不含密码字段
CREATE VIEW v_user_account AS
SELECT u.user_id AS user_id,
       u.account AS account,
       u.user_type AS user_type,
       u.status AS status,
       u.created_at AS created_at,
       (SELECT GROUP_CONCAT(r.role_name SEPARATOR '、')
          FROM sys_user_role ur JOIN sys_role r ON ur.role_id = r.role_id
         WHERE ur.user_id = u.user_id) AS role_names
FROM sys_user u;

-- 14 公告视图：按发布范围展示
CREATE VIEW v_notice AS
SELECT n.notice_id AS notice_id,
       n.title AS title,
       n.content AS content,
       n.notice_type AS notice_type,
       n.scope AS scope,
       u.account AS publisher_account,
       n.publish_time AS publish_time,
       n.is_top AS is_top
FROM notice n JOIN sys_user u ON n.publisher_id = u.user_id;

-- =============================================================
-- 五、触发器（5.3 节：5 个，保证越过应用层也能保持一致）
-- =============================================================
DELIMITER $$
-- 新增学生：班级人数加 1
CREATE TRIGGER trg_student_ai AFTER INSERT ON student
FOR EACH ROW
BEGIN
    UPDATE class_info
       SET student_count = student_count + 1
     WHERE class_no = NEW.class_no;
END $$

-- 删除学生：班级人数减 1
CREATE TRIGGER trg_student_ad AFTER DELETE ON student
FOR EACH ROW
BEGIN
    UPDATE class_info
       SET student_count = student_count - 1
     WHERE class_no = OLD.class_no;
END $$

-- 学生转班：原班级减 1，新班级加 1
CREATE TRIGGER trg_student_au AFTER UPDATE ON student
FOR EACH ROW
BEGIN
    IF NEW.class_no <> OLD.class_no THEN
        UPDATE class_info
           SET student_count = student_count - 1
         WHERE class_no = OLD.class_no;
        UPDATE class_info
           SET student_count = student_count + 1
         WHERE class_no = NEW.class_no;
    END IF;
END $$

-- 材料提交前校验：阶段节点、逾期、格式
CREATE TRIGGER trg_submission_bi BEFORE INSERT ON submission
FOR EACH ROW
BEGIN
    DECLARE v_deadline DATETIME;
    DECLARE v_format VARCHAR(50);
    DECLARE v_allow TINYINT;
    DECLARE v_ext VARCHAR(10);

    SELECT deadline, allow_format, allow_late
      INTO v_deadline, v_format, v_allow
      FROM stage_node WHERE stage_id = NEW.stage_id;

    IF v_deadline IS NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = '该阶段未配置时间节点，不能提交材料';
    END IF;
    IF NEW.submit_time > v_deadline AND v_allow = 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = '已超过阶段截止时间，且该阶段不允许补交';
    END IF;
    SET v_ext = LOWER(SUBSTRING_INDEX(NEW.file_path, '.', -1));
    IF FIND_IN_SET(v_ext, v_format) = 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = '文件格式不符合该阶段允许的提交格式';
    END IF;
END $$

-- 成绩发布后锁定分项成绩与权重
CREATE TRIGGER trg_score_bu BEFORE UPDATE ON score
FOR EACH ROW
BEGIN
    IF OLD.publish_status = '已发布' AND (
           NOT (NEW.process_score <=> OLD.process_score)
        OR NOT (NEW.review_score <=> OLD.review_score)
        OR NOT (NEW.defense_score <=> OLD.defense_score)
        OR NOT (NEW.process_weight <=> OLD.process_weight)
        OR NOT (NEW.review_weight <=> OLD.review_weight)
        OR NOT (NEW.defense_weight <=> OLD.defense_weight)
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = '成绩已发布，分项成绩与权重不允许修改';
    END IF;
END $$
DELIMITER ;

-- =============================================================
-- 六、存储过程（5.3 节：3 个）
-- =============================================================
DELIMITER $$
-- 师生互选确认：锁定题目行 → 校验名额 → 更新选题 → 生成课题 → 推送消息
CREATE PROCEDURE sp_confirm_selection(
    IN p_student_no CHAR(12),
    IN p_topic_no CHAR(12),
    OUT p_result VARCHAR(50)
)
BEGIN
    DECLARE v_capacity TINYINT;
    DECLARE v_taken INT;
    DECLARE v_teacher CHAR(8);
    DECLARE v_seq INT;
    DECLARE v_project_no CHAR(14);

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_result = '互选失败：数据库异常，事务已回滚';
    END;

    START TRANSACTION;
    SELECT capacity, applicant_no
      INTO v_capacity, v_teacher
      FROM topic
     WHERE topic_no = p_topic_no AND status = '已发布'
       FOR UPDATE;
    IF v_capacity IS NULL THEN
        ROLLBACK;
        SET p_result = '互选失败：题目不存在或未发布';
    ELSE
        SELECT COUNT(*) INTO v_taken FROM project WHERE topic_no = p_topic_no;
        IF v_taken >= v_capacity THEN
            ROLLBACK;
            SET p_result = '互选失败：该题目名额已满';
        ELSE
            UPDATE topic_selection
               SET status = '已匹配', confirm_time = NOW()
             WHERE student_no = p_student_no AND topic_no = p_topic_no;
            -- 课题编号 = 年份 + 10 位序号（与 CHAR(14) 长度一致）
            SELECT IFNULL(MAX(CAST(SUBSTRING(project_no, 5) AS UNSIGNED)), 0) + 1
              INTO v_seq FROM project
             WHERE project_no LIKE CONCAT(DATE_FORMAT(NOW(), '%Y'), '%');
            SET v_project_no = CONCAT(DATE_FORMAT(NOW(), '%Y'), LPAD(v_seq, 10, '0'));
            INSERT INTO project (project_no, student_no, topic_no, teacher_no,
                                 current_stage, project_status, start_date)
            VALUES (v_project_no, p_student_no, p_topic_no, v_teacher,
                    NULL, '进行中', CURDATE());
            INSERT INTO score (project_no) VALUES (v_project_no);
            INSERT INTO message (receiver_id, content, message_type)
            SELECT s.user_id, CONCAT('您的选题已确认：', t.topic_name), '审核结果'
              FROM student s JOIN topic t ON t.topic_no = p_topic_no
             WHERE s.student_no = p_student_no;
            COMMIT;
            SET p_result = '互选成功';
        END IF;
    END IF;
END $$

-- 成绩发布：校验分项完整性 → 置为已发布 → 推送成绩通知
CREATE PROCEDURE sp_publish_score(
    IN p_project_no CHAR(14),
    OUT p_msg VARCHAR(100)
)
BEGIN
    DECLARE v_process DECIMAL(5,2);
    DECLARE v_review DECIMAL(5,2);
    DECLARE v_defense DECIMAL(5,2);
    DECLARE v_status VARCHAR(10);
    DECLARE v_total DECIMAL(5,2);
    DECLARE v_w1 DECIMAL(3,2);
    DECLARE v_w2 DECIMAL(3,2);
    DECLARE v_w3 DECIMAL(3,2);

    SELECT process_score, review_score, defense_score, publish_status,
           process_weight, review_weight, defense_weight
      INTO v_process, v_review, v_defense, v_status, v_w1, v_w2, v_w3
      FROM score WHERE project_no = p_project_no;

    IF v_status IS NULL THEN
        SET p_msg = '成绩记录不存在';
    ELSEIF v_status = '已发布' THEN
        SET p_msg = '成绩已发布，不能重复发布';
    ELSEIF v_process IS NULL OR v_review IS NULL OR v_defense IS NULL THEN
        SET p_msg = '分项成绩不完整，不能发布';
    ELSE
        START TRANSACTION;
        UPDATE score SET publish_status = '已发布' WHERE project_no = p_project_no;
        SET v_total = fn_total_score(v_process, v_review, v_defense, v_w1, v_w2, v_w3);
        INSERT INTO message (receiver_id, content, message_type)
        SELECT s.user_id,
               CONCAT('您的毕业设计成绩已发布，总评 ', v_total, ' 分（',
                      fn_score_level(v_total), '），请登录系统查看。'),
               '成绩通知'
          FROM project p JOIN student s ON p.student_no = s.student_no
         WHERE p.project_no = p_project_no;
        COMMIT;
        SET p_msg = '成绩发布成功';
    END IF;
END $$

-- 截止提醒：三天内到期且未提交的课题，逐条生成提醒消息
CREATE PROCEDURE sp_overdue_notice()
BEGIN
    INSERT INTO message (receiver_id, content, message_type)
    SELECT s.user_id,
           CONCAT('【截止提醒】', st.stage_name, '阶段将于 ',
                  DATE_FORMAT(n.deadline, '%m-%d %H:%i'),
                  ' 截止，您尚未提交材料，请尽快完成并与指导教师沟通。'),
           '截止提醒'
      FROM project p
           JOIN student s ON p.student_no = s.student_no
           JOIN topic t ON p.topic_no = t.topic_no
           JOIN stage st ON st.cohort = t.cohort
           JOIN stage_node n ON n.stage_id = st.stage_id
     WHERE n.deadline BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 3 DAY)
       AND NOT EXISTS (SELECT 1 FROM submission sb
                        WHERE sb.project_no = p.project_no
                          AND sb.stage_id = st.stage_id);
END $$
DELIMITER ;
