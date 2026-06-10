---
name: cem-frontend-merging-version-branches
description: Use when a `cem-frontend-mono` monorepo or other mono project needs one or more historical version branches merged into a target version; resolves remote version-log `extends` chains, builds the final merge manifest from `branches`, maps packages through `packageSubmodules`, creates versioned submodule branches, merges tags, stops on conflicts, and records branch output.
---

# cem-frontend-merging-version-branches

## Overview

用于多子仓 monorepo 的版本分支融合。输入通常是一个或多个历史版本和一个目标版本号，先按远端版本日志里的 `extends` 还原继承链，整理出最终待合并清单并先输出给用户，再把这些来源合并到对应子模块分支里。

## 概念

- 源版本：用户提供的一个或多个历史版本，决定最终要处理的包集合。
- 目标版本：要切换并合并到的版本，只提供工作基座和基线参考，不决定是否处理。
- 最终待合并清单：按源版本及其 `extends` 链路里最终生效的 `branches` key 归并，目标版本缺 key 也不能忽略该包。
- 命名依据版本：用于生成新分支名的版本引用，优先取源版本链 `sourceRef` 和目标版本同包 `branches` 记录中的较高者；若目标版本没有该 key，就沿用源版本链 `sourceRef`。

## 确认点

1. 先输出待处理子模块清单，至少包含：`name`、来源版本、来源分支、目标版本/tag、新分支名；用户确认清单无误后，才允许继续。
2. 本地创建或合并过程中，只要遇到错误、冲突、权限阻碍或任何需要继续前确认的情况，必须暂停并等待用户确认后再继续。
3. 本地创建和合并全部完成后，推送到远端 `origin` 前必须再次确认；推送动作必须在各子仓目录内单独执行，不能在主仓根目录统一推送。

## 红线

- 远端版本日志拉不下来时，必须先解决拉取问题，不能用本地数据兜底。
- 禁止臆想、猜测、推导要切换或合入的分支信息，必须以远端版本记录为准。
- 脚本运行出错时，不允许跳过，必须尝试重新申请权限或提高权限后重试，不能自定义补偿。
- 必须严格按事实执行，不捏造、不越权、不擅自跳过任何环节。
- 目标版本缺少某个包的 `branches` key 时，不准拿源版本 `sourceRef` 充当兜底基线；必须使用目标 checkout 的实际状态作为基线，拿不到可比较的目标基线就停，不要自定义补偿。
- 新分支的命名依据和合并基线不是同一个值，不能混用。

## 工作流

1. 在 monorepo 根目录执行 `yarn checkout --env=dev --ver=<目标版本号>`，等待所有子模块切换完成。
2. 立刻检查 `supports/engineering/rspack/publics/versions.json`，确认其中记载的 version 与目标版本一致。
3. 如果 `version` 不等于目标版本，或者该记录的 `branches` 为空，立刻中断后续流程，先排查 `yarn checkout` 是否仍在执行或切换失败，直到信息完整且校验通过再继续。
4. 读取一个或多个历史版本对应的版本对象，沿 `extends` 自底向上整理成继承链。
5. 按源版本及其继承链归并包名，只保留同一包在链路上最后生效的 `branches` 值。
6. 若传入版本之间无法通过 `extends` 证明继承关系，先中断并要求确认，不要自行拼接链路。
7. 先整理“最终待合并清单”，逐项输出给用户，内容至少包括：包名、解析后的路径、来源版本、来源分支/tag、基线分支/tag。
8. 输出清单后必须停住，等待用户确认按清单处理；没有确认前，不执行任何切换、建分支、合并动作。
9. 用户确认清单无误后，再用 `bin/utils/packageSubmodules.js` 的 `packageSubmodules` 映射，把包名解析成子模块相对路径。
10. 进入子模块目录前，先读取目标版本里该包在 `branches` 中记录的值；如果该值不存在，就使用目标 checkout 的实际状态作为基线。目标版本只参与基线选择，不参与是否处理的筛选；拿不到可比较的目标基线就停，不要回退到源版本 `sourceRef`。
11. 新分支命名先取“命名依据版本”，再用 `scripts/createBaseBranch.mjs` 在子模块目录里创建基础新分支，分支名按 `v<命名依据版本主版本>.<命名依据版本次版本+1>.0_mix_<git user.name>` 生成；命名依据优先取源版本链 `sourceRef` 和目标版本同包 `branches` 记录中的较高者。
12. 合并对应 tag 或 release 分支。
13. 如果出现冲突，立刻停止，报告子模块路径、冲突文件和当前分支名，不要自行猜测修复。
14. 如果没有冲突，提交合并结果，再继续下一个包。
15. 所有 key 处理完后，执行 `yarn branches record` 记录当前分支信息。
16. 本地处理完毕后，先按子仓逐个确认，再在对应子仓目录内执行 `git push origin <新分支名>` 推送到远端 `origin`；不要在主仓目录执行统一推送。

## 规则

- 只处理继承链上最终生效的 `branches` 里的 key。
- 分支后缀只使用 `git config user.name` 的值。
- 每个子模块独立建分支、独立合并、独立提交。
- 合并前后都检查 `git status --short`，确认没有意外改动。

## 脚本

- `scripts/readVersionLog.mjs`：读取远端版本记录。
- `scripts/buildMergeManifest.mjs`：按 `extends` 归并历史版本，输出最终待合并清单、合并基线和命名依据。
- `scripts/createBaseBranch.mjs`：在子模块目录里基于当前 `HEAD` 创建基础新分支。
- `scripts/mergeSubmoduleTag.mjs`：在子模块目录里执行 `git merge --no-ff <tag>`。

## 参考

需要更具体的分支命名、包映射和命令细节时，读取 [参考文档](references/api_reference.md)。
