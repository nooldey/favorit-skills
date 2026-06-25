---
name: cem-frontend-mono-feature-dev
description: Use when a CEM 飞书项目 Task/Story link requires frontend mono feature development - reads work item details, plans changes, implements focused frontend changes, asks before any TDD or test-file creation, applies React/Next.js best practices, reviews affected submodules, and reports package-scoped results.
---

# CEM Frontend Mono Feature Dev

## 概览

用于把飞书项目需求转成前端 mono 功能开发结果。先规范输入，再按子模块边界做计划、实现、测试、自查、评审和总结。

## 何时使用

- 用户给出 `project.feishu.cn` 的 Task/Story/需求链接。
- 需求要落到前端 mono 工程中的一个或多个包。
- 需要生成 `docs/plans/*-feature-*.md` 计划文档。
- TDD 单测仅在功能开发完成后、用户明确同意时补充或更新；用户否定时必须绕过 TDD。
- 需求涉及 React/Next.js 时，需要按 `vercel-react-best-practices` 自查。

## 核心流程

1. 先用 `cem-feishu-project-basic` 规范化输入。
2. 识别受影响的 git submodule 和相关包。
3. 在 `docs/plans` 新建 feature 计划。
4. 按计划实现功能代码；不得主动触发 TDD 流程或创建 TDD 相关测试文件。
5. 功能开发完成后，主动询问用户是否触发或执行 TDD：用户同意才执行 TDD 相关动作；用户否定则绕过 TDD。
6. 若涉及 React/Next.js，使用 `vercel-react-best-practices` 进行实现与审查自查。
7. 最后调用 `code-review-expert`，按子模块汇总验证与结果。

## 强制子技能

- **REQUIRED SUB-SKILL:** 需求输入规范化必须使用 `cem-feishu-project-basic`。
- **REQUIRED SUB-SKILL:** 涉及 React 组件、React Hooks、Next.js 页面、数据获取、渲染性能、包体积或重渲染优化时，必须使用 `vercel-react-best-practices`。
- **REQUIRED SUB-SKILL:** 进入最终总结前必须使用 `code-review-expert`，且按受影响子模块分别评审。

## 详细规范

完整执行规则、模板和交付规则见：

- [references/workflow.md](references/workflow.md)：主流程、可选 TDD、React/Next.js 子技能、评审和验证规则。
- [references/templates.md](references/templates.md)：feature 计划文档模板和最终输出模板。
- [references/git-delivery.md](references/git-delivery.md)：用户确认推送代码后的提交与推送规则。
- [../cem-feishu-project-basic/guidance/meegle-cli-guide.md](../cem-feishu-project-basic/guidance/meegle-cli-guide.md)

## 输出要求

最终结果至少应包含：

- 已处理的飞书项目 Task/Story。
- 新增的计划文档路径。
- 受影响 git submodule 和包名。
- TDD 执行状态：已执行 / 用户否定后已绕过 / 未询问原因。
- `code-review-expert` 结论。
- 若涉及 React/Next.js，说明已按 `vercel-react-best-practices` 自查。
