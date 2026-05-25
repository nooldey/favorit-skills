---
name: cem-feedback-investment-stats
version: 1.0.0
description: "飞书项目 Feedback 研发小组投入产出汇报：根据飞书项目视图、指定时间区段和研发小组成员，统计 feedback 回收情况、客户声音、关联 Story/Task、成员投入、预估/实际耗时和产出证据，形成面向 leader 的资源投放总览与逐 feedback 明细报告。用户需要分析研发资源消耗、投入产出、工时事实依据和可追溯明细时使用。"
metadata:
  requires:
    bins: ["lark-cli"]
    skills: ["lark-shared", "cem-feishu-project-optimizer", "feishu-project-connector"]
---

# Feedback 研发小组投入产出统计

> 前置条件：如需使用 lark-cli 写入飞书文档或表格，先阅读 [`../lark-shared/SKILL.md`](../lark-shared/SKILL.md)。飞书项目数据获取优先使用 FeishuProjectMcp。
> 默认前提：通过 FeishuProjectMcp 请求用户指定的飞书项目 feedback 视图数据。历史回收统计能力已合并到本 Skill，不再单独路由到 `feishu-project-feedback-recycle-stats`。

## 适用场景

- 面向 leader 汇报指定时间区段内研发小组的资源投放、消耗结构、投入产出和风险点。
- 让 leader 同时掌握“总体资源投放视角”和“各 feedback 投入资源细节视角”。
- 按研发小组成员、岗位分类、feedback、Story、Task 多维度统计投入与产出。
- 根据飞书项目视图统计一段上线时间内每个 feedback 的回收状态与研发投入。
- 统计已上线 feedback 的客户声音填写率、未填写分层和本周新增填写清单。
- 在现有研发投入报告中补充每个 feedback 的客户声音录入内容，内容必须完整呈现，不做摘要替代。
- 从 feedback 追踪关联 Story，再追踪 Story 下子 task 列表。
- 统计 task 的开发预估耗时、实际耗时，并分类为前端、后端、测试。
- 输出用于判断研发资源消耗、feedback 回收、投入产出的 Markdown 汇报，必要时同步到飞书文档或电子表格。

## 设计目标

- **Leader 总览优先**：报告首屏必须回答研发小组在统计区间内投入了多少资源、资源消耗在哪些 feedback/Story/Task 上、预估与实际是否偏离、哪些 feedback 投入高但产出证据不足。
- **明细可下钻**：所有汇总指标必须能下钻到 feedback、Story、Task、成员、工时记录或字段来源，不能只给结论不给明细。
- **事实依据可鉴定可查**：每个关键数字都必须标注数据来源、工作项 ID、字段或工具调用来源；缺失、报错、推导假设必须显式记录。
- **投入产出不编造**：产出只使用已获取事实字段，如客户声音、上线时间、Story 状态、任务完成状态、反馈回收状态；没有收入、价值分、效果指标时不能自行估算。
- **资源管理视角**：前端和后端合并为研发组，测试作为借用投入单独呈现；如用户提供研发小组成员名单，必须输出成员维度投入分布。

## 核心回答问题

报告必须围绕 leader 关心的资源管理问题组织，而不是只罗列飞书项目数据：

| 问题 | 报告回答方式 | 必须下钻到 |
|---|---|---|
| 这段时间研发小组总共消耗了多少资源？ | 总小时、人天、成员分布、岗位分布 | 成员、Task、工时记录或实际工时字段 |
| 资源主要投到了哪些 feedback？ | feedback 投入排行、预估实际偏差排行 | Feedback ID、Story、Task 明细 |
| 投入形成了什么产出？ | 客户声音、上线时间、Story/Task 状态、反馈回收状态 | 对应工作项字段和更新时间 |
| 哪些投入需要关注？ | 高投入低产出、无客户声音、无工时登记、超预估、未归类投入 | 风险标记和证据索引 |
| 下一步怎么管控？ | 补录、补工时、拆分 Story、调整资源投放建议 | 事实依据和影响范围 |

## 输入参数

最小输入：

