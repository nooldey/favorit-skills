# Feedback 回收情况统计（内置子流程）

## 触发场景

当主技能 `cem-feishu-project-optimizer` 输出的规范化指令包满足以下条件时，执行本流程：
- `router = cem-feishu-project-optimizer`
- `task_type = stats`
- `target_skill = feishu-project-feedback-recycle-stats`
- `normalized_instruction` 包含“feedback 回收情况”或等价描述

## 输入契约

最小输入字段如下：

```json
{
  "router": "cem-feishu-project-optimizer",
  "task_type": "stats",
  "target_skill": "feishu-project-feedback-recycle-stats",
  "normalized_instruction": "",
  "parameters": {
    "project_key": "",
    "work_item_type": "",
    "view_id": "",
    "view_url": ""
  },
  "output_contract": {
    "format": "markdown",
    "must_include": ["统计汇总", "本周新增填写清单", "分层结果", "重点建议"]
  }
}
```

若 `parameters` 缺失，使用默认视图参数继续执行：
- `project_key = cem`
- `work_item_type = yt_user_feedback`
- `view_id = sYw7y3KNR`
- `view_url = https://project.feishu.cn/cem/workObjectView/yt_user_feedback/sYw7y3KNR`

### 数据源说明

统计使用两个独立视图分别获取已上线数据：
- **已上线未填写客户声音**：独立视图，URL `https://project.feishu.cn/cem/workObjectView/yt_user_feedback/QOIjVgcDg?scope=workspaces&node=28494009`
  - view_id: `QOIjVgcDg`
  - 筛选条件：已上线 + 客户声音 为空
- **已上线已填写客户声音**：独立视图，URL `https://project.feishu.cn/cem/workObjectView/yt_user_feedback/JMqybKtDR?scope=workspaces&node=28720388`
  - view_id: `JMqybKtDR`
  - 筛选条件：已上线 + 客户声音 不为空

两个都是已上线数据的独立视图，分别统计。
所有统计数据严格按照实际视图数据和工作项为事实依据输出，禁止mock数据或自行推断！

## 执行流程

### 步骤1：解析视图参数

目标：确定 `project_key`、`work_item_type`、`view_id`。

```text
IF parameters.view_url 存在:
    从 URL 解析 project_key、work_item_type、view_id
ELSE:
    使用默认视图参数
```

### 步骤2：获取视图工作项列表

目标：分别从两个独立视图获取已上线已填写和已上线未填写的工作项 ID 列表。

**步骤2.1：获取已上线未填写客户声音列表**

从独立视图（view_id: `QOIjVgcDg`）获取所有已上线且未填写客户声音的工作项：

```json
{
  "view_id": "QOIjVgcDg",
  "project_key": "cem",
  "page_num": 1
}
```

分页获取所有工作项，得到 `unfilled_count` 和 `unfilled_work_item_ids`。

**步骤2.2：获取已上线已填写客户声音列表**

从独立视图（view_id: `JMqybKtDR`）获取所有已上线且已填写客户声音的工作项：

```json
{
  "view_id": "JMqybKtDR",
  "project_key": "cem",
  "page_num": 1
}
```

分页获取所有工作项，得到 `filled_count` 和 `filled_work_item_ids`。

**汇总：**
- `total_count = filled_count + unfilled_count`
- `fill_rate = (filled_count / total_count) × 100%` 

### 步骤3：筛选本周新增填写项

目标：在已填写的 `filled_work_item_ids` 中，通过操作记录筛选出本周（统计日前推至本周一）更新了“客户声音”字段的工作项。

1. **确定时间范围**：`start_time` 为本周一 00:00:00，`end_time` 为统计日 23:59:59。
2. **查询操作记录**：对 `filled_work_item_ids` 中的每一项，调用 `get_workitem_op_record`。
   - `op_record_module = ["field_mod"]`
   - `operation_type = ["modify", "create"]`
3. **匹配字段**：在返回的记录中，寻找 `field_key = "field_57aa16"`（客户声音）且 `updated_at` 在本周范围内的记录。
4. **生成清单**：汇总满足条件的工作项，记录其 ID、名称、**开发上线时间**及最新填写的客户声音内容。
5. **内容完整**： 客户声音内容在统计表格中要体现完整的文本内容，不要省略缺失文本。

