---
name: cem-feishu-project-basic
description: Use when any CEM 飞书项目/Feishu Project/project.feishu.cn request needs pre-routing before execution - normalizes intent and parameters, selects a downstream CEM project/frontend skill, and enforces Meegle CLI first, FeishuProjectMCP after 2 Meegle retries, with lark-cli only for non-project Feishu resources.
---

# CEM Feishu Project Basic

## 角色

前置路由与规范化技能：把飞书项目原始请求转换为可执行指令包，明确任务类型、参数、目标技能和工具策略。它只负责分流和约束，不直接查询、开发、统计或回写业务结果。

## 触发

输入出现“飞书项目”“Feishu Project”“project.feishu.cn”或明确指向飞书项目任务时，先用本技能产出规范化指令包，再交给匹配的下游技能。

## 工具策略

访问飞书项目数据时严格执行：

1. **Meegle CLI first**：工作项、视图、评论、工时、关联、节点、图表、人员排期等先用 `meegle`。命令参考 [guidance/meegle-cli-guide.md](guidance/meegle-cli-guide.md)。
2. **FeishuProjectMCP after retries**：同一目标 Meegle 调用失败后，调整参数或换等价命令重试；累计 2 次仍失败才切 FeishuProjectMCP，并记录失败原因。
3. **lark-cli only for auxiliary Feishu resources**：`lark-cli` 当前没有飞书项目专用命令，不作为工作项数据兜底。仅在读取项目外部关联的飞书文档、云空间、表格、Base、通讯录、IM、日历、任务、邮件，或探索原生 OpenAPI 时使用。

若 Meegle CLI 和 FeishuProjectMCP 都无法采集完整飞书项目数据，直接报错。禁止用浏览器 UI、历史报告、本地旧文件或模型推断补齐数据。

## 输入优化流程

1. 映射任务类型：`query`、`create`、`update`、`stats`、`report`、`debug`、`feature`。
2. 提取参数：项目 key、工作项类型、工作项 URL/ID、视图 URL/ID、时间范围、输出目标。
3. 参考 [guidance/patterns.md](guidance/patterns.md) 生成规范化指令。
4. 匹配目标技能；未匹配时只输出规范化指令，等待用户确认或人工接管。不要在本技能内直接执行查询、写入、代码修改或报告生成。

## 规范化指令包协议

下游技能优先执行 `normalized_instruction`：

```json
{
  "router": "cem-feishu-project-basic",
  "task_type": "stats|report|debug|feature|query|create|update",
  "target_skill": "cem-feishu-project-feedback-stats|cem-feishu-project-weekly-report|cem-frontend-mono-debugger|cem-frontend-mono-feature-dev|未匹配",
  "normalized_instruction": "可执行的规范化指令",
  "parameters": {
    "project_key": "",
    "work_item_type": "",
    "work_item_url": "",
    "work_item_id": "",
    "view_id": "",
    "view_url": "",
    "time_range": ""
  },
  "output_contract": {
    "format": "markdown",
    "must_include": []
  },
  "tool_policy": {
    "priority": ["Meegle CLI", "FeishuProjectMCP"],
    "meegle_retry_before_mcp": 2,
    "lark_cli_scope": "仅用于飞书项目外部关联资源或飞书开放平台通用能力，不作为飞书项目工作项数据兜底",
    "blocked": ["browser UI scraping", "historical report backfill", "model-inferred data"]
  }
}
```

如果用户未提供参数，保留空值并在 `normalized_instruction` 中明确缺失项；除下游技能自身声明的默认视图外，不在基础层注入默认视图或补业务结论。

## 路由建议

| 需求 | 建议目标技能 |
|---|---|
| feedback 回收统计、客户声音填写率、本周新增客户声音、研发投入耗时、leader 投入产出汇报 | `cem-feishu-project-feedback-stats` |
| frontend mono Bug/缺陷/问题单分析、复现、定位根因、修复代码 | `cem-frontend-mono-debugger` |
| frontend mono Task/Story/需求开发、前端实现、单测和本地验证 | `cem-frontend-mono-feature-dev` |
| Bug/缺陷/问题单分析、复现、定位根因、修复代码、回写修复结论 | `cem-frontend-mono-debugger` |
| 生成周报、本周工作汇总、本周上线任务和反馈、下周计划 | `cem-feishu-project-weekly-report` |
| 其他飞书项目查询、创建、更新、统计、报表 | 先输出规范化指令，等待具体技能或人工接管 |

## 资源

| 文件 | 何时读取 |
|---|---|
| [guidance/patterns.md](guidance/patterns.md) | 需要 Prompt 模板或任务类型示例 |
| [guidance/meegle-cli-guide.md](guidance/meegle-cli-guide.md) | 需要 Meegle 命令、字段格式或工具边界 |
