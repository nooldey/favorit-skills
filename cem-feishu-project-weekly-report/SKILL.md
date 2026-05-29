---
name: cem-feishu-project-weekly-report
description: Use when CEM 飞书项目 weekly report, 本周工作汇总, 周报整理, 本周上线任务和反馈, or 下周计划 needs to be generated - requires cem-feishu-project-basic to optimize the prompt first, then gathers Feishu Project facts and produces a structured Markdown weekly report.
---

# CEM Feishu Project Weekly Report

## 必须先调用基础技能

执行本技能前，必须先使用 `cem-feishu-project-basic` 对用户原始提示词进行优化处理：

1. 识别任务类型为 `report`。
2. 抽取 `project_key`、本周上线任务视图、下周计划视图、Feedback 统计文件或视图、周报截止日期、补充任务项等参数。
3. 生成规范化指令包。
4. 本技能只基于优化后的 `normalized_instruction` 和 `parameters` 继续执行。

如果当前请求尚未经过 `cem-feishu-project-basic`，先停止本技能流程，调用基础技能完成输入优化。

## 适用场景

- “生成周报” / “本周工作汇总” / “写周报”。
- “整理本周上线任务和反馈”。
- “生成本周进展报告”。
- 汇总本周上线任务、Feedback 回收、本周个人任务、产品经理转发项、下周计划。

## 数据访问规则

严格继承 `cem-feishu-project-basic` 的工具链优先级：

1. **FeishuProjectMCP**：首选，用于本周上线任务视图、下周计划视图、Feedback 工作项、操作记录。
2. **Meegle CLI**：MCP 不可用或能力缺失时补充。
3. **lark-cli**：用于云文档读取/写入等飞书文档能力兜底。

任何统计数据都必须与数据源特别是飞书项目事实严格一致；禁止为了报告完整度自行编造 mock 数据。

## 执行规范

完整周报数据源、模板结构和处理规则见：

- [references/weekly_report.md](references/weekly_report.md)
- [../cem-feishu-project-basic/guidance/meegle-cli-guide.md](../cem-feishu-project-basic/guidance/meegle-cli-guide.md)

## 输出要求

最终输出结构化 Markdown 周报，至少包含：

- 本周工作进展。
- 人员投入。
- 本周上线任务。
- 风险与未完成原因。
- Feedback 相关统计与客户声音更新清单。
- 本周个人任务项。
- 响应产品经理转发项。
- 下周开发计划与技术调研项。
