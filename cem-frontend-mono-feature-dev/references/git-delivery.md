# Git Delivery

## 触发条件

当用户明确说“确认推送代码”、或明确表示当前修改可以提交并推送到远端 git 仓库时，立即执行以下动作，不再二次确认。

## 执行规则

1. 只处理已经明确涉及的 git 子仓库；若涉及范围不明确，先从当前变更和计划文档中识别实际有源码改动的子仓库。外层 mono 的 `docs/plans`、`branches.json`、skill 文档等不属于子仓库源码提交，除非用户明确要求提交外层仓库。
2. 对每个子仓库执行提交前检查：`git rev-parse --abbrev-ref HEAD`、`git status --short --branch`、`git remote get-url origin`、目标文件 diff、`git diff --check`。必须确认当前分支不是 `HEAD`，远端 `origin` 存在，且只提交本次目标文件。
3. 根据当前分支名生成 commit message：默认格式为 `<version_prefix> feat: <本次变更摘要>`。若当前分支为 `vX.Y.Z_zws` 或 `vX.Y.Z-xxx`，`version_prefix` 使用远端 hook 通常可接受的 semver 主体 `vX.Y.Z`；若远端仓库允许完整分支名，可使用完整当前分支名。
4. 逐子仓库执行：`git add <目标文件>`、`git commit -m "<message>"`、`git push -u origin <current_branch>`。如果 push 因 commit message hook 被拒绝，允许在该分支尚未成功推送对应提交时使用 `git commit --amend -m "<hook-compatible-message>"` 后重新 `git push`；不得改写已经成功推送的远端历史，除非用户明确批准 force push。
5. 推送后必须验证：`git status --short --branch` 显示本地与 upstream 同步、`git log -1 --pretty=format:'%h %s'` 符合规范、`git ls-remote --heads origin <current_branch>` 能查到远端分支。
6. 最终输出按子仓库列出：包名、路径、远端分支、commit hash、commit message、push 是否成功；同时说明未提交的外层文件或未纳入范围的变更。