### 步骤4：生成 Markdown 报告

目标：确认两个关键字段的 `field_key`。

调用A（客户声音字段）：

```json
{
  "page_num": 1,
  "project_key": "cem",
  "work_item_type": "yt_user_feedback",
  "field_query": "客户声音"
}
```

调用B（开发上线时间字段）：

```json
{
  "page_num": 1,
  "project_key": "cem",
  "work_item_type": "yt_user_feedback",
  "field_query": "开发上线时间"
}
```

常见字段映射：
- 客户声音：`field_57aa16`
- 开发上线时间：`field_d7593a`

### 步骤4：批量查询工作项详情

目标：仅需要获取**未填写客户声音列表**中每个工作项的开发上线时间字段值。已填写列表由快速筛选保证准确性，无需重新校验。

批量策略：
- 每批 10-15 个工作项
- 并行请求

```json
{
  "work_item_id": "工作项ID",
  "project_key": "cem",
  "fields": ["field_d7593a"]
}
```

### 步骤5：统计汇总

基础指标（来自步骤2，两个快速筛选直接给出）：
- `filled_count`：已填写客户声音数量（来自快速筛选）
- `unfilled_count`：未填写客户声音数量（来自快速筛选）
- `total_count = filled_count + unfilled_count`
- `fill_rate = (filled_count / total_count) × 100%`

分层标准（仅针对 `unfilled_items`）：
- 第1层：超过 30 天
- 第2层：15-30 天（含15，不含30）
- 第3层：7-15 天（含7，不含15）
- 第4层：7 天内（不含7）

排除规则：
- 如果指定排除开发上线时间早于某个日期（如 `2026-01-01`），需要将这些条目从统计中排除

```javascript
const now = Date.now();
const cutoffDate = new Date('2026-01-01').getTime();
unfilled_items.forEach(item => {
  const deployTime = item.deploy_time;
  // 如果配置了排除条件，且有明确开发上线时间且早于截止日期，排除
  if (cutoffDate && deployTime && deployTime < cutoffDate) {
    return;
  }
  if (!deployTime) {
    count_within_7d++;
    return;
  }
  const diffDays = (now - deployTime) / (1000 * 60 * 60 * 24);
  if (diffDays > 30) count_30d_plus++;
  else if (diffDays >= 15) count_15d_to_30d++;
  else if (diffDays >= 7) count_7d_to_15d++;
  else count_within_7d++;
});
```

### 步骤6：输出并回传主技能

必须满足：
- `output_contract.format`
- `output_contract.must_include`

默认只回传主技能，不主动落盘。仅在主技能明确要求时写入项目根目录，文件名格式：`YYYY-MM-DD-反馈统计报告.md`。

## 输出模板

```markdown
## 统计结果

**填写了"客户声音"字段的 feedback 数量：X 条**

### 本周新增客户声音反馈清单

以下是**本周（YYYY-MM-DD 至 YYYY-MM-DD）**新填写了“客户声音”字段的 Feedback 工作项清单：

| 工作项 ID | 工作项名称 | 客户声音内容 | 开发上线时间 | 填写时间 |
|---|---|---|---|---|
| ID1 | 名称1 | 内容1 | 2026-03-27 | 2026-04-03 |
| ID2 | 名称2 | 内容2 | 2026-03-27 | 2026-04-03 |

---

### 汇总

- **视图总 feedback 数**：N 条
- **填写客户声音字段**：X 条
- **未填写客户声音字段**：Y 条
- **填写率**：Z%

### 未填写客户声音字段的分层统计（按开发上线时间）

| 层级 | 时间范围 | 数量 | 占比 |
|---|---|---|---|
| 第1层 | 超过30天 | A 项 | A/Y × 100% |
| 第2层 | 15天-30天 | B 项 | B/Y × 100% |
| 第3层 | 7天-15天 | C 项 | C/Y × 100% |
| 第4层 | 7天内 | D 项 | D/Y × 100% |

**总计**：A + B + C + D = Y 项

### 重点关注建议

1. **第1层（超过30天）**：A 项，建议立即跟进
2. **第2层（15天-30天）**：B 项，建议尽快处理
```