```json
{
  "project_key": "cem",
  "feedback_work_item_type": "yt_user_feedback",
  "feedback_view_url": "",
  "feedback_view_id": "",
  "deploy_start": "2026-05-01",
  "deploy_end": "2026-05-15",
  "team_members": []
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
  "customer_voice_field_name": "客户声音",
  "filled_voice_view_url": "https://project.feishu.cn/cem/workObjectView/yt_user_feedback/JMqybKtDR?scope=workspaces&node=28720388",
  "unfilled_voice_view_url": "https://project.feishu.cn/cem/workObjectView/yt_user_feedback/QOIjVgcDg?scope=workspaces&node=28494009",
  "recycle_stats_start": "本周一",
  "exclude_deploy_before": "",
  "hours_per_day": 8,
  "leader_report_mode": true,
  "evidence_required": true,
  "team_capacity_days": {},
  "report_audience": "leader",
  "risk_thresholds": {
    "estimate_overrun_ratio": 1.2,
    "high_investment_hours": 16,
    "stale_unfilled_voice_days": 30
  },
  "output_path": "outputs/YYYY-MM-DD_Feedback综合回收与研发投入统计报告.md",
  "publish_to_doc_url": "",
  "publish_to_sheet_url": ""
}
```

缺失 `project_key`、视图 URL/ID、上线时间范围时，先从用户上下文或飞书项目 URL 解析；仍无法确定时再追问。不要自行切换为默认视图。缺失 `team_members` 时，可以先按 Task 负责人和工时登记人反推参与成员，但报告必须说明“成员范围来自工作项事实记录，非用户预设名单”。

## 数据源优先级

1. **FeishuProjectMcp**：获取视图、字段配置、关联工作项、Story 节点/子任务、工时记录。
2. **MQL**：当普通 MCP 工具无法表达关联链时，使用 `search_by_mql` 的 `relation_field_chain`、`relation`、`linked_work_item`、`__父工作项` 语法补充查询。
3. **lark-cli**：只用于飞书云文档/电子表格读写、资源搜索、认证授权，不用于替代飞书项目 MCP 查询，也不能作为飞书项目统计数据的兜底来源。

## 固定统计口径

- Feedback 以用户提供的飞书项目视图返回数据为统计全集；用户明确“以视图为准”时，不再用本地历史文件、默认视图或名称相似度补齐。
- 视图字段中存在上线时间时，按用户给定上线时间闭区间筛选；用户明确要求“视图全量数据”时，不再额外按时间过滤。
- 研发小组投入统计以用户给定时间区段为主轴；每条投入必须能落到成员、Task/工时记录、登记时间或实际工作时间字段。
- 成员维度以 `team_members` 为优先口径；未提供成员名单时，以 Task 负责人、工时登记人、角色字段形成事实参与人清单，并标注来源。
- Feedback 回收情况以“客户声音”字段是否有值为核心口径：有值为已填写，空值为未填写；若用户提供已填写/未填写独立视图，优先使用独立视图做快速汇总，并用主统计视图补齐单项明细。
- 默认已填写客户声音视图为 `JMqybKtDR`，默认未填写客户声音视图为 `QOIjVgcDg`；只有在用户未提供回收统计视图且明确需要全局已上线回收率时使用，不能替代用户给定的研发投入统计主视图。
- 本周新增客户声音填写项通过操作记录筛选“客户声音”字段在统计周内的 create/modify 记录；字段内容必须在报告中完整输出。
- 未填写客户声音按开发上线时间分层：超过 30 天、15-30 天、7-15 天、7 天内；若配置 `exclude_deploy_before`，只从未填写分层中排除早于该日期的项，并在报告中标注排除数量。
- Feedback 关联 Story 读取 `关联需求 field_255b77`、`补充关联需求 field_b70230`。
- Task 读取开发任务 Task，使用 `关联 Story field_2c5aa5` 反查。
- Task 预估耗时读取 `预估时间（h）field_fb844a`；Task 实际耗时读取 `实际工作时间（h）field_23cb2b`。
- 岗位分类读取 `职务类型 field_9a3d14`，仅统计前端、后端、测试；其他岗位保留为“未归类”，不并入三类。
- 前端与后端合并为“研发组”；测试独立为“测试组”。测试组属于借用投入，不计入研发组持久人天。
- 研发组开发自测时间缺少明确字段或工时记录时不纳入统计，并在报告中标明“研发组开发自测时间缺少明确记录未统计”。
- 人天是报告展示单位，报告只输出数值，不解释隐含换算公式，除非用户追问。
- 所有汇总数字必须提供证据链：视图记录、工作项 ID、字段 key/字段名、工时记录、MQL 查询或 MCP 工具结果；无法形成证据链的数字不得进入正式合计。
- 证据链最小单元为 `evidence_id + source_type + source_locator + raw_value + collected_at`；报告中的 leader 摘要、资源总览、投入排行都必须引用证据 ID 或可下钻表格行。
- 如果用户提供 `team_capacity_days`，资源投入占比按用户容量计算；未提供时只输出实际投入和成员分布，不编造团队容量。
- 风险标记默认包括：实际超过预估阈值、高投入但无客户声音、高投入但无完成状态、缺少工时登记、成员不在小组名单、未归类岗位。
- 上述口径属于 Skill 固定规则，报告正文不要单独输出“数据来源与口径”章节；仅在“数据缺失与报错记录”中记录查询成功/失败和缺失字段。

