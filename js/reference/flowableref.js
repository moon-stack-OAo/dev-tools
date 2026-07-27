const FLOWABLE_REF_DATA = [
  {
    cat: 'RuntimeService 流程实例',
    items: [
      {
        method: 'startProcessInstanceByKey(key)',
        desc: '按定义 key 启动流程（取最新版本）',
        scenario: '业务侧发起审批：只关心流程定义 key，始终用最新部署版本。',
        examples: [
          'ProcessInstance pi = runtimeService.startProcessInstanceByKey("leave");',
          'String procInstId = pi.getId();',
        ],
      },
      {
        method: 'startProcessInstanceByKey(key, businessKey)',
        desc: '启动并绑定业务主键 businessKey',
        scenario: '关联业务单据（订单号/请假单号），便于按业务主键反查流程。',
        examples: [
          'runtimeService.startProcessInstanceByKey("leave", "LEAVE-2026-001");',
          'runtimeService.createProcessInstanceQuery()\n    .processInstanceBusinessKey("LEAVE-2026-001")\n    .singleResult();',
        ],
      },
      {
        method: 'startProcessInstanceByKey(key, variables)',
        desc: '启动并传入流程变量 Map',
        scenario: '启动时写入申请人、天数、金额等，供网关条件与任务表单使用。',
        examples: [
          'Map<String, Object> vars = new HashMap<>();\nvars.put("applicant", "zhangsan");\nvars.put("days", 3);\nruntimeService.startProcessInstanceByKey("leave", vars);',
        ],
      },
      {
        method: 'startProcessInstanceByKey(key, businessKey, variables)',
        desc: '启动 + businessKey + 变量',
        scenario: '最常用启动方式：业务主键 + 初始变量一次完成。',
        examples: [
          'runtimeService.startProcessInstanceByKey(\n    "leave", "LEAVE-001",\n    Map.of("applicant", "zhangsan", "days", 3));',
        ],
      },
      {
        method: 'startProcessInstanceById(processDefinitionId)',
        desc: '按流程定义 ID 启动（固定版本）',
        scenario: '灰度/兼容旧版本：必须跑指定部署版本，而不是 latest。',
        examples: [
          'String defId = "leave:2:10012";\nruntimeService.startProcessInstanceById(defId);',
        ],
      },
      {
        method: 'startProcessInstanceByMessage(messageName)',
        desc: '通过消息启动（需消息开始事件）',
        scenario: '外部系统发消息触发流程（消息开始事件），而非直接 startByKey。',
        examples: [
          'runtimeService.startProcessInstanceByMessage("orderPaidMsg");',
          'runtimeService.startProcessInstanceByMessage("orderPaidMsg", vars);',
        ],
      },
      {
        method: 'deleteProcessInstance(processInstanceId, reason)',
        desc: '删除运行中实例（含任务、变量）',
        scenario: '作废进行中的流程（测试数据清理、业务撤销）。历史是否保留取决于 history 级别。',
        examples: [
          'runtimeService.deleteProcessInstance(procInstId, "用户撤销申请");',
        ],
      },
      {
        method: 'suspendProcessInstanceById(id)',
        desc: '挂起实例（任务不可办理）',
        scenario: '临时冻结流程（风控审核、等待外部资料），暂停办理。',
        examples: ['runtimeService.suspendProcessInstanceById(procInstId);'],
      },
      {
        method: 'activateProcessInstanceById(id)',
        desc: '激活已挂起实例',
        scenario: '冻结条件解除后恢复办理。',
        examples: ['runtimeService.activateProcessInstanceById(procInstId);'],
      },
      {
        method: 'createProcessInstanceQuery()',
        desc: '查询运行中流程实例',
        scenario: '按定义 key、业务主键、启动人等过滤运行中实例。',
        examples: [
          'List<ProcessInstance> list = runtimeService.createProcessInstanceQuery()\n    .processDefinitionKey("leave")\n    .active()\n    .list();',
          'ProcessInstance pi = runtimeService.createProcessInstanceQuery()\n    .processInstanceBusinessKey("LEAVE-001")\n    .singleResult();',
        ],
      },
      {
        method: 'getVariables(executionId)',
        desc: '获取执行上全部变量',
        scenario: '调试或展示流程上下文；executionId 通常用 processInstanceId。',
        examples: [
          'Map<String, Object> vars = runtimeService.getVariables(procInstId);',
          'Object days = runtimeService.getVariable(procInstId, "days");',
        ],
      },
      {
        method: 'setVariable(executionId, name, value)',
        desc: '设置流程/执行变量',
        scenario: '运行中补充或修正变量（注意并发与事务边界）。',
        examples: [
          'runtimeService.setVariable(procInstId, "days", 5);',
          'runtimeService.setVariables(procInstId, Map.of("level", "A", "amount", 1000));',
        ],
      },
      {
        method: 'removeVariable(executionId, variableName)',
        desc: '删除变量',
        scenario: '清理临时变量或敏感字段。',
        examples: ['runtimeService.removeVariable(procInstId, "tmpToken");'],
      },
      {
        method: 'signal(executionId)',
        desc: '触发接收任务/中间信号等待的执行',
        scenario: '流程停在 receiveTask 或中间信号捕获，外部事件到达后继续。',
        examples: [
          '// 先查等待中的 execution\nExecution ex = runtimeService.createExecutionQuery()\n    .processInstanceId(procInstId)\n    .activityId("waitExternal")\n    .singleResult();\nruntimeService.signal(ex.getId());',
        ],
      },
      {
        method: 'messageEventReceived(messageName, executionId)',
        desc: '向等待消息的执行投递消息',
        scenario: '中间消息捕获事件：外部系统回调时投递消息名 + execution。',
        examples: [
          'runtimeService.messageEventReceived("paymentCallback", executionId);',
          'runtimeService.messageEventReceived("paymentCallback", executionId, vars);',
        ],
      },
      {
        method: 'trigger(executionId)',
        desc: '触发等待状态的执行（如 ReceiveTask）',
        scenario: 'Flowable 推荐用 trigger 唤醒 receiveTask（比 signal 更语义化）。',
        examples: [
          'runtimeService.trigger(executionId);',
          'runtimeService.trigger(executionId, Map.of("result", "OK"));',
        ],
      },
      {
        method: 'createChangeActivityStateBuilder()',
        desc: '运行时跳转/迁移活动（谨慎使用）',
        scenario: '运维纠错：当前节点卡死，需跳到指定 userTask（会破坏审计一致性，慎用）。',
        examples: [
          'runtimeService.createChangeActivityStateBuilder()\n    .processInstanceId(procInstId)\n    .moveActivityIdTo("userTask1", "userTask3")\n    .changeState();',
        ],
      },
    ],
  },
  {
    cat: 'TaskService 任务操作',
    items: [
      {
        method: 'createTaskQuery()',
        desc: '查询待办任务（可链式过滤）',
        scenario: '待办中心入口：按办理人、候选人、流程 key 等组合查询。',
        examples: [
          'List<Task> tasks = taskService.createTaskQuery()\n    .taskAssignee("zhangsan")\n    .orderByTaskCreateTime().desc()\n    .list();',
        ],
      },
      {
        method: 'claim(taskId, userId)',
        desc: '签收候选任务（设 assignee）',
        scenario: '候选组任务被某人抢单签收，签收后他人不可再 claim。',
        examples: ['taskService.claim(taskId, "zhangsan");'],
      },
      {
        method: 'unclaim(taskId)',
        desc: '取消签收，清空 assignee',
        scenario: '签收后无法处理，退回候选池供他人领取。',
        examples: ['taskService.unclaim(taskId);'],
      },
      {
        method: 'complete(taskId)',
        desc: '完成任务（无变量）',
        scenario: '简单确认类任务，无需写审批意见变量。',
        examples: ['taskService.complete(taskId);'],
      },
      {
        method: 'complete(taskId, variables)',
        desc: '完成任务并写入流程变量',
        scenario: '审批通过/驳回时写入 approved、comment 等，驱动网关分支。',
        examples: [
          'taskService.complete(taskId, Map.of(\n    "approved", true,\n    "comment", "同意"));',
        ],
      },
      {
        method: 'complete(taskId, variables, localScope)',
        desc: 'localScope=true 时变量仅任务本地',
        scenario: '变量只需本任务可见、不污染流程级变量时用 localScope。',
        examples: [
          'taskService.complete(taskId, Map.of("tmp", 1), true);',
        ],
      },
      {
        method: 'delegateTask(taskId, userId)',
        desc: '委派：owner 保留，assignee 变为被委派人',
        scenario: 'A 把任务委派给 B 协助处理，完成后需 resolve 归还 A。',
        examples: [
          'taskService.delegateTask(taskId, "lisi");\n// owner=原办理人, assignee=lisi, delegation=PENDING',
        ],
      },
      {
        method: 'resolveTask(taskId)',
        desc: '被委派人处理完后归还 owner',
        scenario: '被委派人处理完毕，任务回到 owner 继续办理/完成。',
        examples: [
          'taskService.resolveTask(taskId);\n// 或带变量：taskService.resolveTask(taskId, vars);',
        ],
      },
      {
        method: 'setAssignee(taskId, userId)',
        desc: '直接指定办理人',
        scenario: '管理员转办/改派，不走 claim 语义。',
        examples: ['taskService.setAssignee(taskId, "wangwu");'],
      },
      {
        method: 'setOwner(taskId, userId)',
        desc: '设置任务所有者',
        scenario: '标识任务归属（与 assignee 办理人区分），常用于委派场景。',
        examples: ['taskService.setOwner(taskId, "zhangsan");'],
      },
      {
        method: 'addCandidateUser(taskId, userId)',
        desc: '添加候选用户',
        scenario: '动态增加可签收用户（会签组外临时加人）。',
        examples: ['taskService.addCandidateUser(taskId, "zhaoliu");'],
      },
      {
        method: 'addCandidateGroup(taskId, groupId)',
        desc: '添加候选组',
        scenario: '按角色/部门投放候选任务，如 hr / manager。',
        examples: ['taskService.addCandidateGroup(taskId, "hr");'],
      },
      {
        method: 'deleteCandidateUser / deleteCandidateGroup',
        desc: '移除候选用户/组',
        scenario: '纠正错误投放或人员调出后清理候选人。',
        examples: [
          'taskService.deleteCandidateUser(taskId, "zhaoliu");',
          'taskService.deleteCandidateGroup(taskId, "hr");',
        ],
      },
      {
        method: 'setDueDate(taskId, date)',
        desc: '设置任务到期时间',
        scenario: 'SLA/超时提醒：配合边界定时器或定时扫 dueDate。',
        examples: [
          'taskService.setDueDate(taskId,\n    Date.from(Instant.now().plus(2, ChronoUnit.DAYS)));',
        ],
      },
      {
        method: 'setPriority(taskId, priority)',
        desc: '设置优先级（默认 50）',
        scenario: '待办列表按紧急程度排序（数值越大通常越优先，视业务约定）。',
        examples: ['taskService.setPriority(taskId, 80);'],
      },
      {
        method: 'createAttachment(...)',
        desc: '为任务/流程添加附件',
        scenario: '上传审批材料（合同扫描件）挂到任务或流程实例。',
        examples: [
          'taskService.createAttachment(\n    "url", taskId, procInstId,\n    "合同扫描件", "pdf",\n    "https://files.example.com/a.pdf");',
        ],
      },
      {
        method: 'addComment(taskId, processInstanceId, message)',
        desc: '添加任务评论',
        scenario: '记录审批意见，历史可查。',
        examples: [
          'taskService.addComment(taskId, procInstId, "材料不全，请补充");',
        ],
      },
      {
        method: 'getVariablesLocal(taskId)',
        desc: '获取任务本地变量',
        scenario: '读取仅挂在任务上的局部变量（非流程级）。',
        examples: [
          'Map<String, Object> local = taskService.getVariablesLocal(taskId);',
        ],
      },
    ],
  },
  {
    cat: 'RepositoryService 部署定义',
    items: [
      {
        method: 'createDeployment().addClasspathResource(...).deploy()',
        desc: '部署 BPMN / 表单等资源',
        scenario: '应用启动或运维发布新流程定义。',
        examples: [
          'Deployment d = repositoryService.createDeployment()\n    .addClasspathResource("processes/leave.bpmn20.xml")\n    .name("leave-v2")\n    .deploy();',
        ],
      },
      {
        method: 'createDeployment().name(name).key(key).deploy()',
        desc: '指定部署名称与 key',
        scenario: '便于按部署名称/key 检索与回滚。',
        examples: [
          'repositoryService.createDeployment()\n    .name("请假流程 2026Q1")\n    .key("leave-deploy")\n    .addClasspathResource("processes/leave.bpmn20.xml")\n    .deploy();',
        ],
      },
      {
        method: 'deleteDeployment(deploymentId, cascade)',
        desc: '删除部署；cascade=true 连带实例',
        scenario: '下线错误版本；cascade 会删运行/历史相关数据，生产慎用。',
        examples: [
          'repositoryService.deleteDeployment(deploymentId, false);',
          'repositoryService.deleteDeployment(deploymentId, true); // 级联',
        ],
      },
      {
        method: 'createProcessDefinitionQuery()',
        desc: '查询流程定义',
        scenario: '列出某 key 的全部版本，或取 latest。',
        examples: [
          'ProcessDefinition def = repositoryService.createProcessDefinitionQuery()\n    .processDefinitionKey("leave")\n    .latestVersion()\n    .singleResult();',
        ],
      },
      {
        method: 'suspendProcessDefinitionById(id)',
        desc: '挂起定义（不可新启实例）',
        scenario: '停用某版本：禁止新发起，已有实例可按参数决定是否挂起。',
        examples: [
          'repositoryService.suspendProcessDefinitionById(defId);',
          'repositoryService.suspendProcessDefinitionByKey("leave", true, null);',
        ],
      },
      {
        method: 'activateProcessDefinitionById(id)',
        desc: '激活流程定义',
        scenario: '重新开放某定义版本的发起权限。',
        examples: ['repositoryService.activateProcessDefinitionById(defId);'],
      },
      {
        method: 'getProcessModel(processDefinitionId)',
        desc: '获取 BPMN XML 输入流',
        scenario: '导出/预览流程 XML。',
        examples: [
          'InputStream is = repositoryService.getProcessModel(defId);',
        ],
      },
      {
        method: 'getProcessDiagram(processDefinitionId)',
        desc: '获取流程图资源（若部署时带图）',
        scenario: '前端展示流程图 PNG（需部署时包含 diagram 资源）。',
        examples: [
          'InputStream diagram = repositoryService.getProcessDiagram(defId);',
        ],
      },
      {
        method: 'getBpmnModel(processDefinitionId)',
        desc: '获取内存 BpmnModel 对象',
        scenario: '程序化解析节点、连线、扩展属性。',
        examples: [
          'BpmnModel model = repositoryService.getBpmnModel(defId);\nProcess process = model.getMainProcess();',
        ],
      },
    ],
  },
  {
    cat: 'HistoryService 历史',
    items: [
      {
        method: 'createHistoricProcessInstanceQuery()',
        desc: '历史流程实例（含已结束）',
        scenario: '已办/办结列表、按业务主键查历史。',
        examples: [
          'List<HistoricProcessInstance> list = historyService\n    .createHistoricProcessInstanceQuery()\n    .processDefinitionKey("leave")\n    .finished()\n    .orderByProcessInstanceEndTime().desc()\n    .list();',
        ],
      },
      {
        method: 'createHistoricTaskInstanceQuery()',
        desc: '历史任务查询',
        scenario: '我的已办、某流程的审批轨迹。',
        examples: [
          'historyService.createHistoricTaskInstanceQuery()\n    .taskAssignee("zhangsan")\n    .finished()\n    .list();',
          'historyService.createHistoricTaskInstanceQuery()\n    .processInstanceId(procInstId)\n    .orderByHistoricTaskInstanceEndTime().asc()\n    .list();',
        ],
      },
      {
        method: 'createHistoricActivityInstanceQuery()',
        desc: '历史活动节点查询',
        scenario: '高亮已走节点、统计某节点耗时。',
        examples: [
          'historyService.createHistoricActivityInstanceQuery()\n    .processInstanceId(procInstId)\n    .activityType("userTask")\n    .list();',
        ],
      },
      {
        method: 'createHistoricVariableInstanceQuery()',
        desc: '历史变量查询',
        scenario: '审计：流程结束后仍可查变量最终值。',
        examples: [
          'historyService.createHistoricVariableInstanceQuery()\n    .processInstanceId(procInstId)\n    .variableName("approved")\n    .singleResult();',
        ],
      },
      {
        method: 'deleteHistoricProcessInstance(processInstanceId)',
        desc: '删除历史流程数据',
        scenario: '合规清理/测试库瘦身（不可恢复）。',
        examples: [
          'historyService.deleteHistoricProcessInstance(procInstId);',
        ],
      },
      {
        method: 'deleteHistoricTaskInstance(taskId)',
        desc: '删除历史任务',
        scenario: '精细清理单条历史任务记录。',
        examples: ['historyService.deleteHistoricTaskInstance(taskId);'],
      },
    ],
  },
  {
    cat: 'ManagementService / IdentityService',
    items: [
      {
        method: 'createJobQuery() / executeJob(jobId)',
        desc: '查询/执行异步作业、定时器',
        scenario: '异步服务任务失败重试、手动触发定时器作业。',
        examples: [
          'List<Job> jobs = managementService.createJobQuery()\n    .processInstanceId(procInstId)\n    .list();\nmanagementService.executeJob(jobs.get(0).getId());',
        ],
      },
      {
        method: 'moveTimerToExecutableJob(jobId)',
        desc: '将定时作业提前为可执行',
        scenario: '测试环境不想等 timer 到期，手动推进。',
        examples: [
          'Job timer = managementService.createTimerJobQuery()\n    .processInstanceId(procInstId)\n    .singleResult();\nJob executable = managementService.moveTimerToExecutableJob(timer.getId());\nmanagementService.executeJob(executable.getId());',
        ],
      },
      {
        method: 'getTableName(Class) / getTableMetaData',
        desc: '查看引擎表名与元数据',
        scenario: '排查自定义 SQL / 表前缀配置是否生效。',
        examples: [
          'String table = managementService.getTableName(Task.class);\n// 例如 ACT_RU_TASK',
        ],
      },
      {
        method: 'setAuthenticatedUserId(userId)',
        desc: '设置当前认证用户（启动人/办理人上下文）',
        scenario: 'startUserId、任务默认办理人等依赖认证用户上下文。',
        examples: [
          'try {\n    identityService.setAuthenticatedUserId("zhangsan");\n    runtimeService.startProcessInstanceByKey("leave");\n} finally {\n    identityService.setAuthenticatedUserId(null);\n}',
        ],
      },
      {
        method: 'newUser / saveUser / createUserQuery',
        desc: '内置用户管理（可选，常对接外部）',
        scenario: 'Demo 或内置身份库；生产多对接 SSO/HR。',
        examples: [
          'User u = identityService.newUser("zhangsan");\nu.setFirstName("张");\nu.setLastName("三");\nidentityService.saveUser(u);',
        ],
      },
      {
        method: 'newGroup / saveGroup / createMembership',
        desc: '内置组与成员关系',
        scenario: '维护候选组与用户关系（内置 Identity）。',
        examples: [
          'Group g = identityService.newGroup("hr");\ng.setName("人事");\nidentityService.saveGroup(g);\nidentityService.createMembership("zhangsan", "hr");',
        ],
      },
    ],
  },
  {
    cat: '常用查询链式 API',
    items: [
      {
        method: 'taskAssignee(userId)',
        desc: '我的待办（已签收）',
        scenario: '只看待办中已指定给我的任务。',
        examples: [
          'taskService.createTaskQuery().taskAssignee("zhangsan").list();',
        ],
      },
      {
        method: 'taskCandidateUser(userId)',
        desc: '我是候选人的任务',
        scenario: '候选池：尚未 claim，我可作为候选人签收。',
        examples: [
          'taskService.createTaskQuery().taskCandidateUser("zhangsan").list();',
        ],
      },
      {
        method: 'taskCandidateGroupIn(groups)',
        desc: '候选组在给定列表中',
        scenario: '用户属于多个角色时，一次查出所有候选组任务。',
        examples: [
          'taskService.createTaskQuery()\n    .taskCandidateGroupIn(List.of("hr", "manager"))\n    .list();',
        ],
      },
      {
        method: 'taskCandidateOrAssigned(userId)',
        desc: '候选或已分配给我（常用综合待办）',
        scenario: '待办中心最常用：已签收 + 可签收合并。',
        examples: [
          'taskService.createTaskQuery()\n    .taskCandidateOrAssigned("zhangsan")\n    .list();',
        ],
      },
      {
        method: 'processInstanceBusinessKey(key)',
        desc: '按业务主键过滤',
        scenario: '从业务单号反查流程/任务。',
        examples: [
          'runtimeService.createProcessInstanceQuery()\n    .processInstanceBusinessKey("LEAVE-001")\n    .singleResult();',
        ],
      },
      {
        method: 'processDefinitionKey(key)',
        desc: '按流程定义 key 过滤',
        scenario: '只查某类业务流程（leave / order / refund）。',
        examples: [
          'taskService.createTaskQuery()\n    .processDefinitionKey("leave")\n    .taskAssignee("zhangsan")\n    .list();',
        ],
      },
      {
        method: 'active() / suspended() / finished()',
        desc: '运行中 / 挂起 / 已结束',
        scenario: '区分进行中与办结、过滤挂起实例。',
        examples: [
          'runtimeService.createProcessInstanceQuery().active().count();',
          'historyService.createHistoricProcessInstanceQuery().finished().list();',
        ],
      },
      {
        method: 'orderByTaskCreateTime().desc().list()',
        desc: '排序并 list / listPage / count / singleResult',
        scenario: '分页待办、统计数量、取唯一结果。',
        examples: [
          'taskService.createTaskQuery()\n    .taskAssignee("zhangsan")\n    .orderByTaskCreateTime().desc()\n    .listPage(0, 20);',
          'long n = taskService.createTaskQuery().taskAssignee("zhangsan").count();',
        ],
      },
      {
        method: 'includeProcessVariables()',
        desc: '结果带出流程变量（注意性能）',
        scenario: '列表直接展示金额/标题，避免 N+1 再查变量。',
        examples: [
          'taskService.createTaskQuery()\n    .taskAssignee("zhangsan")\n    .includeProcessVariables()\n    .list();',
        ],
      },
      {
        method: 'taskVariableValueEquals(name, value)',
        desc: '按任务变量过滤',
        scenario: '按任务本地变量筛选（如紧急标记）。',
        examples: [
          'taskService.createTaskQuery()\n    .taskVariableValueEquals("urgent", true)\n    .list();',
        ],
      },
    ],
  },
  {
    cat: '监听器',
    items: [
      {
        method: 'ExecutionListener.notify(DelegateExecution)',
        desc: '执行监听：start / end / take（连线）',
        scenario: '节点进入/离开时记日志、写业务表、发消息。',
        examples: [
          'public class AuditListener implements ExecutionListener {\n  public void notify(DelegateExecution execution) {\n    log.info("{} {}", execution.getEventName(), execution.getCurrentActivityId());\n  }\n}',
        ],
      },
      {
        method: 'TaskListener.notify(DelegateTask)',
        desc: '任务监听：create / assignment / complete / delete',
        scenario: '任务创建时设候选人、完成时发站内信。',
        examples: [
          'public class TaskCreateListener implements TaskListener {\n  public void notify(DelegateTask task) {\n    if ("create".equals(task.getEventName())) {\n      task.addCandidateGroup("hr");\n    }\n  }\n}',
        ],
      },
      {
        method: 'class / expression / delegateExpression',
        desc: '监听器实现方式：类名 / 表达式 / Spring Bean',
        scenario: '选实现绑定方式：硬编码类名、UEL 表达式或 Spring Bean。',
        examples: [
          '<!-- class -->\n<flowable:executionListener event="start" class="com.demo.AuditListener"/>',
          '<!-- expression -->\n<flowable:executionListener event="end" expression="${auditBean.onEnd(execution)}"/>',
          '<!-- delegateExpression 推荐 -->\n<flowable:taskListener event="create" delegateExpression="${taskCreateListener}"/>',
        ],
      },
      {
        method: 'delegateExpression="${myListener}"',
        desc: '推荐：Spring 容器 Bean，可注入依赖',
        scenario: 'Spring Boot 项目首选，便于 @Autowired 业务 Service。',
        examples: [
          '@Component("taskCreateListener")\npublic class TaskCreateListener implements TaskListener { ... }',
          '<flowable:taskListener event="create" delegateExpression="${taskCreateListener}"/>',
        ],
      },
      {
        method: 'event="create"',
        desc: '任务创建时触发（设候选人/通知）',
        scenario: '新待办生成瞬间：加候选组、推送消息。',
        examples: [
          '<flowable:taskListener event="create" delegateExpression="${notifyListener}"/>',
        ],
      },
      {
        method: 'event="assignment"',
        desc: '办理人变更时触发',
        scenario: 'claim / setAssignee / 委派导致办理人变化时通知。',
        examples: [
          '<flowable:taskListener event="assignment" delegateExpression="${assignListener}"/>',
        ],
      },
      {
        method: 'event="complete"',
        desc: '任务完成时触发',
        scenario: '审批完成写业务状态、记审计。',
        examples: [
          '<flowable:taskListener event="complete" delegateExpression="${completeListener}"/>',
        ],
      },
      {
        method: 'event="start" / event="end"',
        desc: '执行监听：节点进入/离开',
        scenario: '服务节点前后埋点、计时。',
        examples: [
          '<flowable:executionListener event="start" delegateExpression="${enterListener}"/>',
          '<flowable:executionListener event="end" delegateExpression="${leaveListener}"/>',
        ],
      },
      {
        method: 'JavaDelegate.execute(DelegateExecution)',
        desc: '服务任务委托类入口',
        scenario: 'serviceTask 调用 Java 逻辑（同步）。',
        examples: [
          'public class DeductStockDelegate implements JavaDelegate {\n  public void execute(DelegateExecution execution) {\n    String orderId = (String) execution.getVariable("orderId");\n    // 扣库存...\n  }\n}',
          '<serviceTask id="deduct" flowable:class="com.demo.DeductStockDelegate"/>',
        ],
      },
      {
        method: 'ActivityBehavior',
        desc: '自定义活动行为（高级扩展）',
        scenario: '需要完全自定义节点语义时（少用，优先 JavaDelegate）。',
        examples: [
          '// 实现 ActivityBehavior / 继承 AbstractBpmnActivityBehavior\n// 在 BPMN 中通过自定义解析或扩展属性挂载',
        ],
      },
    ],
  },
  {
    cat: 'BPMN 元素',
    items: [
      {
        method: 'startEvent / endEvent',
        desc: '开始/结束事件；可带 none/message/timer/error 等',
        scenario: '流程入口与出口；消息/定时启动、错误结束等。',
        examples: [
          '<startEvent id="start"/>\n<endEvent id="end"/>',
          '<startEvent id="msgStart">\n  <messageEventDefinition messageRef="orderPaidMsg"/>\n</startEvent>',
        ],
      },
      {
        method: 'userTask',
        desc: '用户任务：assignee / candidateUsers / candidateGroups',
        scenario: '人工审批节点，配置办理人或候选。',
        examples: [
          '<userTask id="deptApprove" name="部门审批"\n  flowable:assignee="${manager}"/>',
          '<userTask id="hrApprove" name="人事审批"\n  flowable:candidateGroups="hr"/>',
        ],
      },
      {
        method: 'serviceTask',
        desc: '服务任务：class / delegateExpression / expression',
        scenario: '自动节点调用 Java / Spring Bean。',
        examples: [
          '<serviceTask id="svc" flowable:delegateExpression="${orderServiceDelegate}"/>',
          '<serviceTask id="svc2" flowable:expression="${orderService.pay(execution)}"/>',
        ],
      },
      {
        method: 'scriptTask',
        desc: '脚本任务：javascript / groovy 等',
        scenario: '轻量计算写变量（生产更推荐 JavaDelegate 便于测试）。',
        examples: [
          '<scriptTask id="calc" scriptFormat="javascript">\n  <script>execution.setVariable("tax", amount * 0.06);</script>\n</scriptTask>',
        ],
      },
      {
        method: 'receiveTask',
        desc: '接收任务：等待外部 trigger/signal',
        scenario: '等待支付回调、第三方系统通知后再往下走。',
        examples: [
          '<receiveTask id="waitPay" name="等待支付"/>',
          '// 回调：runtimeService.trigger(executionId);',
        ],
      },
      {
        method: 'manualTask / businessRuleTask',
        desc: '手工任务 / 业务规则任务',
        scenario: '文档性手工步骤；或对接 DMN 规则引擎。',
        examples: [
          '<manualTask id="offlineSign" name="线下签章"/>',
          '<businessRuleTask id="rules" flowable:rules="discountRule"/>',
        ],
      },
      {
        method: 'exclusiveGateway (XOR)',
        desc: '排他网关：条件互斥，走一条出线',
        scenario: '审批通过/驳回二选一。',
        examples: [
          '<exclusiveGateway id="gw"/>\n<sequenceFlow sourceRef="gw" targetRef="pass">\n  <conditionExpression>${approved == true}</conditionExpression>\n</sequenceFlow>\n<sequenceFlow sourceRef="gw" targetRef="reject">\n  <conditionExpression>${approved == false}</conditionExpression>\n</sequenceFlow>',
        ],
      },
      {
        method: 'parallelGateway (AND)',
        desc: '并行网关：分叉全走、汇合全到',
        scenario: '会签前并行多部门处理，全部完成再汇合。',
        examples: [
          '<!-- fork -->\n<parallelGateway id="fork"/>\n<!-- join -->\n<parallelGateway id="join"/>',
        ],
      },
      {
        method: 'inclusiveGateway (OR)',
        desc: '包容网关：满足条件的多条可并行',
        scenario: '按条件走 1~N 条分支，再包容汇合。',
        examples: [
          '<inclusiveGateway id="orFork"/>\n<sequenceFlow sourceRef="orFork" targetRef="a">\n  <conditionExpression>${needLegal}</conditionExpression>\n</sequenceFlow>',
        ],
      },
      {
        method: 'eventBasedGateway',
        desc: '事件网关：等待后续事件先到者',
        scenario: '等待消息或定时，谁先到走谁。',
        examples: [
          '<eventBasedGateway id="ebgw"/>\n<!-- 后接 intermediateCatchEvent: message / timer -->',
        ],
      },
      {
        method: 'subProcess / callActivity',
        desc: '嵌入子流程 / 调用外部流程定义',
        scenario: '复用子流程；callActivity 调用独立 processDefinitionKey。',
        examples: [
          '<callActivity id="call" calledElement="subApprove"\n  flowable:inheritVariables="true"/>',
        ],
      },
      {
        method: 'boundaryEvent',
        desc: '边界事件：超时、错误、消息、信号等附着节点',
        scenario: '任务超时自动升级、服务错误边界捕获。',
        examples: [
          '<boundaryEvent id="timeout" attachedToRef="userTask1" cancelActivity="true">\n  <timerEventDefinition>\n    <timeDuration>PT24H</timeDuration>\n  </timerEventDefinition>\n</boundaryEvent>',
        ],
      },
      {
        method: 'intermediateCatchEvent / intermediateThrowEvent',
        desc: '中间捕获/抛出事件',
        scenario: '流程中途等消息/定时；或抛信号给其他流程。',
        examples: [
          '<intermediateCatchEvent id="catchMsg">\n  <messageEventDefinition messageRef="paid"/>\n</intermediateCatchEvent>',
        ],
      },
      {
        method: 'sequenceFlow + conditionExpression',
        desc: '连线条件：${approved == true}',
        scenario: '网关出线或条件流控制走向。',
        examples: [
          '<sequenceFlow id="toPass" sourceRef="gw" targetRef="pass">\n  <conditionExpression xsi:type="tFormalExpression">\n    ${approved == true}\n  </conditionExpression>\n</sequenceFlow>',
        ],
      },
      {
        method: 'multiInstanceLoopCharacteristics',
        desc: '会签/或签：parallel / sequential + completionCondition',
        scenario: '多人会签：全部通过或过半通过。',
        examples: [
          '<userTask id="countersign" name="会签">\n  <multiInstanceLoopCharacteristics isSequential="false"\n      flowable:collection="${assigneeList}" flowable:elementVariable="assignee">\n    <completionCondition>${nrOfCompletedInstances/nrOfInstances &gt;= 0.5}</completionCondition>\n  </multiInstanceLoopCharacteristics>\n</userTask>',
        ],
      },
      {
        method: 'formKey / formProperty',
        desc: '外挂表单标识或内置表单字段',
        scenario: '前端根据 formKey 渲染自定义表单。',
        examples: [
          '<userTask id="apply" flowable:formKey="leave/apply"/>',
        ],
      },
    ],
  },
  {
    cat: '表前缀 ACT_* 说明',
    items: [
      {
        method: 'ACT_RE_*',
        desc: 'Repository 仓库：流程定义与部署静态资源',
        scenario: '查部署、定义版本时看 RE 表。',
        examples: [
          '-- 最新 leave 定义\nSELECT * FROM ACT_RE_PROCDEF\n WHERE KEY_ = \'leave\' ORDER BY VERSION_ DESC;',
        ],
      },
      {
        method: 'ACT_RE_DEPLOYMENT',
        desc: '部署记录',
        scenario: '一次 deploy() 一条记录。',
        examples: ['SELECT * FROM ACT_RE_DEPLOYMENT ORDER BY DEPLOY_TIME_ DESC;'],
      },
      {
        method: 'ACT_RE_PROCDEF',
        desc: '流程定义（key、版本、资源名）',
        scenario: 'KEY_ + VERSION_ 唯一确定一个定义版本。',
        examples: [
          'SELECT ID_, KEY_, VERSION_, SUSPENSION_STATE_\n  FROM ACT_RE_PROCDEF WHERE KEY_ = \'leave\';',
        ],
      },
      {
        method: 'ACT_RE_MODEL',
        desc: '模型（设计器相关，可选）',
        scenario: 'Flowable Modeler 存模型元数据。',
        examples: ['SELECT * FROM ACT_RE_MODEL;'],
      },
      {
        method: 'ACT_RU_*',
        desc: 'Runtime 运行时：仅运行中数据，结束后清理',
        scenario: '排查卡住流程、当前任务、变量看 RU 表。',
        examples: [
          'SELECT * FROM ACT_RU_EXECUTION WHERE PROC_INST_ID_ = ?;',
        ],
      },
      {
        method: 'ACT_RU_EXECUTION',
        desc: '执行实例（流程/分支 token）',
        scenario: '并行分支会有多条 execution；父流程实例 ID 在 PROC_INST_ID_。',
        examples: [
          'SELECT ID_, ACT_ID_, IS_ACTIVE_, PARENT_ID_\n  FROM ACT_RU_EXECUTION WHERE PROC_INST_ID_ = ?;',
        ],
      },
      {
        method: 'ACT_RU_TASK',
        desc: '运行中用户任务',
        scenario: '当前待办落在此表；ASSIGNEE_ 为空表示仅候选。',
        examples: [
          'SELECT ID_, NAME_, ASSIGNEE_, CREATE_TIME_\n  FROM ACT_RU_TASK WHERE PROC_INST_ID_ = ?;',
        ],
      },
      {
        method: 'ACT_RU_VARIABLE',
        desc: '运行时变量',
        scenario: '流程/任务变量当前值；大对象可能在 BYTEARRAY。',
        examples: [
          'SELECT NAME_, TYPE_, TEXT_, LONG_\n  FROM ACT_RU_VARIABLE WHERE PROC_INST_ID_ = ?;',
        ],
      },
      {
        method: 'ACT_RU_IDENTITYLINK',
        desc: '任务/流程的候选人、候选组、参与者',
        scenario: 'candidate / assignee / owner 关系。',
        examples: [
          'SELECT TYPE_, USER_ID_, GROUP_ID_\n  FROM ACT_RU_IDENTITYLINK WHERE TASK_ID_ = ?;',
        ],
      },
      {
        method: 'ACT_RU_JOB / ACT_RU_TIMER_JOB / ACT_RU_DEADLETTER_JOB',
        desc: '异步作业 / 定时 / 死信作业',
        scenario: '异步失败进死信；定时器未到期在 TIMER_JOB。',
        examples: [
          'SELECT ID_, RETRIES_, EXCEPTION_MSG_\n  FROM ACT_RU_DEADLETTER_JOB;',
        ],
      },
      {
        method: 'ACT_RU_EVENT_SUBSCR',
        desc: '消息/信号等事件订阅',
        scenario: '查谁在等 message/signal。',
        examples: [
          'SELECT EVENT_TYPE_, EVENT_NAME_, EXECUTION_ID_\n  FROM ACT_RU_EVENT_SUBSCR WHERE PROC_INST_ID_ = ?;',
        ],
      },
      {
        method: 'ACT_HI_*',
        desc: 'History 历史：已完成与审计数据',
        scenario: '办结轨迹、耗时分析；history 级别决定写入量。',
        examples: [
          'SELECT * FROM ACT_HI_PROCINST WHERE BUSINESS_KEY_ = \'LEAVE-001\';',
        ],
      },
      {
        method: 'ACT_HI_PROCINST',
        desc: '历史流程实例',
        scenario: '开始/结束时间、启动人、删除原因。',
        examples: [
          'SELECT ID_, BUSINESS_KEY_, START_TIME_, END_TIME_, DURATION_\n  FROM ACT_HI_PROCINST WHERE PROC_DEF_KEY_ = \'leave\';',
        ],
      },
      {
        method: 'ACT_HI_ACTINST',
        desc: '历史活动节点实例',
        scenario: '每个经过的 activity 一条，用于轨迹高亮。',
        examples: [
          'SELECT ACT_ID_, ACT_NAME_, START_TIME_, END_TIME_\n  FROM ACT_HI_ACTINST WHERE PROC_INST_ID_ = ? ORDER BY START_TIME_;',
        ],
      },
      {
        method: 'ACT_HI_TASKINST',
        desc: '历史任务实例',
        scenario: '已办任务、审批人、耗时。',
        examples: [
          'SELECT NAME_, ASSIGNEE_, START_TIME_, END_TIME_\n  FROM ACT_HI_TASKINST WHERE PROC_INST_ID_ = ?;',
        ],
      },
      {
        method: 'ACT_HI_VARINST / ACT_HI_DETAIL',
        desc: '历史变量 / 变量变更明细',
        scenario: '变量最终值与变更历史（detail 更细）。',
        examples: [
          'SELECT NAME_, VAR_TYPE_, TEXT_\n  FROM ACT_HI_VARINST WHERE PROC_INST_ID_ = ?;',
        ],
      },
      {
        method: 'ACT_HI_COMMENT / ACT_HI_ATTACHMENT',
        desc: '历史评论 / 附件',
        scenario: '审批意见与附件归档查询。',
        examples: [
          'SELECT USER_ID_, MESSAGE_, TIME_\n  FROM ACT_HI_COMMENT WHERE PROC_INST_ID_ = ?;',
        ],
      },
      {
        method: 'ACT_GE_*',
        desc: 'General 通用：属性、字节数组资源',
        scenario: 'BPMN 字节、附件内容、引擎 schema 版本。',
        examples: ['SELECT * FROM ACT_GE_PROPERTY;'],
      },
      {
        method: 'ACT_GE_BYTEARRAY',
        desc: 'BPMN XML、附件等二进制',
        scenario: '流程定义资源与大变量存储。',
        examples: [
          'SELECT ID_, NAME_, DEPLOYMENT_ID_\n  FROM ACT_GE_BYTEARRAY WHERE DEPLOYMENT_ID_ = ?;',
        ],
      },
      {
        method: 'ACT_GE_PROPERTY',
        desc: '引擎属性（schema 版本等）',
        scenario: '确认 schema.version 与库升级是否成功。',
        examples: [
          'SELECT * FROM ACT_GE_PROPERTY WHERE NAME_ = \'schema.version\';',
        ],
      },
      {
        method: 'ACT_ID_*',
        desc: 'Identity 身份：用户/组（可不用内置）',
        scenario: '使用内置身份服务时的用户组表。',
        examples: ['SELECT * FROM ACT_ID_USER;'],
      },
      {
        method: 'ACT_ID_USER / ACT_ID_GROUP / ACT_ID_MEMBERSHIP',
        desc: '用户、组、成员关系',
        scenario: '内置用户组与成员绑定。',
        examples: [
          'SELECT * FROM ACT_ID_MEMBERSHIP WHERE USER_ID_ = \'zhangsan\';',
        ],
      },
      {
        method: 'FLW_*',
        desc: 'Flowable 扩展表（如事件注册、批量等，视模块而定）',
        scenario: '启用 event registry / batch / cmmn 等模块时出现。',
        examples: [
          '-- 视具体模块：FLW_EVENT_DEPLOYMENT、FLW_RU_BATCH 等\nSHOW TABLES LIKE \'FLW_%\';',
        ],
      },
    ],
  },
  {
    cat: '实用片段',
    items: [
      {
        method: 'runtimeService.startProcessInstanceByKey("leave", bizKey, vars)',
        desc: '启动请假流程示例',
        scenario: '业务服务发起请假：绑定单号 + 初始变量。',
        examples: [
          'Map<String, Object> vars = new HashMap<>();\nvars.put("applicant", userId);\nvars.put("days", days);\nvars.put("reason", reason);\nProcessInstance pi = runtimeService.startProcessInstanceByKey(\n    "leave", "LEAVE-" + leaveId, vars);',
        ],
      },
      {
        method: 'taskService.createTaskQuery().taskCandidateOrAssigned(uid).list()',
        desc: '综合待办列表',
        scenario: '待办中心：我的已签收 + 可签收。',
        examples: [
          'List<Task> todo = taskService.createTaskQuery()\n    .taskCandidateOrAssigned(userId)\n    .orderByTaskCreateTime().desc()\n    .listPage(0, 20);',
        ],
      },
      {
        method: 'taskService.complete(taskId, Collections.singletonMap("approved", true))',
        desc: '审批通过并写变量',
        scenario: '审批页点通过，写入 approved 驱动排他网关。',
        examples: [
          'taskService.complete(taskId,\n    Map.of("approved", true, "comment", comment));',
        ],
      },
      {
        method: '${hrApproved && days <= 3}',
        desc: '网关条件表达式示例',
        scenario: '连线条件：人事已批且天数≤3 走快捷通道。',
        examples: [
          '<conditionExpression xsi:type="tFormalExpression">\n  ${hrApproved &amp;&amp; days &lt;= 3}\n</conditionExpression>',
        ],
      },
      {
        method: 'nrOfCompletedInstances / nrOfInstances >= 0.5',
        desc: '会签完成条件：过半通过',
        scenario: '多实例会签：完成数/总数 ≥ 50% 即结束会签。',
        examples: [
          '<completionCondition>\n  ${nrOfCompletedInstances / nrOfInstances &gt;= 0.5}\n</completionCondition>',
        ],
      },
      {
        method: 'historyService.createHistoricProcessInstanceQuery().finished().list()',
        desc: '已结束流程查询',
        scenario: '办结档案、报表统计。',
        examples: [
          'historyService.createHistoricProcessInstanceQuery()\n    .processDefinitionKey("leave")\n    .finished()\n    .startedBy(userId)\n    .orderByProcessInstanceEndTime().desc()\n    .listPage(0, 20);',
        ],
      },
    ],
  },
];

