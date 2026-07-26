const FLOWABLE_REF_DATA = [
  {
    cat: "RuntimeService 流程实例",
    items: [
      {
        method: "startProcessInstanceByKey(key)",
        desc: "按定义 key 启动流程（取最新版本）",
      },
      {
        method: "startProcessInstanceByKey(key, businessKey)",
        desc: "启动并绑定业务主键 businessKey",
      },
      {
        method: "startProcessInstanceByKey(key, variables)",
        desc: "启动并传入流程变量 Map",
      },
      {
        method: "startProcessInstanceByKey(key, businessKey, variables)",
        desc: "启动 + businessKey + 变量",
      },
      {
        method: "startProcessInstanceById(processDefinitionId)",
        desc: "按流程定义 ID 启动（固定版本）",
      },
      {
        method: "startProcessInstanceByMessage(messageName)",
        desc: "通过消息启动（需消息开始事件）",
      },
      {
        method: "deleteProcessInstance(processInstanceId, reason)",
        desc: "删除运行中实例（含任务、变量）",
      },
      {
        method: "suspendProcessInstanceById(id)",
        desc: "挂起实例（任务不可办理）",
      },
      {
        method: "activateProcessInstanceById(id)",
        desc: "激活已挂起实例",
      },
      {
        method: "createProcessInstanceQuery()",
        desc: "查询运行中流程实例",
      },
      {
        method: "getVariables(executionId)",
        desc: "获取执行上全部变量",
      },
      {
        method: "setVariable(executionId, name, value)",
        desc: "设置流程/执行变量",
      },
      {
        method: "removeVariable(executionId, variableName)",
        desc: "删除变量",
      },
      {
        method: "signal(executionId)",
        desc: "触发接收任务/中间信号等待的执行",
      },
      {
        method: "messageEventReceived(messageName, executionId)",
        desc: "向等待消息的执行投递消息",
      },
      {
        method: "trigger(executionId)",
        desc: "触发等待状态的执行（如 ReceiveTask）",
      },
      {
        method: "createChangeActivityStateBuilder()",
        desc: "运行时跳转/迁移活动（谨慎使用）",
      },
    ],
  },
  {
    cat: "TaskService 任务操作",
    items: [
      {
        method: "createTaskQuery()",
        desc: "查询待办任务（可链式过滤）",
      },
      {
        method: "claim(taskId, userId)",
        desc: "签收候选任务（设 assignee）",
      },
      {
        method: "unclaim(taskId)",
        desc: "取消签收，清空 assignee",
      },
      {
        method: "complete(taskId)",
        desc: "完成任务（无变量）",
      },
      {
        method: "complete(taskId, variables)",
        desc: "完成任务并写入流程变量",
      },
      {
        method: "complete(taskId, variables, localScope)",
        desc: "localScope=true 时变量仅任务本地",
      },
      {
        method: "delegateTask(taskId, userId)",
        desc: "委派：owner 保留，assignee 变为被委派人",
      },
      {
        method: "resolveTask(taskId)",
        desc: "被委派人处理完后归还 owner",
      },
      {
        method: "setAssignee(taskId, userId)",
        desc: "直接指定办理人",
      },
      {
        method: "setOwner(taskId, userId)",
        desc: "设置任务所有者",
      },
      {
        method: "addCandidateUser(taskId, userId)",
        desc: "添加候选用户",
      },
      {
        method: "addCandidateGroup(taskId, groupId)",
        desc: "添加候选组",
      },
      {
        method: "deleteCandidateUser / deleteCandidateGroup",
        desc: "移除候选用户/组",
      },
      {
        method: "setDueDate(taskId, date)",
        desc: "设置任务到期时间",
      },
      {
        method: "setPriority(taskId, priority)",
        desc: "设置优先级（默认 50）",
      },
      {
        method: "createAttachment(...)",
        desc: "为任务/流程添加附件",
      },
      {
        method: "addComment(taskId, processInstanceId, message)",
        desc: "添加任务评论",
      },
      {
        method: "getVariablesLocal(taskId)",
        desc: "获取任务本地变量",
      },
    ],
  },
  {
    cat: "RepositoryService 部署定义",
    items: [
      {
        method: "createDeployment().addClasspathResource(...).deploy()",
        desc: "部署 BPMN / 表单等资源",
      },
      {
        method: "createDeployment().name(name).key(key).deploy()",
        desc: "指定部署名称与 key",
      },
      {
        method: "deleteDeployment(deploymentId, cascade)",
        desc: "删除部署；cascade=true 连带实例",
      },
      {
        method: "createProcessDefinitionQuery()",
        desc: "查询流程定义",
      },
      {
        method: "suspendProcessDefinitionById(id)",
        desc: "挂起定义（不可新启实例）",
      },
      {
        method: "activateProcessDefinitionById(id)",
        desc: "激活流程定义",
      },
      {
        method: "getProcessModel(processDefinitionId)",
        desc: "获取 BPMN XML 输入流",
      },
      {
        method: "getProcessDiagram(processDefinitionId)",
        desc: "获取流程图资源（若部署时带图）",
      },
      {
        method: "getBpmnModel(processDefinitionId)",
        desc: "获取内存 BpmnModel 对象",
      },
    ],
  },
  {
    cat: "HistoryService 历史",
    items: [
      {
        method: "createHistoricProcessInstanceQuery()",
        desc: "历史流程实例（含已结束）",
      },
      {
        method: "createHistoricTaskInstanceQuery()",
        desc: "历史任务查询",
      },
      {
        method: "createHistoricActivityInstanceQuery()",
        desc: "历史活动节点查询",
      },
      {
        method: "createHistoricVariableInstanceQuery()",
        desc: "历史变量查询",
      },
      {
        method: "deleteHistoricProcessInstance(processInstanceId)",
        desc: "删除历史流程数据",
      },
      {
        method: "deleteHistoricTaskInstance(taskId)",
        desc: "删除历史任务",
      },
    ],
  },
  {
    cat: "ManagementService / IdentityService",
    items: [
      {
        method: "createJobQuery() / executeJob(jobId)",
        desc: "查询/执行异步作业、定时器",
      },
      {
        method: "moveTimerToExecutableJob(jobId)",
        desc: "将定时作业提前为可执行",
      },
      {
        method: "getTableName(Class) / getTableMetaData",
        desc: "查看引擎表名与元数据",
      },
      {
        method: "setAuthenticatedUserId(userId)",
        desc: "设置当前认证用户（启动人/办理人上下文）",
      },
      {
        method: "newUser / saveUser / createUserQuery",
        desc: "内置用户管理（可选，常对接外部）",
      },
      {
        method: "newGroup / saveGroup / createMembership",
        desc: "内置组与成员关系",
      },
    ],
  },
  {
    cat: "常用查询链式 API",
    items: [
      {
        method: "taskAssignee(userId)",
        desc: "我的待办（已签收）",
      },
      {
        method: "taskCandidateUser(userId)",
        desc: "我是候选人的任务",
      },
      {
        method: "taskCandidateGroupIn(groups)",
        desc: "候选组在给定列表中",
      },
      {
        method: "taskCandidateOrAssigned(userId)",
        desc: "候选或已分配给我（常用综合待办）",
      },
      {
        method: "processInstanceBusinessKey(key)",
        desc: "按业务主键过滤",
      },
      {
        method: "processDefinitionKey(key)",
        desc: "按流程定义 key 过滤",
      },
      {
        method: "active() / suspended() / finished()",
        desc: "运行中 / 挂起 / 已结束",
      },
      {
        method: "orderByTaskCreateTime().desc().list()",
        desc: "排序并 list / listPage / count / singleResult",
      },
      {
        method: "includeProcessVariables()",
        desc: "结果带出流程变量（注意性能）",
      },
      {
        method: "taskVariableValueEquals(name, value)",
        desc: "按任务变量过滤",
      },
    ],
  },
  {
    cat: "监听器",
    items: [
      {
        method: "ExecutionListener.notify(DelegateExecution)",
        desc: "执行监听：start / end / take（连线）",
      },
      {
        method: "TaskListener.notify(DelegateTask)",
        desc: "任务监听：create / assignment / complete / delete",
      },
      {
        method: "class / expression / delegateExpression",
        desc: "监听器实现方式：类名 / 表达式 / Spring Bean",
      },
      {
        method: "delegateExpression=\"${myListener}\"",
        desc: "推荐：Spring 容器 Bean，可注入依赖",
      },
      {
        method: "event=\"create\"",
        desc: "任务创建时触发（设候选人/通知）",
      },
      {
        method: "event=\"assignment\"",
        desc: "办理人变更时触发",
      },
      {
        method: "event=\"complete\"",
        desc: "任务完成时触发",
      },
      {
        method: "event=\"start\" / event=\"end\"",
        desc: "执行监听：节点进入/离开",
      },
      {
        method: "JavaDelegate.execute(DelegateExecution)",
        desc: "服务任务委托类入口",
      },
      {
        method: "ActivityBehavior",
        desc: "自定义活动行为（高级扩展）",
      },
    ],
  },
  {
    cat: "BPMN 元素",
    items: [
      {
        method: "startEvent / endEvent",
        desc: "开始/结束事件；可带 none/message/timer/error 等",
      },
      {
        method: "userTask",
        desc: "用户任务：assignee / candidateUsers / candidateGroups",
      },
      {
        method: "serviceTask",
        desc: "服务任务：class / delegateExpression / expression",
      },
      {
        method: "scriptTask",
        desc: "脚本任务：javascript / groovy 等",
      },
      {
        method: "receiveTask",
        desc: "接收任务：等待外部 trigger/signal",
      },
      {
        method: "manualTask / businessRuleTask",
        desc: "手工任务 / 业务规则任务",
      },
      {
        method: "exclusiveGateway (XOR)",
        desc: "排他网关：条件互斥，走一条出线",
      },
      {
        method: "parallelGateway (AND)",
        desc: "并行网关：分叉全走、汇合全到",
      },
      {
        method: "inclusiveGateway (OR)",
        desc: "包容网关：满足条件的多条可并行",
      },
      {
        method: "eventBasedGateway",
        desc: "事件网关：等待后续事件先到者",
      },
      {
        method: "subProcess / callActivity",
        desc: "嵌入子流程 / 调用外部流程定义",
      },
      {
        method: "boundaryEvent",
        desc: "边界事件：超时、错误、消息、信号等附着节点",
      },
      {
        method: "intermediateCatchEvent / intermediateThrowEvent",
        desc: "中间捕获/抛出事件",
      },
      {
        method: "sequenceFlow + conditionExpression",
        desc: "连线条件：${approved == true}",
      },
      {
        method: "multiInstanceLoopCharacteristics",
        desc: "会签/或签：parallel / sequential + completionCondition",
      },
      {
        method: "formKey / formProperty",
        desc: "外挂表单标识或内置表单字段",
      },
    ],
  },
  {
    cat: "表前缀 ACT_* 说明",
    items: [
      {
        method: "ACT_RE_*",
        desc: "Repository 仓库：流程定义与部署静态资源",
      },
      {
        method: "ACT_RE_DEPLOYMENT",
        desc: "部署记录",
      },
      {
        method: "ACT_RE_PROCDEF",
        desc: "流程定义（key、版本、资源名）",
      },
      {
        method: "ACT_RE_MODEL",
        desc: "模型（设计器相关，可选）",
      },
      {
        method: "ACT_RU_*",
        desc: "Runtime 运行时：仅运行中数据，结束后清理",
      },
      {
        method: "ACT_RU_EXECUTION",
        desc: "执行实例（流程/分支 token）",
      },
      {
        method: "ACT_RU_TASK",
        desc: "运行中用户任务",
      },
      {
        method: "ACT_RU_VARIABLE",
        desc: "运行时变量",
      },
      {
        method: "ACT_RU_IDENTITYLINK",
        desc: "任务/流程的候选人、候选组、参与者",
      },
      {
        method: "ACT_RU_JOB / ACT_RU_TIMER_JOB / ACT_RU_DEADLETTER_JOB",
        desc: "异步作业 / 定时 / 死信作业",
      },
      {
        method: "ACT_RU_EVENT_SUBSCR",
        desc: "消息/信号等事件订阅",
      },
      {
        method: "ACT_HI_*",
        desc: "History 历史：已完成与审计数据",
      },
      {
        method: "ACT_HI_PROCINST",
        desc: "历史流程实例",
      },
      {
        method: "ACT_HI_ACTINST",
        desc: "历史活动节点实例",
      },
      {
        method: "ACT_HI_TASKINST",
        desc: "历史任务实例",
      },
      {
        method: "ACT_HI_VARINST / ACT_HI_DETAIL",
        desc: "历史变量 / 变量变更明细",
      },
      {
        method: "ACT_HI_COMMENT / ACT_HI_ATTACHMENT",
        desc: "历史评论 / 附件",
      },
      {
        method: "ACT_GE_*",
        desc: "General 通用：属性、字节数组资源",
      },
      {
        method: "ACT_GE_BYTEARRAY",
        desc: "BPMN XML、附件等二进制",
      },
      {
        method: "ACT_GE_PROPERTY",
        desc: "引擎属性（schema 版本等）",
      },
      {
        method: "ACT_ID_*",
        desc: "Identity 身份：用户/组（可不用内置）",
      },
      {
        method: "ACT_ID_USER / ACT_ID_GROUP / ACT_ID_MEMBERSHIP",
        desc: "用户、组、成员关系",
      },
      {
        method: "FLW_*",
        desc: "Flowable 扩展表（如事件注册、批量等，视模块而定）",
      },
    ],
  },
  {
    cat: "实用片段",
    items: [
      {
        method: "runtimeService.startProcessInstanceByKey(\"leave\", bizKey, vars)",
        desc: "启动请假流程示例",
      },
      {
        method: "taskService.createTaskQuery().taskCandidateOrAssigned(uid).list()",
        desc: "综合待办列表",
      },
      {
        method: "taskService.complete(taskId, Collections.singletonMap(\"approved\", true))",
        desc: "审批通过并写变量",
      },
      {
        method: "${hrApproved && days <= 3}",
        desc: "网关条件表达式示例",
      },
      {
        method: "nrOfCompletedInstances / nrOfInstances >= 0.5",
        desc: "会签完成条件：过半通过",
      },
      {
        method: "historyService.createHistoricProcessInstanceQuery().finished().list()",
        desc: "已结束流程查询",
      },
    ],
  },
];

