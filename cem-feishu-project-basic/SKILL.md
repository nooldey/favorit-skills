---
name: cem-feishu-project-basic
description: Use when any CEM 飞书项目/Feishu Project/project.feishu.cn request needs input optimization before execution - normalizes raw user prompts into a structured instruction package, selects task type, extracts parameters, and enforces FeishuProjectMCP > Meegle CLI > lark-cli data-access rules for downstream cem-feishu-project-* skills.
---

# CEM Feishu Project Basic

## 角色

本技能是 CEM 飞书项目基础输入优化包，不直接承担具体业务子流程。它负责接收用户原始需求，完成意图识别、参数抽取、提示词规范化和工具链边界约束，然后把优化后的指令交给对应的 `cem-feishu-project-*` 独立技能继续执行。

## 触发优先级

当输入出现“飞书项目”“Feishu Project”“project.feishu.cn”或明确指向飞书项目任务时，应优先使用本技能完成输入优化，不跳过、不直连具体执行技能。

所有拆分后的独立技能（例如 `cem-feishu-project-feedback-stats`、`cem-feishu-project-bug-debugger`、`cem-feishu-project-weekly-report`）在执行前都必须先经过本技能生成规范化指令包。

## 工具链优先级（访问飞书项目工作项时严格执行）

当访问飞书项目工作项链接地址进行信息获取时，按以下优先级选择工具链：

1. **FeishuProjectMCP**（首选）：优先使用 MCP 工具获取工作项信息、视图数据、评论、工时记录等。
2. **Meegle CLI**（次选）：当 MCP 功能缺失、鉴权失败或需要批量操作时，使用 `meegle` 命令补充。详见 [guidance/meegle-cli-guide.md](guidance/meegle-cli-guide.md)。
3. **lark-cli**（兜底）：当 MCP 和 Meegle CLI 均不可用时，使用 `lark-cli` 作为最后手段。

**阻断规则**：若上述三种工具均无法采集完整数据，直接报错并通知对话人员，禁止切换到浏览器 UI 读取工作项内容，禁止用历史报告、本地旧文件或模型推断补齐数据。

## 输入优化流程

1. 识别是否属于飞书项目任务。
2. 将原始需求映射为标准任务类型：`query`、`create`、`update`、`stats`、`report`、`debug`。
3. 参考 [guidance/patterns.md](guidance/patterns.md) 生成规范化指令。
4. 提取可用参数：项目 key、工作项类型、工作项 URL/ID、视图 URL/ID、时间范围、输出目标等。
5. 组装规范化指令包并返回给下游独立技能。
6. 如果无法匹配具体独立技能，只输出规范化后的可执行指令，等待用户确认或未来技能接管。

## 规范化指令包协议

下游技能应接收以下结构，并优先使用其中的 `normalized_instruction` 执行：

```json
{
  "router": "cem-feishu-project-basic",
  "task_type": "stats|report|debug|query|create|update",
  "target_skill": "cem-feishu-project-feedback-stats|cem-feishu-project-bug-debugger|cem-feishu-project-weekly-report|未匹配",
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
    "priority": ["FeishuProjectMCP", "Meegle CLI", "lark-cli"],
    "blocked": ["browser UI scraping", "historical report backfill", "model-inferred data"]
  }
}
```

如果用户未提供参数，保留空值并在 `normalized_instruction` 中明确缺失项；除下游技能自身声明的默认视图外，不在基础层自行注入默认视图。

## 路由建议

| 需求 | 建议目标技能 |
|---|---|
| feedback 回收统计、客户声音填写率、本周新增客户声音、研发投入耗时、leader 投入产出汇报 | `cem-feishu-project-feedback-stats` |
| Bug/缺陷/问题单分析、复现、定位根因、修复代码、回写 debugger notes | `cem-feishu-project-bug-debugger` |
| 生成周报、本周工作汇总、本周上线任务和反馈、下周计划 | `cem-feishu-project-weekly-report` |
| 其他飞书项目查询、创建、更新、统计、报表 | 先输出规范化指令，等待具体技能或人工接管 |

## 资源

### 指南与参考（`guidance/`）

| 文件 | 职责 |
|---|---|
| [guidance/patterns.md](guidance/patterns.md) | 飞书项目需求规范化模板与 Prompt 最佳实践 |
| [guidance/meegle-cli-guide.md](guidance/meegle-cli-guide.md) | Meegle CLI 集成指南，含命令映射、认证、配置与使用建议 |
