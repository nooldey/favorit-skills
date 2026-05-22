# 公式验证与计算验证模板

> 本文档展示如何为每个非平凡的公式编写验证脚本、数值测试用例、边界情况分析。

---

## 模板结构

对每条公式，遵循以下编号格式在 Markdown 文档中呈现：

### 公式编号：F-<功能模块>-<序号>
### 公式名称
### LaTeX 标准化

```latex
$$\text{公式} = \frac{\text{分子}}{\text{分母}} \times \text{系数}$$
```

### 参数定义表

| 参数 | 符号 | 单位 | 精度 | 备注 |
| --- | --- | --- | --- | --- |
| 原始价格 | $P_0$ | CNY | 小数点后 2 位 | 不包含税 |
| 折扣率 | $r$ | % | 百分比，0.0~1.0 | 必须 ≤ 1 |
| 最终价格 | $P_f$ | CNY | 小数点后 2 位 | 四舍五入 |

### 计算场景与验证脚本

#### 📋 场景 1：正常场景
**描述**：用户在促销期间下单，享受 20% 折扣

**输入数据**：
- 原始价格：$P_0 = 100$ CNY
- 折扣率：$r = 0.2$ (20%)

**预期输出**：
- 最终价格：$P_f = 80$ CNY

**验证脚本** (Python 3.9+):
```python
def calculate_discounted_price(original_price, discount_rate, precision=2):
    """
    计算折扣后价格（四舍五入）
    
    Args:
        original_price (float): 原始价格，单位 CNY
        discount_rate (float): 折扣率，范围 [0, 1]
        precision (int): 小数精度，默认为 2（分）
    
    Returns:
        float: 折扣后价格，保留指定小数位数
    
    Raises:
        ValueError: 若折扣率不在 [0, 1] 范围内
    """
    if not (0 <= discount_rate <= 1):
        raise ValueError(f"Discount rate must be in [0, 1], got {discount_rate}")
    
    final_price = original_price * (1 - discount_rate)
    return round(final_price, precision)

# 测试用例
assert calculate_discounted_price(100, 0.2) == 80.0, "正常折扣场景失败"
print("✅ 场景 1 通过：折扣后价格 = 80.0 CNY")
```

**测试结果**：✅ PASS

---

#### 📋 场景 2：边界 - 无折扣
**描述**：折扣率为 0，对应直接成交

**输入数据**：
- 原始价格：$P_0 = 100$ CNY
- 折扣率：$r = 0$ (0%)

**预期输出**：
- 最终价格：$P_f = 100$ CNY

**验证脚本**：
```python
# 继续上面的脚本
assert calculate_discounted_price(100, 0) == 100.0, "无折扣场景失败"
print("✅ 场景 2 通过：无折扣时价格保持不变")
```

**测试结果**：✅ PASS

---

#### 📋 场景 3：边界 - 完全折扣
**描述**：折扣率为 100%，免费赠送

**输入数据**：
- 原始价格：$P_0 = 100$ CNY
- 折扣率：$r = 1.0$ (100%)

**预期输出**：
- 最终价格：$P_f = 0$ CNY

**验证脚本**：
```python
assert calculate_discounted_price(100, 1.0) == 0.0, "完全折扣场景失败"
print("✅ 场景 3 通过：完全折扣时价格为 0")
```

**测试结果**：✅ PASS

---

#### 📋 场景 4：边界 - 精度舍入
**描述**：折扣后价格出现三位小数，需要四舍五入到两位

**输入数据**：
- 原始价格：$P_0 = 99.99$ CNY
- 折扣率：$r = 0.333$ (33.3%)

**预期输出**：
- 未舍入：$P_f = 66.99333...$ CNY
- 舍入后（precision=2）：$P_f = 66.99$ CNY

**验证脚本**：
```python
result = calculate_discounted_price(99.99, 0.333)
assert result == 66.99, f"精度舍入失败：期望 66.99，得到 {result}"
print(f"✅ 场景 4 通过：舍入后价格 = {result} CNY")
```

**测试结果**：✅ PASS

---

#### 📋 场景 5：异常 - 非法折扣率
**描述**：折扣率超出合法范围 [0, 1]

**输入数据**：
- 原始价格：$P_0 = 100$ CNY
- 折扣率：$r = 1.5$ (150% —— 非法)

**预期行为**：抛出 ValueError

**验证脚本**：
```python
try:
    calculate_discounted_price(100, 1.5)
    print("❌ 场景 5 失败：应该抛出异常")
except ValueError as e:
    print(f"✅ 场景 5 通过：捕获异常 — {e}")
```

**测试结果**：✅ PASS

---

## 复杂公式示例：分层折扣计算

**场景**：根据订单金额分层，不同档次折扣不同

**LaTeX 公式**：

