# 版本分支融合参考

## 版本记录来源

版本信息从远端 JSON 读取：

```text
https://yunting-static-1251101074.cos.ap-shanghai.myqcloud.com/vers/prod-versions.json?timestamp=1780906190234
```

处理前先从这里取目标版本和源版本对应的版本对象，再读取该对象的 `branches` 属性，按 key 逐个合并。

## 包路径定位

优先级如下：

1. 在 `bin/utils/packageSubmodules.js` 的 `packageSubmodules` 里按 key 查找
2. 只使用仓库中可稳定解析到的路径，不手工猜目录

## 分支命名

分支名格式：

```text
v<主版本>.<次版本+1>.0_<git user.name>
```

示例：

- `v2.1.3` -> `v2.2.0_zhangsan`
- 只增加第二段版本号，最后一段固定为 `0`

## 合并顺序

1. 根目录执行 `yarn checkout --env=dev --ver=<源版本>`
2. 对每个 key 进入对应子模块目录
3. 基于当前 `HEAD` 建分支
4. 合并指定 tag 或 release 分支
5. 无冲突则提交
6. 继续下一个 key
7. 全部完成后执行 `yarn branches record`

## 冲突处理

- 只要出现冲突就暂停
- 报告冲突文件、子模块路径、当前分支名
- 不自动猜测修复方案

## 建议检查

- 合并前后运行 `git status --short`
- 记录起始 `HEAD`，方便回溯
- 遍历完所有 key 后核对是否有遗漏
