---
name: cem-feedback-investment-stats
version: 1.0.0
description: "飞书项目 Feedback 研发投入统计：根据飞书项目视图和给定上线时间范围，统计 feedback、关联 Story、Story 下子 task、task 预估耗时和实际耗时，并按前端、后端、测试分类汇总。用户需要分析 feedback 投入产出、研发投入耗时、关联 Story/子任务工时时使用。"
metadata:
  requires:
    bins: ["lark-cli"]
    skills: ["lark-shared", "cem-feishu-project-optimizer", "feishu-project-connector"]
---

# Feedback 研发投入统计

> 前置条件：如需使用 lark-cli 写入飞书文档或表格，先阅读 [`../lark-shared/SKILL.md`](../lark-shared/SKILL.md)。飞书项目数据获取优先使用 FeishuProjectMcp。
> 默认前提：通过FeishuProjectMcp请求飞书视图（https://project.feishu.cn/cem/workObjectView/yt_user_feedback/SH2XreAvR）的数据。

## 适用场景

- 根据飞书项目视图统计一段上线时间内每个 feedback 的研发投入。
- 从 feedback 追踪关联 Story，再追踪 Story 下子 task 列表。
- 统计 task 的开发预估耗时、实际耗时，并分类为前端、后端、测试。
- 输出用于判断 feedback 投入产出的 Markdown 报告，必要时同步到飞书文档或电子表格。

## 输入参数

最小输入：

```json
{
  "project_key": "cem",
  "feedback_work_item_type": "yt_user_feedback",
  "feedback_view_url": "",
  "feedback_view_id": "",
  "deploy_start": "2026-05-01",
  "deploy_end": "2026-05-15"
}
```

可选输入：

```json
{
  "story_work_item_type": "story",
  "task_work_item_type": "sub_task",
  "deploy_field_name": "开发上线时间",
  "feedback_story_relation_name": "",
  "feedback_story_relation_field": "",
  "hours_per_day": 8,
  "output_path": "outputs/YYYY-MM-DD_Feedback研发投入统计报告.md",
  "publish_to_doc_url": "",
  "publish_to_sheet_url": ""
}
```

缺失 `project_key`、视图 URL/ID、上线时间范围时，先从用户上下文或飞书项目 URL 解析；仍无法确定时再追问。不要自行切换为默认视图。

## 数据源优先级

1. **FeishuProjectMcp**：获取视图、字段配置、关联工作项、Story 节点/子任务、工时记录。
2. **MQL**：当普通 MCP 工具无法表达关联链时，使用 `search_by_mql` 的 `relation_field_chain`、`relation`、`linked_work_item`、`__父工作项` 语法补充查询。
3. **lark-cli**：只用于飞书云文档/电子表格读写、资源搜索、认证授权，不用于替代飞书项目 MCP 查询，也不能作为飞书项目统计数据的兜底来源。

## 固定统计口径

- Feedback 以用户提供的飞书项目视图返回数据为统计全集；用户明确“以视图为准”时，不再用本地历史文件、默认视图或名称相似度补齐。
- 视图字段中存在上线时间时，按用户给定上线时间闭区间筛选；用户明确要求“视图全量数据”时，不再额外按时间过滤。
- Feedback 关联 Story 读取 `关联需求 field_255b77`、`补充关联需求 field_b70230`。
- Task 读取开发任务 Task，使用 `关联 Story field_2c5aa5` 反查。
- Task 预估耗时读取 `预估时间（h）field_fb844a`；Task 实际耗时读取 `实际工作时间（h）field_23cb2b`。
- 岗位分类读取 `职务类型 field_9a3d14`，仅统计前端、后端、测试；其他岗位保留为“未归类”，不并入三类。
- 前端与后端合并为“研发组”；测试独立为“测试组”。测试组属于借用投入，不计入研发组持久人天。
- 研发组开发自测时间缺少明确字段或工时记录时不纳入统计，并在报告中标明“研发组开发自测时间缺少明确记录未统计”。
- 人天是报告展示单位，报告只输出数值，不解释隐含换算公式，除非用户追问。
- 上述口径属于 Skill 固定规则，报告正文不要单独输出“数据来源与口径”章节；仅在“数据缺失与报错记录”中记录查询成功/失败和缺失字段。

禁止 mock 数据。统计目标必须以用户提供的飞书项目视图返回结果为准；字段缺失、关联缺失、工时缺失都必须在报告中标注。

