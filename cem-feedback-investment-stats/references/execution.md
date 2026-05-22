# Feedback 研发投入统计执行细则

## MCP 调用顺序

### 1. 视图数据

使用 `get_view_detail`：

```json
{
  "project_key": "cem",
  "view_id": "视图ID",
  "fields": ["_all"],
  "page_num": 1
}
```

如果用户提供的是 URL，直接传 `url`，让工具解析视图参数。需要完整结果时，从 `page_num=1` 开始递增，直到返回不足一页或没有更多数据。

如果 `get_view_detail` 报错，停止后续统计，输出报错的工具名、视图 URL/ID、字段参数和原始错误信息；不要改用其他视图、历史报告或本地缓存继续统计。

视图返回成功后先锁定 feedback 集合：

| 场景 | 处理 |
|---|---|
| 用户要求视图全量 | 视图返回的 feedback 全部纳入统计，不再按上线时间二次过滤 |
| 用户给定上线时间范围 | 按上线时间字段做闭区间筛选；字段缺失的 feedback 保留并在缺失记录中标注 |
| 视图分页 | 从第 1 页开始逐页取完；不得只取首页后生成报告 |
| 视图为空 | 输出空表和查询成功记录，不补历史数据 |

### 2. 字段配置

查询 feedback 字段：

```json
{
  "project_key": "cem",
  "work_item_type": "yt_user_feedback",
  "field_query": "开发上线时间",
  "page_num": 1
}
```

常见字段：

| 语义 | 常见字段名 | 常见字段 key |
|---|---|---|
| 开发上线时间 | 开发上线时间 | `field_d7593a` |
| 客户声音 | 客户声音 | `field_57aa16` |

不要硬编码字段 key；常见字段只作为匹配失败时的提示。

当前固定口径下，如果视图结果已直接返回以下字段，可以直接使用，不需要每次查询字段配置：

| 语义 | 固定字段 |
|---|---|
| Feedback 关联 Story | `field_255b77`、`field_b70230` |
| Task 关联 Story | `field_2c5aa5` |
| Task 预估耗时 | `field_fb844a` |
| Task 实际耗时 | `field_23cb2b` |
| Task 岗位分类 | `field_9a3d14` |

如果固定字段读取失败，必须记录失败字段；可以查询字段配置确认，但不能自行替换成语义相似字段后继续统计。

### 3. feedback 到 Story

优先使用关联字段：

```json
{
  "project_key": "cem",
  "work_item_id": "feedback_id",
  "relation_field_key": "字段key",
  "page_num": 1,
  "page_size": 50
}
```

如果只有关系名，使用 MQL 高级语法。关系名以用户输入或字段配置为准，不要自行改写：

```sql
SELECT `工作项ID`, `名称`
FROM `cem`.`yt_user_feedback`
WHERE any_relation_match(relation('关系名'), x -> x.`工作项类型<target:all>` = 'story')
```

如果查询失败，只修正报错指出的字段或关系部分，不要大面积改写 MQL。

如果修正后仍失败，在报告中保留该 feedback 的视图数据，并把关联查询错误写入“数据缺失与报错记录”；不要根据名称相似度猜测 Story。

固定字段在视图结果中返回 Story 对象或 ID 时，直接解析为关联 Story；同一 feedback 的两个关联字段合并后按 Story ID 去重。

### 4. Story 下子 task

首选查询 Story 节点和子任务：

```json
{
  "project_key": "cem",
  "work_item_id": "story_id",
  "need_sub_task": true,
  "field_key_list": ["_all"]
}
```

如果子任务以计划表行存在：

```json
{
  "project_key": "cem",
  "work_item_id": "story_id",
  "row_field_list": ["base.*", "meta.*"],
  "need_structure": true,
  "page_no": 1,
  "page_size": 50
}
```

如果需要从子任务类型反查父 Story，使用 MQL 的子任务父工作项固定写法：

```sql
SELECT `工作项ID`, `名称`, relation_field_chain('__父工作项')
FROM `cem`.`sub_task`
WHERE any_relation_match(relation_field_chain('__父工作项'), x -> x.`工作项ID<target:all>` = '<story_id>')
```

当前固定口径优先使用 Task 对 Story 的关联字段反查：

```sql
SELECT `工作项ID`, `名称`, `关联 Story`, `职务类型`, `预估时间（h）`, `实际工作时间（h）`, `状态`
FROM `cem`.`65f98267c45577d0d95ea17b`
WHERE any_match(`关联 Story`, x -> x in ('<story_id_1>', '<story_id_2>'))
```

当前空间中的“开发任务 Task”工作项类型 key 为 `65f98267c45577d0d95ea17b`；不要误用系统内置 `sub_task`，否则 MQL 会出现字段 label 找不到。

如果 MQL 返回的 task ID 为空或为 `0`，不要自行生成 task ID；明细中展示 task 名称、岗位、预估、实际和状态，并在缺失记录中说明 task ID 不可用。

## 工时字段取值

### 预估耗时

按优先级读取：

1. 子任务排期估分：`points`、`schedule_point`、`schedule_point_value`。
2. WBS 行估分：`base.schedule` 或 `update_schedule_points` 对应字段。
3. 节点/任务字段中的“预估耗时”“开发预估耗时”“估分”。

归一规则：

| 单位 | 小时折算 |
|---|---:|
| 小时 | 原值 |
| 天 | `值 * hours_per_day` |
| 周 | `值 * 5 * hours_per_day` |
| 未知 | 保留原值并标注“单位未知” |

