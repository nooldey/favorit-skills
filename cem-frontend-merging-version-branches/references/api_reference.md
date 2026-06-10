# 版本分支融合参考

## 版本记录来源

版本信息从远端 JSON 读取：

```text
https://yunting-static-1251101074.cos.ap-shanghai.myqcloud.com/vers/prod-versions.json
```

处理前先从这里取一个或多个历史版本对应的版本对象，再沿 `extends` 还原继承链。

## 概念边界

- 源版本决定最终待合并清单的包集合。
- 目标版本只决定这些包的优先基线，不决定是否处理。
- 若目标版本没有某个包的 `branches` key，也不能忽略该包。

## 归并规则

1. 先按 `extends` 把输入版本排成从旧到新的继承链。
2. 同一个包名如果在多层版本里重复出现，只取继承链上更高版本的 `branches` 值。
3. 如果两个输入版本之间无法通过 `extends` 证明祖先-后代关系，先中断，不要自行拼链。
4. 最终得到的生效包列表，直接整理成待合并清单并输出给用户，筛选条件只看源版本继承链上最终生效的包名集合。
5. 清单至少包含：包名、子模块路径、来源版本、来源分支/tag、基线分支/tag。
6. 基线优先取目标版本 `branches` 中对应 key；如果目标版本没有该 key，就回退到该包最终生效的 `sourceRef`。目标版本只参与基线选择，不参与是否处理的筛选。
7. 用户确认清单后，再按 key 逐个合并到目标版本。

## 包路径定位

优先级如下：

1. 在 `bin/utils/packageSubmodules.js` 的 `packageSubmodules` 里按 key 查找
2. 只使用仓库中可稳定解析到的路径，不手工猜目录

## 分支命名

分支名格式：

```text
v<该包基线版本主版本>.<该包基线版本次版本+1>.0_mix_<git user.name>
```

示例：

- `v2.1.3` -> `v2.2.0_mix_zhangsan`
- 只增加第二段版本号，最后一段固定为 `0`

## 合并前提

- `yarn checkout` 后必须先核对 `supports/engineering/rspack/publics/versions.json`，版本不对就中断。
- 最终清单按源版本继承链上最终生效的包生成，不因为目标版本缺 key 而忽略。
- 只使用 `packageSubmodules` 可解析到的路径。
- 新分支必须基于目标版本里该包记录的 `branches` 值起算；目标版本没有时，回退到该包最终生效的 `sourceRef`。
- 基础新分支用 `scripts/createBaseBranch.js` 创建。

## 辅助脚本

- `scripts/readVersionLog.mjs`：读取远端版本记录。
- `scripts/buildMergeManifest.mjs`：输出最终待合并清单，包含来源版本、来源分支/tag、目标基线分支和新分支名。
- `scripts/createBaseBranch.js`：在当前子模块目录创建基础新分支。
- `scripts/mergeSubmoduleTag.js`：在当前子模块目录合并 tag。

## 冲突处理

- 只要出现冲突就暂停。
- 报告冲突文件、子模块路径、当前分支名。
- 不自动猜测修复方案。

## 建议检查

- 合并前后运行 `git status --short`
- 记录起始 `HEAD`，方便回溯
- 遍历完所有 key 后核对是否有遗漏
