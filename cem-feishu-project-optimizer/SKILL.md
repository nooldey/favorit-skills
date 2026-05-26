---
name: cem-feishu-project-optimizer
description: 飞书项目统一入口编排技能。只要用户在任何项目上下文中提及"飞书项目""Feishu Project""project.feishu.cn"或表达飞书项目相关诉求，都必须优先触发本技能；由本技能先完成意图识别与指令规范化，再分发给内置子流程或未来新增子技能执行，覆盖查询、创建、更新、统计、报表、调试任务。
---

# Feishu Project Optimizer

## 角色

作为飞书项目任务的主技能编排器，先接收用户原始需求，再输出统一的规范化指令包，并将其分发给内置子流程或扩展子技能执行。

## 触发优先级

当输入出现"飞书项目""Feishu Project""project.feishu.cn"或明确指向飞书项目任务时，优先进入本技能，不跳过、不直连其他流程。

## 编排流程

1. 识别是否属于飞书项目任务。
2. 将原始需求映射为标准任务类型：`query`、`create`、`update`、`stats`、`report`、`debug`。
3. 参考 [patterns.md](references/patterns.md) 生成规范化指令。
4. 组装规范化指令包并路由到目标子流程。
5. 子流程返回执行结果后，统一整理为对用户可读的最终输出。

## 规范化指令包协议

输出给子流程时使用以下结构：

```json
{
  "router": "cem-feishu-project-optimizer",
  "task_type": "stats|report|debug|query|create|update",
  "target_subflow": "子流程名称",
  "normalized_instruction": "可执行的规范化指令",
  "parameters": {
    "project_key": "",
    "work_item_type": "",
    "view_id": "",
    "view_url": ""
  },
  "output_contract": {
    "format": "markdown",
    "must_include": []
  }
}
```

如果用户未提供参数，保留空值并在 `normalized_instruction` 中明确缺失项；除子流程自身声明的回收统计默认视图外，不在编排层自行注入默认视图。

## 子流程路由规则

### 1. Feedback 统计与投入产出 (`feedback_investment_stats`)

命中以下任一需求时，统一路由到内置子流程 `feedback_investment_stats`：
- feedback 回收统计、客户声音填写率
- 本周新增客户声音、未填写分层
- feedback 研发投入耗时、资源投放总览
- 面向 leader 的研发小组投入产出汇报

该子流程负责 feedback 回收率、客户声音录入内容、未填写分层、关联 Story/Task 和研发投入耗时综合统计。

### 2. Bug 调试 (`bug_debugger`)

命中以下任一需求时，统一路由到内置子流程 `bug_debugger`：
- 用户提供 project.feishu.cn Bug/缺陷/问题单链接并要求分析、复现、定位根因
- 要求修复代码并回写调试结论到飞书项目
- 要求撰写 debugger notes

该子流程负责 Bug 单读取、源码定位、根因排查、修复实现、验证和回写飞书项目。

### 3. 周报生成 (`weekly_report`)

命中以下任一需求时，统一路由到内置子流程 `weekly_report`：
- "生成周报" / "本周工作汇总" / "写周报"
- "整理本周上线任务和反馈"
- "生成本周进展报告"

该子流程负责整合飞书项目 Story 清单、用户反馈统计、客户反馈详情，生成结构化周报。

### 4. 其他飞书项目需求

命中其他飞书项目需求时，先生成规范化指令包，再路由到对应子流程。
尚无可用子流程时，直接输出规范化后的可执行指令，等待未来子技能接管执行。

## 当前内置子流程清单

| 子流程名称 | 对应文件 | 职责 |
|---|---|---|
| `feedback_investment_stats` | [references/feedback_investment_stats.md](references/feedback_investment_stats.md) | feedback 回收率、客户声音录入、未填写分层、关联 Story/Task、研发投入耗时综合统计 |
| `bug_debugger` | [references/bug_debugger.md](references/bug_debugger.md) | Bug 单调试工作流：读取、定位、修复、验证、回写 |
| `weekly_report` | [references/weekly_report.md](references/weekly_report.md) | 整合 Story 清单、反馈统计、客户声音，生成结构化周报 |

## 资源

- [patterns.md](references/patterns.md)：飞书项目需求规范化模板。
- [feedback_investment_stats.md](references/feedback_investment_stats.md)：Feedback 回收与研发投入统计子流程完整规范。
- [bug_debugger.md](references/bug_debugger.md)：Bug 单调试子流程完整规范。
- [weekly_report.md](references/weekly_report.md)：周报生成子流程完整规范。
- [feedback_stats.md](references/feedback_stats.md)：历史 feedback 回收统计规则，仅作为 `feedback_investment_stats` 合并后的参考资料。
