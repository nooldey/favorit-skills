# Meegle CLI 集成指南

> 本文件为 `cem-feishu-project-optimizer` 的 Meegle CLI（`@lark-project/meegle`）集成参考。
> Meegle CLI 是飞书项目官方命令行工具，覆盖 16 个业务域、50+ 命令，可作为 FeishuProjectMCP 和 lark-cli 的补充或替代工具链。

## 安装

```bash
npm install -g @lark-project/meegle
```

前置条件：Node.js >= 16。

## 认证

### 方式一：Device Code 流程（推荐，适合 Agent/无 TTY 环境）

```bash
# 持久化 host
meegle config set host project.feishu.cn

# Device Code 登录（输出授权 URL，用户在浏览器完成授权后自动退出）
meegle auth login --device-code

# 验证登录状态
meegle auth status
```

### 方式二：环境变量注入（适合 CI/完全无人值守）

```bash
export MEEGLE_TOKEN="your-token"
meegle auth status
```

### 方式三：浏览器 OAuth（人类用户）

```bash
meegle config set host project.feishu.cn
meegle auth login
```

## 配置

```bash
# 查看当前配置
meegle config show

# 设置配置项
meegle config set host project.feishu.cn

# 多环境 profile 管理
meegle config profile create prod
meegle config profile use prod
```

## 输出格式

所有命令支持 `-o` / `--output` 参数：

| 格式 | 说明 |
|------|------|
| `json` | 结构化 JSON（默认） |
| `table` | 表格形式 |
| `ndjson` | 每行一个 JSON，适合流式处理 |
| `raw` | 原始输出 |

配合 `--select` 做点路径投影，方便管道传递：

```bash
meegle workitem get --work-item-id 12345 --select "data.name"
```

## 安全建议

- 副作用操作前使用 `--dry-run` 预览请求
- 凭证由 OS keychain 存储，config 中可用 `${VAR}` 环境变量模板
- 多 profile 分离 staging / prod 环境

## 命令速查表

### 空间域

```bash
# 搜索空间（将空间名转为 project_key）
meegle project search --project-key cem
meegle project search --page-num 1
```

### 工作项域

```bash
# 查看工作项类型列表
meegle workitem meta-types --project-key cem

# 查看字段配置
meegle workitem meta-fields --project-key cem --work-item-type yt_user_feedback

# 查看角色配置
meegle workitem meta-roles --project-key cem --work-item-type yt_user_feedback

# 查看工作项详情
meegle workitem get --work-item-id 12345 --project-key cem

# 批量读取工作项（单次 <= 200 个 ID，3 并发）
meegle workitem +batch-get --project-key cem --work-item-ids "12345,12346,12347"

# MQL 查询
meegle workitem query --project-key cem --mql "SELECT name, status FROM story WHERE status = '进行中'"

# 查看操作记录
meegle workitem list-op-records --project-key cem --work-item-id 12345

# 创建工作项
meegle workitem create --project-key cem --work-item-type story \
  --params '{"fields":[{"field_key":"name","field_value":"新需求"},{"field_key":"priority","field_value":"P1"}]}'

# 更新工作项字段
meegle workitem update --work-item-id 12345 \
  --params '{"fields":[{"field_key":"name","field_value":"更新后的标题"}]}'
```

### 工作流域

```bash
# 查看节点详情（含子任务）
meegle workflow get-node --work-item-id 12345 --need-sub-task --project-key cem

# 节点流转
meegle workflow transition --work-item-id 12345 --action confirm --project-key cem

# 查看可流转状态
meegle workflow list-state-transitions --work-item-id 12345 --project-key cem

# 状态流转
meegle workflow transition-state --work-item-id 12345 --transition-id TRANS_ID --project-key cem

# 更新节点字段
meegle workflow update-node --work-item-id 12345 --node-id NODE_ID \
  --params '{"fields":[{"field_key":"field_xxx","field_value":"值"}]}'
```

### 视图域

```bash
# 获取视图下的工作项列表
meegle view get --view-id VIEW_ID --project-key cem --page-num 1

# 搜索视图
meegle view search --project-key cem --name "反馈视图"
```

### 工时域

```bash
# 查看工时记录
meegle workhour list-records --project-key cem --work-item-id 12345

# 查看人员排期（每次最多 20 人，跨度最大 3 个月）
meegle workhour list-schedule --project-key cem \
  --user-keys "user1,user2" --start-time "2026-05-01" --end-time "2026-05-31"
```

### 关联域

```bash
# 查看关联工作项
meegle relation list --project-key cem --work-item-id 12345

# 查看关联类型定义
meegle relation meta-definitions --project-key cem
```

### 评论域

