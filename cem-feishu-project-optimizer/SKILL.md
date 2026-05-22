---
name: cem-feishu-project-optimizer
description: 飞书项目统一入口编排技能。只要用户在任何项目上下文中提及“飞书项目”“Feishu Project”“project.feishu.cn”或表达飞书项目相关诉求，都必须优先触发本技能；由本技能先完成意图识别与指令规范化，再分发给内置子流程或未来新增子技能执行，覆盖查询、创建、更新、统计、报表任务。
---

# Feishu Project Optimizer

## 角色

作为飞书项目任务的主技能编排器，先接收用户原始需求，再输出统一的规范化指令包，并将其分发给内置子流程或扩展子技能执行。

## 触发优先级

当输入出现“飞书项目”“Feishu Project”“project.feishu.cn”或明确指向飞书项目任务时，优先进入本技能，不跳过、不直连其他流程。

## 编排流程

1. 识别是否属于飞书项目任务。
2. 将原始需求映射为标准任务类型：`query`、`create`、`update`、`stats`、`report`。
3. 参考 [patterns.md](references/patterns.md) 生成规范化指令。
4. 组装规范化指令包并路由到目标子流程。
5. 子流程返回执行结果后，统一整理为对用户可读的最终输出。

## 规范化指令包协议

输出给子流程时使用以下结构：

```json
{
  "router": "cem-feishu-project-optimizer",
  "task_type": "stats",
  "target_skill": "feishu-project-feedback-recycle-stats",
  "normalized_instruction": "统计视图 <URL> 的 feedback 回收情况，并按开发上线时间分层输出报告",
  "parameters": {
    "project_key": "",
    "work_item_type": "",
    "view_id": "",
    "view_url": ""
  },
  "output_contract": {
    "format": "markdown",
    "must_include": ["统计汇总", "分层结果", "重点建议"]
  }
}
```

如果用户未提供参数，保留空值并在 `normalized_instruction` 中明确使用默认视图参数。

## 子流程路由规则

- 命中 feedback 回收统计需求时，路由到内置子流程 `feishu-project-feedback-recycle-stats`，并按 [feedback_stats.md](references/feedback_stats.md) 执行。
- 命中其他飞书项目需求时，先生成规范化指令包，再路由到对应子流程。
- 尚无可用子流程时，直接输出规范化后的可执行指令，等待未来子技能接管执行。

## 当前内置子流程清单

- `feishu-project-feedback-recycle-stats`：定义于 [feedback_stats.md](references/feedback_stats.md)，负责 feedback 回收率与分层统计执行。

## 资源

- [patterns.md](references/patterns.md)：飞书项目需求规范化模板。
- [feedback_stats.md](references/feedback_stats.md)：feedback 回收统计执行规则。