### 实际耗时

按优先级读取：

1. `get_workitem_man_hour_records` 返回的工时登记记录。
2. WBS 行实际工时：`actual_time`、`schedule_actual_times` 等字段。
3. task 字段中的“实际耗时”“实际工时”。

同一 task 多条工时记录要累加；同一人员多次登记不去重。

如果 Task 查询或工时字段读取报错，保留已成功获取的上游 feedback/Story 数据，并在对应行标记“Task 查询失败”或“工时查询失败”；不要用历史工时、人员经验或任务名称估算工时。

研发组开发自测时间只有在存在明确 task、字段或工时记录时才统计；没有明确记录时必须在报告中标注“研发组开发自测时间缺少明确记录未统计”。

## 分类规则

按顺序判定，命中即停止：

| 分类 | 优先匹配来源 | 关键词 |
|---|---|---|
| 前端 | 角色、负责人组、节点、任务名 | `前端`、`FE`、`Frontend`、`Web`、`H5` |
| 后端 | 角色、负责人组、节点、任务名 | `后端`、`BE`、`Backend`、`Server`、`RD` |
| 测试 | 角色、负责人组、节点、任务名 | `测试`、`QA`、`Test`、`验收` |

无法分类时输出“未归类”。不要用人员姓名硬编码分类，除非用户提供团队成员映射。

组别统计：

| 组别 | 包含分类 | 说明 |
|---|---|---|
| 研发组 | 前端、后端 | 按前端 1 人、后端 1 人计算可用人天 |
| 测试组 | 测试 | 测试为灵活借用资源，单独统计借用投入 |

## 汇总口径

### 单个 feedback

每个 feedback 的统计包含：

- `feedback_id`
- `feedback_name`
- `deploy_time`
- `story_count`
- `task_count`
- `frontend_estimated_hours`
- `frontend_actual_hours`
- `backend_estimated_hours`
- `backend_actual_hours`
- `test_estimated_hours`
- `test_actual_hours`
- `uncategorized_estimated_hours`
- `uncategorized_actual_hours`
- `total_estimated_hours`
- `total_actual_hours`

### 全局汇总

同时输出两个口径：

1. **按 feedback 累计**：同一个 Story/task 被多个 feedback 关联时，分别计入各自 feedback。
2. **去重累计**：按 task ID 去重；无 task ID 时按 `story_id + task_name + node_name` 去重。

如果本次数据没有发现共享 Story/task，报告只需输出单一汇总，并在缺失记录中说明未发现共享重复；不要强行添加空的去重汇总表。

### 精要统计卡片

维度宽表上方必须输出精要统计卡片：

| 指标 | 计算 |
|---|---|
| 总实际耗时 | 前端实际 + 后端实际 + 测试实际 + 未归类实际 |
| 总预估耗时 | 前端预估 + 后端预估 + 测试预估 + 未归类预估 |
| 平均每个 feedback 实际耗时 | 总实际耗时 / feedback 数 |
| 平均每个 feedback 预估耗时 | 总预估耗时 / feedback 数 |
| 实际人天投入成本 | 总实际耗时换算为人天，仅输出数值 |
| 预估人天投入成本 | 总预估耗时换算为人天，仅输出数值 |
| 统计区间工作日 | 按用户给定区间和中国调休日历计算 |
| 研发组实际投入 | 前端实际 + 后端实际，同时输出小时与人天 |
| 研发组可用人天 | 工作日 * 2 人 |
| 研发组投入占比 | 研发组实际人天 / 研发组可用人天 |
| 测试组实际借用投入 | 测试实际，同时输出小时与人天 |
| 测试组预估借用投入 | 测试预估，同时输出小时与人天 |

不要在卡片中解释人天换算公式；只有用户追问时再解释。

## 失败处理矩阵

| 失败点 | 处理 |
|---|---|
| `get_view_detail` 报错 | 停止统计，输出工具名、参数、原始错误 |
| 视图字段缺失 Story 关联 | feedback 保留，Story/Task 计 0，缺失记录标注 |
| MQL 报错 | 保留 feedback/Story，Task 计 0，输出 MQL 和原始错误 |
| Task 工时字段为空 | 空值按 0 统计，并在缺失记录标注 |
| Task 分类不在前端/后端/测试 | 进入未归类，不并入三类 |
| task ID 为空或为 0 | 不展示伪 ID，按 task 名称等信息追溯 |

## Markdown 输出结构

```markdown
# Feedback 研发投入统计报告

统计目标：飞书项目 feedback 视图 `view_id` 全量数据或指定上线时间闭区间。

## 汇总

| Feedback 数 | Story 数 | Task 行数 | 前端预估(h) | 前端实际(h) | 后端预估(h) | 后端实际(h) | 测试预估(h) | 测试实际(h) | 预估合计(h) | 实际合计(h) |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|

## 统计卡片

| 指标 | 数值 |
|---|---:|

说明：研发组开发自测时间缺少明确记录，本次未纳入统计。

## Feedback 维度宽表

| Feedback ID | Feedback 名称 | 上线时间 | 关联 Story | Story 数 | Task 行数 | 前端预估(h) | 前端实际(h) | 后端预估(h) | 后端实际(h) | 测试预估(h) | 测试实际(h) | 预估合计(h) | 实际合计(h) | Task 明细 |
|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|

## 数据缺失与报错记录

- 列出工具调用成功/失败、缺失关联、缺失预估、缺失实际工时、未归类任务。
- 明确声明没有使用默认视图、历史报告或自行推导的数据。
```