let flowablerefSearchTimer = null;

function flowablerefItemMatches(item, filter) {
  if (!filter) return true;
  const f = filter.toLowerCase();
  if ((item.method || '').toLowerCase().includes(f)) return true;
  if ((item.desc || '').toLowerCase().includes(f)) return true;
  if ((item.scenario || '').toLowerCase().includes(f)) return true;
  if (
    item.examples &&
    item.examples.some(function (e) {
      return String(e).toLowerCase().includes(f);
    })
  ) {
    return true;
  }
  return false;
}

function flowablerefBuildExampleBlock(content) {
  return (
    '<div class="ref-copy-wrap">' +
    '<pre class="ref-pre"><code>' +
    escapeHtml(content) +
    '</code></pre>' +
    '<button class="ref-copy-btn" onclick="flowablerefCopyPre(this, event)">复制</button>' +
    '</div>'
  );
}

function flowablerefCopyPre(btn, ev) {
  if (ev) ev.stopPropagation();
  const pre = btn.parentElement.querySelector('pre');
  if (!pre) return;
  safeCopy(pre.innerText);
}

function flowablerefRender(filter) {
  const container = document.getElementById('flowablerefContent');
  if (!container) return;
  filter = (filter || '').trim().toLowerCase();
  container.innerHTML = '';
  let hasResult = false;
  FLOWABLE_REF_DATA.forEach(function (group) {
    const matched = filter
      ? group.items.filter(function (i) {
          return (
            flowablerefItemMatches(i, filter) ||
            group.cat.toLowerCase().includes(filter)
          );
        })
      : group.items;
    if (!matched.length) return;
    hasResult = true;
    const section = document.createElement('div');
    section.className = 'ref-group';
    section.innerHTML =
      '<div class="ref-group-title">' + escapeHtml(group.cat) + '</div>';
    matched.forEach(function (item) {
      const card = document.createElement('div');
      card.className = 'ref-card';
      let html =
        '<div class="ref-cmd-head">' +
        '<code class="ref-cmd-name">' +
        escapeHtml(item.method) +
        '</code>' +
        '<span class="ref-cmd-desc">' +
        escapeHtml(item.desc) +
        '</span>' +
        '<button class="sm outline" onclick="safeCopy(\'' +
        escapeHtml(item.method).replace(/\\/g, '\\\\').replace(/'/g, "\\'") +
        '\')">复制</button>' +
        '</div>';
      if (item.scenario) {
        html +=
          '<div class="arthas-scenario">' + escapeHtml(item.scenario) + '</div>';
      }
      if (item.examples && item.examples.length) {
        html += '<div class="ref-section-title">示例</div>';
        item.examples.forEach(function (ex) {
          html += flowablerefBuildExampleBlock(ex);
        });
      }
      card.innerHTML = html;
      section.appendChild(card);
    });
    container.appendChild(section);
  });
  if (!hasResult) {
    container.innerHTML =
      '<div style="color:var(--text-muted);padding:20px;text-align:center">无匹配结果</div>';
  }
}

function flowablerefSearch() {
  clearTimeout(flowablerefSearchTimer);
  flowablerefSearchTimer = setTimeout(function () {
    const el = document.getElementById('flowablerefSearch');
    flowablerefRender(el ? el.value : '');
  }, 200);
}

registerInit('flowableref', flowablerefRender);