如果视图、字段、关联、MQL 或工时查询报错，直接把具体工具、参数和报错信息写入输出，不要为了完成报告而使用默认视图、历史报告、本地旧文件或自行推导的数据补齐。

## 执行流程

详细查询策略见 [`references/execution.md`](references/execution.md)。

### 1. 解析视图与字段

- 若输入为视图 URL，优先让 MCP 工具从 URL 解析 `project_key`、`work_item_type`、`view_id`。
- 调用 `list_workitem_field_config` 确认 feedback 的上线时间字段，默认按字段名“开发上线时间”匹配。
- 调用 `list_workitem_field_config`、`list_workitem_relations` 确认 feedback 到 Story 的关联字段或关系。
- 已知固定字段能直接满足统计时，可以直接使用固定字段；如果工具报字段不存在，再回到字段配置查询确认。

### 2. 获取并筛选 feedback

- 调用 `get_view_detail` 分页获取视图下全部 feedback。
- 用上线时间字段筛选 `deploy_start 00:00:00` 到 `deploy_end 23:59:59` 的工作项。
- 保留 feedback ID、名称、上线时间、客户声音、租户或来源字段；字段不存在时置为“未提供”。

### 3. 查询关联 Story

按以下顺序尝试：

1. 已知关联字段：`list_related_workitem(relation_field_key=...)`。
2. 已知关系 ID：`list_related_workitem(relation_id=...)`。
3. 关系链：`search_by_mql` 使用用户给定关系名，不擅自猜测关系名称。

同一 feedback 关联多个 Story 时全部纳入；Story 被多个 feedback 复用时，在全局汇总中去重，在单个 feedback 明细中保留并标注“共享 Story”。

### 4. 查询 Story 下子 task

优先调用：

- `get_node_detail(need_sub_task=true)` 获取 Story 节点和节点子任务。
- 如子任务是正式工作项或计划表行，再用 `list_wbs_instance_rows` 或 `search_by_mql FROM sub_task` 补齐任务 ID、负责人、角色、预估、实际工时。
- 查询实际工时优先调用 `get_workitem_man_hour_records`。

### 5. 工时归一与分类

- 预估耗时优先取 task 排期估分；单位为天时按 `hours_per_day` 折算，默认 8 小时/天。
- 实际耗时优先取工时登记记录；无记录时取计划表实际工时；仍缺失时记为 0，并在缺失说明列出。
- 分类顺序：角色/负责人类型 > task 所属节点 > task 名称关键词。
- 只统计三类：前端、后端、测试；无法归类的任务单独列为“未归类”，不强行并入三类。

### 6. 输出报告

Markdown 文件默认写入 `outputs/`：

```text
outputs/{YYYY-MM-DD}_Feedback研发投入统计报告.md
```

报告必须包含：

- 精要统计卡片：总耗时、平均每个 feedback 耗时、总人天、统计区间工作日、研发组人天与测试组借用人天。
- 每个 feedback 的关联 Story 和 task 明细。
- 每个 feedback 的前端、后端、测试预估/实际耗时。
- 全局汇总、缺失数据说明、工具查询成功/失败说明。
- 投入产出观察：仅基于已获取的产出字段，如客户声音、租户、Story 状态、上线时间；不要编造收入、价值分或效果数据。

报告不要包含：

- “数据来源与口径”章节。
- 固定字段 key 列表，除非字段缺失或查询报错需要说明。
- 人天换算公式说明，除非用户明确要求解释。

### 7. 可选同步到飞书

仅当用户明确要求时使用 lark-cli：

```bash
# 写入云文档，需先按 lark-shared 完成授权
lark-cli docs +update --doc "<doc_url_or_token>" --mode append --markdown "<报告正文>" --as user

# 写入电子表格前，先读取 lark-sheets 技能确认 token、sheet_id、range
lark-cli sheets +write --url "<sheet_url>" --range "<sheetId>!A1" --values '[[]]' --as user
```

写入前先说明目标文档或表格；不要输出 token。

## 质量校验

- feedback 数量必须与视图筛选后数量一致。
- 如果用户要求“以视图为准”，feedback 数量必须与该视图返回总数一致，不得额外按历史默认条件过滤。
- 每个 feedback 的 Story 数、task 数、分类工时要能追溯到明细行。
- 全局合计需说明是否发现共享 Story/task；发现共享时再给出“按 feedback 归属累计”和“Story/task 去重累计”。
- 若 MCP 返回分页，必须翻页到无更多数据。
- 时间统一使用 Asia/Shanghai，日期区间为闭区间。