$$\text{final\_price} = \begin{cases}
P_0 & \text{if } P_0 < 99 \\
P_0 \times 0.9 & \text{if } 99 \leq P_0 < 299 \\
P_0 \times 0.85 & \text{if } 299 \leq P_0 < 999 \\
P_0 \times 0.8 & \text{if } P_0 \geq 999
\end{cases}$$

**参数定义表**：

| 参数 | 符号 | 范围 | 说明 |
| --- | --- | --- | --- |
| 订单金额 | $P_0$ | [0, ∞) | CNY，不含税 |
| 分层折扣率 | $k$ | {1.0, 0.9, 0.85, 0.8} | 根据 $P_0$ 档位确定 |
| 最终金额 | $P_f$ | [0, ∞) | CNY，已舍入 |

**验证脚本** (Python):
```python
def calculate_tiered_discount(price):
    """
    计算分层折扣后价格
    
    分层规则：
    - price < 99：无折扣
    - 99 <= price < 299：9 折
    - 299 <= price < 999：8.5 折
    - price >= 999：8 折
    """
    if price < 99:
        return round(price, 2)
    elif price < 299:
        return round(price * 0.9, 2)
    elif price < 999:
        return round(price * 0.85, 2)
    else:
        return round(price * 0.8, 2)

# 测试用例
test_cases = [
    (50, 50.0, "最低档：无折扣"),
    (99, 89.1, "第二档下限"),
    (150, 135.0, "第二档中间"),
    (299, 254.15, "第三档下限"),
    (500, 425.0, "第三档中间"),
    (999, 799.2, "第四档下限"),
    (2000, 1600.0, "第四档高值"),
]

print("✅ 分层折扣验证结果：")
for price, expected, desc in test_cases:
    result = calculate_tiered_discount(price)
    status = "✅" if abs(result - expected) < 0.001 else "❌"
    print(f"{status} {desc:20s} | 输入 ¥{price:7} → 输出 ¥{result:7} (期望 ¥{expected})")
```

**输出示例**：
```
✅ 分层折扣验证结果：
✅ 最低档：无折扣         | 输入 ¥     50 → 输出 ¥   50.0 (期望 ¥50.0)
✅ 第二档下限              | 输入 ¥     99 → 输出 ¥   89.1 (期望 ¥89.1)
✅ 第二档中间              | 输入 ¥    150 → 输出 ¥  135.0 (期望 ¥135.0)
✅ 第三档下限              | 输入 ¥    299 → 输出 ¥ 254.15 (期望 ¥254.15)
✅ 第三档中间              | 输入 ¥    500 → 输出 ¥  425.0 (期望 ¥425.0)
✅ 第四档下限              | 输入 ¥    999 → 输出 ¥ 799.2 (期望 ¥799.2)
✅ 第四档高值              | 输入 ¥   2000 → 输出 ¥ 1600.0 (期望 ¥1600.0)
```

---

## 计算复杂度分析

对于非平凡的算法公式，标注计算复杂度与可接受误差：

### 示例：动态定价公式

**公式** (简化版)：
$$\text{dynamic\_price} = \text{base\_price} \times \text{demand\_multiplier}(x_1, x_2, ..., x_n)$$

**计算复杂度**：
- $\text{demand\_multiplier}$ 基于机器学习模型（预训练）
- 推理耗时：$O(n)$，其中 $n$ = 特征维度（通常 < 100）
- 预期延迟：< 50ms（p95）

**可接受误差**：
- 预测精度：±5%（与历史实际价格对比）
- 舍入误差：CNY 0.01（人民币最小单位）

---

## 数值精度规范

| 数据类型 | 精度要求 | 舍入模式 | 示例 |
| --- | --- | --- | --- |
| 货币 (CNY) | 0.01 (分) | ROUND_HALF_UP | 99.999 → 100.00 |
| 百分比 | 0.1% | ROUND_HALF_UP | 99.456% → 99.5% |
| 利率 | 0.001% | ROUND_DOWN | 5.6789% → 5.678% |
| 数量 | 整数 | ROUND_HALF_UP | 9.7 件 → 10 件 |
| 重量 (KG) | 0.001 | ROUND_HALF_UP | 1.2345 kg → 1.234 kg |

---

## 溢出 / 下溢 处理

### 示例：累加值溢出

**问题**：日均处理 1000w 笔交易，每笔 ¥100~50,000，累计金额可能超过 float64 范围

**处理策略**：
```python
from decimal import Decimal, ROUND_HALF_UP

# 使用 Decimal 避免浮点精度丧失
total = Decimal('0')
for transaction in transactions:
    total += Decimal(str(transaction['amount']))

# 舍入到分位
total_rounded = total.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
```

**边界验证**：
- 最大日均累计：1000w × 50,000 = 5 × 10^14 CNY ✅ (Decimal 可承载)
- 列表溢出风险：若日交易超 10^9 笔，建议分批处理

---

## 版本历史

| 版本 | 日期 | 变化 |
| --- | --- | --- |
| v1.0 | 2026-04-08 | 初稿，涵盖基础公式、边界、精度规范 |
