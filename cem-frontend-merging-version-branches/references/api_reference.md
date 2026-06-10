# 版本分支融合参考

## 版本记录来源

版本信息从远端 JSON 读取：

```text
https://yunting-static-1251101074.cos.ap-shanghai.myqcloud.com/vers/prod-versions.json
```

处理前先从这里取一个或多个历史版本对应的版本对象，再沿 `extends` 还原继承链。

## 归并规则

1. 先按 `extends` 把输入版本排成从旧到新的继承链。
2. 同一个包名如果在多层版本里重复出现，只取继承链上更高版本的 `branches` 值。
3. 如果两个输入版本之间无法通过 `extends` 证明祖先-后代关系，先中断，不要自行拼链。
4. 最终得到的生效包列表，先整理成待合并清单并输出给用户。
5. 清单至少包含：包名、子模块路径、来源版本、来源分支/tag、目标版本中该包的基线分支/tag。
6. 用户确认清单后，再按 key 逐个合并到目标版本。

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
- 只处理继承链上最终生效的 `branches` 里的 key。
- 只使用 `packageSubmodules` 可解析到的路径。
- 新分支必须基于目标版本里该包记录的 `branches` 值起算，而不是当前工作区里已有分支名。

## 冲突处理

- 只要出现冲突就暂停。
- 报告冲突文件、子模块路径、当前分支名。
- 不自动猜测修复方案。

## 建议检查

- 合并前后运行 `git status --short`
- 记录起始 `HEAD`，方便回溯
- 遍历完所有 key 后核对是否有遗漏