let flowablerefSearchTimer = null;

function flowablerefRender(filter) {
  const container = document.getElementById("flowablerefContent");
  if (!container) return;
  filter = (filter || "").trim().toLowerCase();
  container.innerHTML = "";
  let hasResult = false;
  FLOWABLE_REF_DATA.forEach((group) => {
    const matched = filter
      ? group.items.filter(
          (i) =>
            i.method.toLowerCase().includes(filter) ||
            i.desc.toLowerCase().includes(filter) ||
            group.cat.toLowerCase().includes(filter),
        )
      : group.items;
    if (!matched.length) return;
    hasResult = true;
    const section = document.createElement("div");
    section.className = "ref-group";
    section.innerHTML = `<div class="ref-group-title">${group.cat}</div>`;
    matched.forEach((item) => {
      const card = document.createElement("div");
      card.className = "ref-card";
      card.innerHTML = `<div class="ref-cmd-head"><code class="ref-cmd-name">${item.method.replace(/</g, "&lt;")}</code><span class="ref-cmd-desc">${item.desc}</span><button class="sm outline" onclick="safeCopy('${item.method.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}')">复制</button></div>`;
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
  flowablerefSearchTimer = setTimeout(() => {
    const el = document.getElementById("flowablerefSearch");
    flowablerefRender(el ? el.value : "");
  }, 200);
}

registerInit("flowableref", flowablerefRender);
