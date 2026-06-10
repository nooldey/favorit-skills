---
name: cem-frontend-merging-version-branches
description: Use only when explicitly asked to merge versions or version branches in `cem-frontend-mono`, a `monorepo` or `mono` project, across many submodules/packages; handles reading version record `branches`, `packageSubmodules` lookup, versioned branch naming, tag merges, conflict stopping, and branch record output.
---

# cem-frontend-merging-version-branches

## Overview

用于多子仓 monorepo 的版本分支融合。输入通常是一个源版本的分支信息对象和一个目标版本号，按包逐个把指定 tag 合并到对应子模块分支里。

## 工作流

1. 在 monorepo 根目录执行 `yarn checkout --env=dev --ver=<目标版本号>`，等待所有子模块切换完成。
2. 读取源版本对应的版本对象，再取其 `branches` 属性，按 key 顺序逐个处理，不跳项，不补推断。
3. 用 `bin/utils/packageSubmodules.js` 的 `packageSubmodules` 映射，把包名解析成子模块相对路径。
4. 进入子模块目录，基于当前 `HEAD/tag/branch` 创建新分支。
5. 分支名按 `v<主版本>.<次版本+1>.0_<git user.name>` 生成。
6. 合并对应 tag 或 release 分支。
7. 如果出现冲突，立刻停止，报告子模块路径、冲突文件和当前分支名，不要自行猜测修复。
8. 如果没有冲突，提交合并结果，再继续下一个包。
9. 所有 key 处理完后，执行 `yarn branches record` 记录当前分支信息。

## 规则

- 只处理源版本对象的 `branches` 里出现的 key。
- 分支后缀只使用 `git config user.name` 的值。
- 每个子模块独立建分支、独立合并、独立提交。
- 合并前后都检查 `git status --short`，确认没有意外改动。

## 参考

需要更具体的分支命名、包映射和命令细节时，读取 [参考文档](references/api_reference.md)。
