# Templates

## Feature 计划文档

计划文件必须放在 `docs/plans`，文件名必须包含 `-feature-`。建议格式：

```text
YYYYMMDD-<short-slug>-feature-plan.md
```

若无法可靠获取日期，可使用需求 ID 或简短标题作为前缀，但仍必须包含 `-feature-`。

```markdown
# <需求标题> Feature Plan

## 来源

- 飞书项目：<Task/Story URL 或 ID>
- 工作项类型：<Task/Story>
- 需求摘要：<一句话概括>

## 目标与非目标

### 目标

- <用户可感知的目标>

### 非目标

- <明确不做的范围>

## 需求拆解

- <功能点>
- <验收标准映射>

## 现状分析

- <相关 git submodule、包、模块和当前实现>
- <复用点、约束、风险>

## 技术方案

- <数据流/API/状态管理/组件结构/路由/权限/埋点等>

## 实施步骤

1. <步骤>
2. <步骤>

## 验证计划

- <需要新增/更新的 TDD 单元测试脚本路径>
- <源码路径到测试路径的映射>
- <单测/组件测试/e2e/构建/类型检查/手动验证>
- <后续维护者可直接复跑的最小验证命令>

## 影响范围

- <git submodule path 与 package.json name>
- <包名或模块路径>

## 风险与回滚

- <风险>
- <回滚或降级方案>
```

## 最终输出模板

```markdown
已完成 <需求标题> 的前端 mono 功能开发。

计划文档：`docs/plans/<file>-feature-<...>.md`

主要改动：
- <改动摘要>

TDD 单元测试脚本：
- `<source-file>` -> `<test-file>`：<覆盖的行为>
- 测试目录依据：<沿用已有约定/新建单元测试目录及原因>

验证：
- `<command>`：通过/失败/未运行原因

代码评审：
- `code-review-expert`（`<submodule-path>` / `<package.json name>`）：<结论；若涉及 React/Next.js，说明是否已按 vercel-react-best-practices 检查>
- 已处理：<问题或无>

涉及 Git 子仓库：
- `<package.json name>`（`<submodule-path>`）：<改动说明>

补充说明：
- <风险、未完成项、需要用户确认的事项；没有则省略>
```
