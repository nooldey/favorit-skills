# 版本分支融合参考

## 版本记录

- 远端版本日志：
  `https://yunting-static-1251101074.cos.ap-shanghai.myqcloud.com/vers/prod-versions.json`
- 读取版本对象时，直接看该版本的 `extends` 和 `branches`。

## 角色定义

- 源版本：用户提供的一个或多个历史版本，决定最终要处理的包集合。
- 目标版本：要切换并合并到的版本，只提供基线参考，不决定是否处理。
- 目标版本缺少某个包的 `branches` key，不代表可以忽略该包。
- 命名依据版本：用于新分支命名，优先取源版本链 `sourceRef` 和目标版本同包 `branches` 记录中的较高者；若目标版本没有该 key，就沿用源版本链 `sourceRef`。

## 包路径

- 只从 `bin/utils/packageSubmodules.js` 的 `packageSubmodules` 按 key 查找路径。
- 不手工猜目录。

## 分支命名

```text
v<命名依据版本主版本>.<命名依据版本次版本+1>.0_mix_<git user.name>
```

## 必要前提

- `yarn checkout` 后必须核对 `supports/engineering/rspack/publics/versions.json`。
- `version` 必须等于目标版本，`branches` 不能为空。
- 远端版本日志拉不下来时，必须先解决拉取问题，不能本地兜底。
- 分支和 tag 信息必须以远端版本记录为准，不能臆想。
- 合并基线和新分支命名依据不能混为一谈。
- `buildMergeManifest.mjs` 输出里 `baselineRef` 为空时，表示该包要用目标 checkout 的实际 `HEAD` 作为合并基线。

## 脚本

- `scripts/readVersionLog.mjs`：读取远端版本记录。
- `scripts/buildMergeManifest.mjs`：生成最终待合并清单、合并基线和命名依据。
- `scripts/createBaseBranch.mjs`：创建基础新分支。
- `scripts/mergeSubmoduleTag.mjs`：合并 tag。

## 冲突处理

- 只要出现冲突就暂停。
- 报告冲突文件、子模块路径、当前分支名。
- 不自动猜测修复方案。
