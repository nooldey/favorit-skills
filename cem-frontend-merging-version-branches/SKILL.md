---
name: cem-frontend-merging-version-branches
description: Use only when explicitly asked to merge one or more historical versions or version branches into a target version in `cem-frontend-mono`, a `monorepo` or `mono` project; handles version-record inheritance via `extends`, reading `branches`, resolving a final merge manifest, `packageSubmodules` lookup, versioned branch naming, tag merges, conflict stopping, and branch record output.
---

# cem-frontend-merging-version-branches

## Overview

用于多子仓 monorepo 的版本分支融合。输入通常是一个或多个历史版本和一个目标版本号，先按 `extends` 还原继承链，整理出每个子模块最终要合并的源分支/tag 清单并先输出给用户，再把这些来源合并到对应子模块分支里。

## 概念

- 源版本：提供要合并的历史分支/tag 来源，一个或多个都可以。
- 目标版本：提供当前工作基座和基线分支来源，不决定哪些包要处理。
- 最终待合并清单：以源版本继承链上最终生效的包为准生成，再为每个包选择基线分支。

## 工作流

1. 在 monorepo 根目录执行 `yarn checkout --env=dev --ver=<目标版本号>`，等待所有子模块切换完成。
2. 立刻检查 `supports/engineering/rspack/publics/versions.json`，确认其中记载的 version 与目标版本一致。
3. 如果版本不一致，立刻中断后续流程，先排查 `yarn checkout` 是否仍在执行或切换失败，直到版本校验通过再继续。
4. 读取一个或多个历史版本对应的版本对象，沿 `extends` 自底向上整理成继承链。
5. 对同一个包名，只保留继承链上最高版本中最后生效的 `branches` 值；更高版本再次出现同名包时，继续向上覆盖更旧版本的值。
6. 若传入版本之间无法通过 `extends` 证明继承关系，先中断并要求确认，不要自行拼接链路。
7. 先整理“最终待合并清单”，筛选条件只看源版本继承链上最终生效的子模块包名集合，逐项输出给用户，内容至少包括：包名、解析后的路径、来源版本、来源分支/tag、基线分支/tag。
8. 确认清单无误后，再用 `bin/utils/packageSubmodules.js` 的 `packageSubmodules` 映射，把包名解析成子模块相对路径。
9. 进入子模块目录前，先读取目标版本里该包在 `branches` 中记录的值；如果没有对应 key，就回退到该包最终生效的 `sourceRef`，并以这个值作为新分支的基线。目标版本只参与基线选择，不参与是否处理的筛选。
10. 用 `scripts/createBaseBranch.js` 在子模块目录里创建基础新分支，分支名按 `v<该包基线版本主版本>.<该包基线版本次版本+1>.0_mix_<git user.name>` 生成。
11. 合并对应 tag 或 release 分支。
12. 如果出现冲突，立刻停止，报告子模块路径、冲突文件和当前分支名，不要自行猜测修复。
13. 如果没有冲突，提交合并结果，再继续下一个包。
14. 所有 key 处理完后，执行 `yarn branches record` 记录当前分支信息。

## 规则

- 只处理继承链上最终生效的 `branches` 里的 key。
- 分支后缀只使用 `git config user.name` 的值。
- 每个子模块独立建分支、独立合并、独立提交。
- 合并前后都检查 `git status --short`，确认没有意外改动。

## 脚本

- `scripts/readVersionLog.mjs`：读取远端版本记录。
- `scripts/buildMergeManifest.mjs`：按 `extends` 归并历史版本，输出最终待合并清单，并生成目标版本基线分支名。
- `scripts/createBaseBranch.js`：在子模块目录里基于当前 `HEAD` 创建基础新分支。
- `scripts/mergeSubmoduleTag.js`：在子模块目录里执行 `git merge --no-ff <tag>`。

## 参考

需要更具体的分支命名、包映射和命令细节时，读取 [参考文档](references/api_reference.md)。
