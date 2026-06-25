# Meegle CLI 路由说明

本文件只保留 `cem-feishu-project-basic` 需要的工具边界与路由约束；Meegle CLI 的认证、命令、参数、字段格式、MQL、附件、工作流、视图、工时等完整说明由 `meegle` skill 维护。

## 基本原则

- 飞书项目数据访问首选 `meegle` skill / Meegle CLI。
- 同一目标 Meegle 调用失败后，先调整参数或换等价命令重试；累计 2 次仍失败才切 FeishuProjectMCP，并记录失败原因。
- `lark-cli` 不作为飞书项目工作项数据兜底，只处理项目外部关联的飞书资源。
- Meegle CLI 和 FeishuProjectMCP 都无法采集完整飞书项目数据时，直接报错；禁止用浏览器 UI、历史报告、本地旧文件或模型推断补齐数据。

## 工具边界

| 需求 | 首选 | 说明 |
|---|---|---|
| 飞书项目工作项、视图、评论、工时、关联、节点、WBS、MQL、URL 解析 | `meegle` skill / Meegle CLI | 具体命令与参数查看 `meegle` skill |
| 飞书文档、云空间、电子表格、Base | 对应 `lark-*` skill / `lark-cli` | 仅处理项目外部关联资源 |
| 通讯录 open_id、部门、邮箱、IM、日历、任务、邮件 | 对应 `lark-*` skill / `lark-cli` | 仅作辅助，不补飞书项目数据 |

## 下游执行提示

需要实际查询、创建、更新、统计或回写飞书项目数据时，加载并遵循 `meegle` skill；本技能只负责产出规范化指令包和工具策略，不复制 Meegle API 细节。
