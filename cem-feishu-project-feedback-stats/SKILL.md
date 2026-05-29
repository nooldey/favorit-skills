---
name: cem-feishu-project-feedback-stats
description: Use when CEM 飞书项目 feedback 回收统计、客户声音填写率、本周新增客户声音、未填写分层、研发投入耗时或 leader 投入产出汇报 is requested - requires cem-feishu-project-basic to optimize the prompt first, then produces evidence-based Markdown statistics using FeishuProjectMCP > Meegle CLI > lark-cli.
---

# CEM Feishu Project Feedback Stats

## 必须先调用基础技能

执行本技能前，必须先使用 `cem-feishu-project-basic` 对用户原始提示词进行优化处理：

1. 识别任务类型为 `stats`。
2. 抽取 `project_key`、feedback 工作项类型、视图 URL/ID、上线时间范围、团队成员、输出目标等参数。
3. 生成规范化指令包。
4. 本技能只基于优化后的 `normalized_instruction` 和 `parameters` 继续执行。

如果当前请求尚未经过 `cem-feishu-project-basic`，先停止本技能流程，调用基础技能完成输入优化。

## 适用场景

- feedback 回收统计、客户声音填写率、未填写分层。
- 本周新增客户声音、客户声音填写人统计。
- 面向 leader 的研发小组投入产出汇报。
- 统计 feedback 关联 Story/Task/缺陷及研发实际耗时。
- 输出可下钻、有证据链的 Markdown 统计报告。

## 数据访问规则

严格继承 `cem-feishu-project-basic` 的工具链优先级：

1. **FeishuProjectMCP**：首选，用于视图、工作项、字段、关联、操作记录、工时记录。
2. **Meegle CLI**：MCP 不可用或能力缺失时补充。
3. **lark-cli**：仅作兜底或用于飞书文档/电子表格读写。

三者均无法采集完整数据时，直接报错并输出待补齐清单；禁止用历史报告、本地旧文件、名称相似度或模型推断补齐正式统计数据。

## 执行规范

完整流程、统计口径、报告结构和质量校验见：

- [references/feedback_investment_stats.md](references/feedback_investment_stats.md)
- [guidance/feedback_stats.md](guidance/feedback_stats.md)
- [../cem-feishu-project-basic/guidance/meegle-cli-guide.md](../cem-feishu-project-basic/guidance/meegle-cli-guide.md)

## 输出要求

最终输出 Markdown，必须包含：

- 统计范围和数据来源。
- Feedback 核心信息表。
- 客户声音回收概览。
- 研发投入与成员分布。
- Story/缺陷/Task 明细。
- 风险与管控建议。
- 数据采集完整性和异常清单。

正式报告中的关键数字必须可追溯；无法形成证据链的数字不得进入汇总结论。