```bash
# 添加评论
meegle comment add --work-item-id 12345 --content "评论内容" --project-key cem

# 查看评论列表
meegle comment list --work-item-id 12345 --project-key cem
```

### 工作台域

```bash
# 本周待办
meegle mywork todo --action this_week --page-num 1

# 已办事项
meegle mywork todo --action done --page-num 1

# 逾期事项
meegle mywork todo --action overdue --page-num 1
```

### 人员域

```bash
# 搜索用户（批量 <= 20）
meegle user search --user-keys "张三,李四" --project-key cem

# 查看当前登录用户
meegle user me

# 查看团队列表
meegle team list --project-key cem

# 查看团队成员
meegle team list-members --project-key cem --team-id TEAM_ID
```

### WBS 计划表

```bash
# 查看草稿行
meegle wbs list-draft-rows --project-key cem --work-item-id 12345

# 查看已发布实例行
meegle wbs list-instance-rows --project-key cem --work-item-id 12345

# 创建草稿
meegle wbs create-draft --project-key cem --work-item-id 12345

# 编辑草稿
meegle wbs edit-draft --project-key cem --work-item-id 12345 \
  --params '{"operation":"add","row":{"name":"新任务"}}'

# 发布草稿
meegle wbs publish-draft --project-key cem --work-item-id 12345
```

### URL 解析

```bash
# 离线解析飞书项目 URL
meegle url decode --url "https://project.feishu.cn/cem/workObjectView/yt_user_feedback/sYw7y3KNR"
```

输出示例：

```json
{
  "url_kind": "work_object_view",
  "project_key": "cem",
  "work_item_type": "yt_user_feedback",
  "view_id": "sYw7y3KNR"
}
```

## 字段值格式（STRING 协议）

`field_value` 协议层固定为字符串。标量直接作字符串；数组、对象必须先 `JSON.stringify` 再传。

| 字段类型 | 传参示例 |
|---------|---------|
| text / number / bool | `"测试工作项"` / `"100"` / `"true"` |
| user | `"7509072868295085608"` |
| multi-user | `"[\"7509072868295085608\",\"7509072868295085609\"]"` |
| select / radio | `"437794"` |
| multi-select | `"[{\"option_id\":\"111\"},{\"option_id\":\"222\"}]"` |
| date | `"1722182400000"` |
| schedule | `"[1722182400000,1722355199999]"` |
| workitem_related_select | `"145405865"` |
| workitem_related_multi_select | `"[145405865,145405866]"` |

## 与现有工具链的对应关系

| 现有工具/方式 | Meegle CLI 替代命令 | 适用场景 |
|---|---|---|
| FeishuProjectMCP `get_workitem_brief` | `meegle workitem get` | 查询工作项详情 |
| FeishuProjectMCP `get_view_detail` | `meegle view get` | 获取视图数据 |
| FeishuProjectMCP `list_workitem_comments` | `meegle comment list` | 查看评论 |
| FeishuProjectMCP `add_comment` | `meegle comment add` | 添加评论 |
| FeishuProjectMCP `get_workitem_man_hour_records` | `meegle workhour list-records` | 查看工时记录 |
| FeishuProjectMCP `list_schedule` | `meegle workhour list-schedule` | 查看人员排期 |
| FeishuProjectMCP `list_related_workitem` | `meegle relation list` | 查看关联工作项 |
| FeishuProjectMCP `get_node_detail` | `meegle workflow get-node` | 查看节点详情 |
| FeishuProjectMCP `list_wbs_draft_rows` | `meegle wbs list-draft-rows` | 查看 WBS 草稿 |
| FeishuProjectMCP `search_by_mql` | `meegle workitem query` | MQL 查询 |
| lark-cli `project +search` | `meegle project search` | 搜索空间 |
| lark-cli `docs +fetch` | — | 飞书文档读取（Meegle CLI 不覆盖） |
| lark-cli `sheets +read` | — | 电子表格读取（Meegle CLI 不覆盖） |

## 使用建议

1. **优先使用 FeishuProjectMCP**：MCP 工具与 Agent 集成更紧密，参数传递更自然
2. **Meegle CLI 作为补充**：当 MCP 功能缺失、鉴权失败或需要批量操作时，切换到 Meegle CLI
3. **lark-cli 保留用于文档/表格**：Meegle CLI 不覆盖飞书云文档和电子表格操作，这些场景继续使用 lark-cli
4. **批量操作首选 Meegle CLI**：`workitem +batch-get` 支持单次 200 个 ID 的并发读取，效率高于逐个 MCP 调用
5. **URL 解析使用 Meegle CLI**：`meegle url decode` 是离线工具，无需网络即可解析飞书项目 URL
