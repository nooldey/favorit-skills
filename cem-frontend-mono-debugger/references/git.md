# Git 与 Submodule 操作 git

本文件定义在 CEM 前端 mono 或同类多 submodule 仓库中如何识别真实修改位置、读取分支、查看 diff 和准备评审。任何 git 操作前先判断当前项目是否是多子仓模式。

## 基本原则

- 不在空白 mono 根仓执行无效搜索、diff、验证或 code review。
- 每个文件修改前先确认它属于哪个子 git 仓库。
- 不自动执行 `git add`、`git commit`、`git push`。
- 不回滚、覆盖或清理用户已有改动。
- 删除现有文件必须先获得用户批准；测试文件删除虽预批准，执行前仍需通知。

## 识别 mono 拓扑

优先顺序：

1. 读取 mono 根目录 `.gitmodules`，解析 `submodule.*.path`、`url` 和名称。
2. 若未找到 `.gitmodules`，检查隐藏文件读取权限、IDE 隐藏配置、`.gitignore` 和 `.vscode/settings.json`。
3. 仍无法读取时，执行只读命令：`git --no-pager submodule status --recursive`。
4. 结合 `.git/config` 的 `submodule.*` 配置确认路径。
5. 使用 `git --no-pager ls-files --stage` 查找 mode 为 `160000` 的 gitlink，校验是否为 submodule 编排。

必须输出一张子仓表：

| submodule | path | url | current commit | 备注 |
|---|---|---|---|---|

## 定位文件所属子仓

对每个候选文件：

1. 找到其路径命中的最长 submodule path。
2. 在该 path 内运行只读 git 状态命令确认它是 git 仓库。
3. 后续 `grep`、测试、lint、diff、branch、review 都以该子仓为工作目录。

## 读取变更与分支

在每个可能受影响子仓内读取：

- `git --no-pager status --short`
- `git --no-pager diff --stat`
- `git --no-pager diff --name-only`
- `git --no-pager branch --show-current`

若分支名为空，读取 `git --no-pager rev-parse --short HEAD` 并标注 detached HEAD。

## 多子仓变更清单模板

```markdown
### 变更子仓
| 子仓 | path | 分支 | 变更文件 | 验证 | 评审 |
|---|---|---|---|---|---|
|  |  |  |  |  |  |
```

## 常见错误

| 错误 | 风险 | 正确处理 |
|---|---|---|
| 在 mono 根仓运行 `git diff` 后认为没有改动 | 子仓 diff 被漏掉 | 遍历有改动的 submodule |
| 只看 package 路径不看 git 边界 | 在错误仓库验证或评审 | 用最长 submodule path 归属文件 |
| 在多个子仓改动后只记录一个分支 | 飞书回写无法追踪 | 每个有 diff 的子仓逐行记录 |
| 用删除/重置清理冲突 | 可能破坏用户改动 | 先报告并请求确认 |