禁止 mock 数据。统计目标必须以用户提供的飞书项目视图返回结果为准；字段缺失、关联缺失、工时缺失都必须在报告中标注。

如果视图、字段、关联、MQL 或工时查询报错，直接把具体工具、参数和报错信息写入输出，不要为了完成报告而使用默认视图、历史报告、本地旧文件或自行推导的数据补齐。

禁止在 leader 摘要中出现以下内容：无证据数字、无分母比例、无来源结论、未说明口径的平均值、将查询失败项默默排除后的“干净汇总”。

## 执行流程

详细查询策略见 [`references/execution.md`](references/execution.md)。

### 1. 解析视图与字段

- 若输入为视图 URL，优先让 MCP 工具从 URL 解析 `project_key`、`work_item_type`、`view_id`。
- 调用 `list_workitem_field_config` 确认 feedback 的上线时间字段和客户声音字段，默认按字段名“开发上线时间”“客户声音”匹配。
- 调用 `list_workitem_field_config`、`list_workitem_relations` 确认 feedback 到 Story 的关联字段或关系。
- 已知固定字段能直接满足统计时，可以直接使用固定字段；如果工具报字段不存在，再回到字段配置查询确认。

### 2. 获取并筛选 feedback 主集合

- 调用 `get_view_detail` 分页获取视图下全部 feedback。
- 用上线时间字段筛选 `deploy_start 00:00:00` 到 `deploy_end 23:59:59` 的工作项。
- 保留 feedback ID、名称、上线时间、客户声音、租户或来源字段；字段不存在时置为“未提供”，字段为空时置为“未填写”。

### 3. 统计客户声音回收情况

- 如果提供已填写/未填写客户声音独立视图，分别调用 `get_view_detail` 分页获取全量，并计算 `filled_count`、`unfilled_count`、`total_count`、`fill_rate`。
- 如果没有独立视图，则以主集合中客户声音字段是否为空计算回收情况；报告必须说明该回收率仅覆盖主统计集合。
- 对已填写集合调用 `get_workitem_op_record` 查询统计周内客户声音字段变更记录，输出本周新增填写清单：Feedback ID、名称、客户声音完整内容、开发上线时间、填写时间。
- 对未填写集合按开发上线时间分层，输出每层数量、占未填写比例和重点跟进建议。
- 回收统计集合和研发投入主集合不一致时，报告要分别标注“回收统计全集”和“投入统计全集”，不要混用分母。

### 4. 查询关联 Story

按以下顺序尝试：

1. 已知关联字段：`list_related_workitem(relation_field_key=...)`。
2. 已知关系 ID：`list_related_workitem(relation_id=...)`。
3. 关系链：`search_by_mql` 使用用户给定关系名，不擅自猜测关系名称。

同一 feedback 关联多个 Story 时全部纳入；Story 被多个 feedback 复用时，在全局汇总中去重，在单个 feedback 明细中保留并标注“共享 Story”。

### 5. 查询 Story 下子 task

优先调用：

- `get_node_detail(need_sub_task=true)` 获取 Story 节点和节点子任务。
- 如子任务是正式工作项或计划表行，再用 `list_wbs_instance_rows` 或 `search_by_mql FROM sub_task` 补齐任务 ID、负责人、角色、预估、实际工时。
- 查询实际工时优先调用 `get_workitem_man_hour_records`。

### 6. 工时归一与分类

- 预估耗时优先取 task 排期估分；单位为天时按 `hours_per_day` 折算，默认 8 小时/天。
- 实际耗时优先取工时登记记录；无记录时取计划表实际工时；仍缺失时记为 0，并在缺失说明列出。
- 分类顺序：角色/负责人类型 > task 所属节点 > task 名称关键词。
- 只统计三类：前端、后端、测试；无法归类的任务单独列为“未归类”，不强行并入三类。

系统化呈现要求：

- 同时输出“预估 vs 实际”“按 feedback 累计 vs 去重累计”“研发组 vs 测试组借用”“已归类 vs 未归类”四组视角。
- 同时输出“成员投入分布”“feedback 资源消耗排行”“预估实际偏差排行”“无产出证据但有投入清单”。
- 同时输出“风险标记清单”和“证据索引”，确保 leader 可以快速定位异常 feedback 的事实依据。
- 每个层级的总计必须能向下追溯到明细：全局汇总 → feedback 宽表 → Story/Task 明细 → 工时记录或字段来源。
- 发现共享 Story/task 时，全局汇总必须同时给出按 feedback 归属累计和去重累计；未发现共享时在缺失记录中说明未发现共享重复。

### 7. 输出报告

Markdown 文件默认写入 `outputs/`：

```text
outputs/{YYYY-MM-DD}_Feedback综合回收与研发投入统计报告.md
```

报告必须包含：

- Leader 摘要：研发小组总投入、资源消耗结构、主要产出证据、异常/风险、建议动作。
- 研发资源总览：按成员、前端/后端/测试、feedback、Story/Task 汇总投入，并展示预估与实际偏差。
- 风险与管控建议：按高投入、超预估、无产出证据、工时缺失、客户声音未填写分组输出。
- 客户声音回收统计：已填写、未填写、总数、填写率、本周新增填写清单、未填写分层统计。
- 每个 feedback 的客户声音录入内容；未填写时展示“未填写”，字段缺失时展示“字段缺失”。
- 精要统计卡片：总耗时、平均每个 feedback 耗时、总人天、统计区间工作日、研发组人天与测试组借用人天。
- 系统化耗时汇总：预估/实际、前端/后端/测试/未归类、研发组/测试组、按 feedback 累计/去重累计。
- 每个 feedback 的关联 Story 和 task 明细。
- 每个 feedback 的前端、后端、测试预估/实际耗时。
- 证据索引：列出关键指标对应的工作项、字段、工时记录、查询工具和异常说明，确保事实依据可鉴定可查。
- 口径差异说明：当回收统计全集、投入统计全集、成员统计全集不一致时，必须分别列明分母和差异原因。
- 全局汇总、缺失数据说明、工具查询成功/失败说明。
- 投入产出观察：仅基于已获取的产出字段，如客户声音、租户、Story 状态、上线时间；不要编造收入、价值分或效果数据。

报告不要包含：

- “数据来源与口径”章节。
- 固定字段 key 列表，除非字段缺失或查询报错需要说明。
- 人天换算公式说明，除非用户明确要求解释。

### 8. 可选同步到飞书

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
- leader 摘要中的每个数字必须能在后续表格找到对应明细或证据索引；找不到证据的数字必须移出摘要。
- 所有比例必须同时展示分子、分母和覆盖范围；分母来自不同集合时不能放在同一比例中比较。
- 如果用户要求“以视图为准”，feedback 数量必须与该视图返回总数一致，不得额外按历史默认条件过滤。
- 回收统计的 `filled_count + unfilled_count` 必须等于回收统计全集总数；如果独立视图和主统计视图不一致，必须说明差异。
- 本周新增客户声音清单必须能追溯到客户声音字段操作记录；无法查询操作记录时保留已填写内容，并在报错记录中说明无法判定新增填写时间。
- 每个 feedback 的 Story 数、task 数、分类工时要能追溯到明细行。
- 成员投入、人天、预估/实际偏差必须能追溯到 Task 或工时记录；负责人缺失、工时登记人缺失、成员不在小组名单内时单独标注。
- 风险清单中的每个风险必须有风险类型、触发阈值或事实条件、影响对象和证据引用。
- 全局合计需说明是否发现共享 Story/task；发现共享时再给出“按 feedback 归属累计”和“Story/task 去重累计”。
- 若 MCP 返回分页，必须翻页到无更多数据。
- 时间统一使用 Asia/Shanghai，日期区间为闭区间。
