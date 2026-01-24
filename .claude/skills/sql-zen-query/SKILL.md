---
name: sql-zen-query
description: 基于 SQL-Zen 双层架构生成高质量 SQL 查询，优先使用 Cube 层的预定义业务指标。
allowed-tools: Read, Grep, Bash, ExecuteSql
---

# SQL-Zen 双层架构查询生成

基于 SQL-Zen 的**双层语义架构**（Cube 层 + Schema 层）生成准确的 SQL 查询，优先使用 Cube 层的预定义业务指标。

## 何时使用

- 用户提出数据查询需求
- 需要生成 SELECT 语句
- 需要使用 SQL-Zen 工具执行查询

## 生成流程

### 1. 理解用户意图

分析用户问题，识别：
- 需要查询的数据（SELECT 什么）
- 过滤条件（WHERE 什么）
- 聚合需求（GROUP BY / 聚合函数）
- 排序和限制（ORDER BY / LIMIT）
- 时间范围（什么时间段）

### 2. 🆕 优先探索 Cube 层（业务语义）

**Cube 层是 SQL-Zen 的核心创新**，预定义了业务指标和维度。

#### 2.1 识别业务术语

将用户问题中的业务术语映射到 Cube 度量：

**常见术语映射**：
- "收入"、"销售额"、"收入" → `revenue`, `net_revenue`
- "转化率"、"转化"、"转化" → `conversion_rate`
- "用户数"、"活跃用户"、"新增用户" → `total_users`, `active_users`
- "订单数"、"订单"、"销售" → `total_orders`
- "客单价"、"平均订单价值" → `average_order_value`
- "客户生命周期价值"、"CLV"、"客户价值" → `customer_lifetime_value`
- "复购率"、"复购" → `repeat_purchase_rate`

#### 2.2 在 Cube 层查找相关度量

使用 `/sql-zen-explore` 找到相关的度量和维度：

```bash
# 找到 revenue 度量
cat schema/cubes/business-analytics.yaml | grep -A 5 "name: revenue"

# 输出示例：
# metrics:
#   - name: revenue
#     description: "总收入，包含所有已支付订单的金额"
#     sql: "SUM(CASE WHEN orders.status = 'paid' THEN orders.total_amount END)"
#     type: sum
```

#### 2.3 使用预定义的 SQL 表达式

**重要**：直接使用 Cube 层中定义的 SQL 表达式，不要重新实现业务逻辑。

**示例**：
```yaml
# Cube 定义
metrics:
  - name: conversion_rate
    sql: |
      COUNT(DISTINCT CASE WHEN o.status = 'paid' THEN o.user_id END)::DECIMAL / 
      COUNT(DISTINCT u.id) * 100

# 生成的 SQL
SELECT
  (COUNT(DISTINCT CASE WHEN o.status = 'paid' THEN o.user_id END)::DECIMAL / 
   COUNT(DISTINCT u.id) * 100) AS conversion_rate
FROM orders o
LEFT JOIN users u ON o.user_id = u.id
```

#### 2.4 应用维度分组

如果用户问题包含维度（如"按月"、"按用户群组"），使用 Cube 层定义的维度粒度：

**时间维度**：
```yaml
# Cube 定义
dimensions:
  - name: time
    granularity:
      - month:
          sql: "DATE_FORMAT(created_at, '%Y-%m')"
      - week:
          sql: "YEARWEEK(created_at)"

# 生成 SQL
SELECT
  DATE_FORMAT(orders.created_at, '%Y-%m') AS month,
  SUM(CASE WHEN orders.status = 'paid' THEN orders.total_amount END) AS revenue
FROM orders
GROUP BY DATE_FORMAT(orders.created_at, '%Y-%m')
ORDER BY month DESC
```

**分类维度**：
```yaml
# Cube 定义
dimensions:
  - name: user_tier
    enum: [free, basic, premium]

# 生成 SQL
SELECT
  users.subscription_tier AS user_tier,
  SUM(orders.total_amount) AS revenue
FROM users
LEFT JOIN orders ON users.id = orders.user_id
GROUP BY users.subscription_tier
ORDER BY revenue DESC
```

### 3. 使用 Schema 层（表结构）

如果 Cube 层的度量需要确认表结构，或者找不到相关度量，则探索 Schema 层。

#### 3.1 理解表结构

使用 `/sql-zen-explore` 查看表定义：

```bash
cat schema/tables/orders.yaml
```

**重点关注**：
- 列名和类型
- 外键关系
- 枚举值
- 主键

#### 3.2 使用正确的列名和类型

确保 SQL 中使用的列名与 Schema 定义完全一致：

```yaml
# Schema 定义
columns:
  - name: total_amount
    type: DECIMAL(12,2)
  - name: status
    enum: [pending, paid, shipped, completed, cancelled]
```

```sql
-- 正确的列名和类型
SELECT
  id,
  total_amount,  -- 使用与 Schema 完全一致的列名
  status
FROM orders
WHERE status = 'paid'  -- 使用枚举值
```

#### 3.3 应用表间关系

使用 Schema 层定义的关系生成 JOIN：

```yaml
# Schema 关系
relationship:
  name: user_orders
  from_table: users
  to_table: orders
  type: one_to_many
  join_sql: "LEFT JOIN orders ON users.id = orders.user_id"
```

```sql
-- 使用定义的 JOIN
SELECT
  u.id,
  u.name,
  COUNT(o.id) AS order_count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id  -- 使用 Schema 中的 JOIN 条件
GROUP BY u.id, u.name
```

### 4. 应用过滤条件

#### 4.1 🆕 优先使用 Cube 层过滤器

**Cube 层的过滤器**是预定义的常用查询条件，避免重复编写。

```yaml
# Cube 定义
filters:
  - name: last_30_days
    sql: "orders.created_at >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY)"
    description: "最近30天"
```

```sql
-- 使用预定义的过滤器
SELECT
  SUM(total_amount) AS revenue
FROM orders
WHERE orders.created_at >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY)
  AND status = 'paid'  -- 使用 Cube 中的时间过滤
```

#### 4.2 组合多个过滤器

```sql
SELECT
  SUM(total_amount) AS revenue
FROM orders
WHERE created_at >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY)  -- 时间过滤
  AND status = 'paid'  -- 状态过滤
  AND shipping_country = 'US'  -- 地理过滤
```

#### 4.3 手动编写过滤条件

如果 Cube 层没有合适的过滤器，根据业务需求编写：

**最佳实践**：
- 使用参数化条件（避免硬编码）
- 使用比较操作符（=, >, <, >=, <=, IN, LIKE）
- 使用 AND/OR 组合条件

```sql
-- 参数化条件
WHERE created_at >= :start_date
  AND created_at <= :end_date
```

### 5. 生成最终 SQL

#### 5.1 SELECT 子句

```sql
-- 清晰的列别名
SELECT
  DATE(created_at) AS order_date,
  user_id,
  total_amount
FROM orders
```

#### 5.2 FROM 子句

```sql
-- 使用表别名提高可读性
FROM orders o
INNER JOIN users u ON o.user_id = u.id
INNER JOIN order_items oi ON o.id = oi.order_id
```

#### 5.3 WHERE 子句

```sql
-- 使用枚举值
WHERE status IN ('paid', 'shipped', 'delivered')

-- 使用时间范围
WHERE created_at >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY)

-- 使用组合条件
WHERE status = 'paid'
  AND created_at >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY)
  AND user_id = 123
```

#### 5.4 GROUP BY 子句

```sql
-- 多维度分组
SELECT
  DATE_FORMAT(created_at, '%Y-%m') AS month,
  users.subscription_tier AS user_tier,
  SUM(total_amount) AS revenue
FROM orders
INNER JOIN users ON orders.user_id = users.id
GROUP BY DATE_FORMAT(created_at, '%Y-%m'), users.subscription_tier
```

#### 5.5 ORDER BY 子句

```sql
-- 多列排序
ORDER BY month DESC, revenue DESC
```

#### 5.6 LIMIT 子句

```sql
-- 限制结果行数（默认 100）
LIMIT 100
```

## 查询模式

### 模式 1: 简单指标查询

**用户问题**："收入是多少？"

**生成步骤**：
1. 在 Cube 层找到 `revenue` 度量
2. 使用预定义的 SQL 表达式
3. 确认表结构

```bash
# 找到 revenue 度量
cat schema/cubes/business-analytics.yaml | grep -A 3 "name: revenue"
```

```sql
-- 使用预定义的度量
SELECT
  SUM(CASE WHEN orders.status = 'paid' THEN orders.total_amount END) AS revenue
FROM orders
```

### 模式 2: 时间维度查询

**用户问题**："按月的收入趋势？"

**生成步骤**：
1. 在 Cube 层找到 `revenue` 度量 + `time` 维度
2. 使用时间粒度的 month 级别
3. 生成 GROUP BY 查询

```sql
SELECT
  DATE_FORMAT(created_at, '%Y-%m') AS month,
  SUM(CASE WHEN status = 'paid' THEN total_amount END) AS revenue
FROM orders
GROUP BY DATE_FORMAT(created_at, '%Y-%m')
ORDER BY month DESC
```

### 模式 3: 分类维度查询

**用户问题**："按用户群组的收入？"

**生成步骤**：
1. 在 Cube 层找到 `revenue` 度量 + `user_tier` 维度
2. 使用分类维度分组
3. 生成 GROUP BY 查询

```sql
SELECT
  users.subscription_tier AS user_tier,
  SUM(orders.total_amount) AS revenue
FROM users
INNER JOIN orders ON users.id = orders.user_id
WHERE orders.status = 'paid'
GROUP BY users.subscription_tier
ORDER BY revenue DESC
```

### 模式 4: 多维度查询

**用户问题**："按月和用户群组的收入？"

**生成步骤**：
1. 在 Cube 层找到 `revenue` 度量 + `time` 维度 + `user_tier` 维度
2. 使用多维度分组
3. 生成 GROUP BY 查询

```sql
SELECT
  DATE_FORMAT(orders.created_at, '%Y-%m') AS month,
  users.subscription_tier AS user_tier,
  SUM(CASE WHEN orders.status = 'paid' THEN orders.total_amount END) AS revenue
FROM orders
INNER JOIN users ON orders.user_id = users.id
GROUP BY DATE_FORMAT(orders.created_at, '%Y-%m'), users.subscription_tier
ORDER BY month DESC, users.subscription_tier
```

### 模式 5: 条件过滤查询

**用户问题**："最近30天的收入？"

**生成步骤**：
1. 在 Cube 层找到 `revenue` 度量 + `last_30_days` 过滤器
2. 应用过滤器条件
3. 生成 WHERE 查询

```bash
# 找到 last_30_days 过滤器
cat schema/cubes/business-analytics.yaml | grep -A 2 "name: last_30_days"
```

```sql
-- 使用预定义的过滤器
SELECT
  SUM(CASE WHEN status = 'paid' THEN total_amount END) AS revenue
FROM orders
WHERE created_at >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY)
```

### 模式 6: 复杂业务逻辑查询

**用户问题**："转化率是多少？"

**生成步骤**：
1. 在 Cube 层找到 `conversion_rate` 度量
2. 使用复杂的预定义 SQL 表达式（跨表计算）
3. 确认 JOIN 条件

```bash
# 找到 conversion_rate 度量
cat schema/cubes/business-analytics.yaml | grep -A 5 "name: conversion_rate"
```

```sql
-- 使用预定义的复杂业务逻辑
SELECT
  (COUNT(DISTINCT CASE WHEN o.status = 'paid' THEN o.user_id END)::DECIMAL / 
   COUNT(DISTINCT u.id) * 100) AS conversion_rate
FROM orders o
LEFT JOIN users u ON o.user_id = u.id
```

### 模式 7: JOIN 查询

**用户问题**："每个用户的订单数和收入？"

**生成步骤**：
1. 在 Cube 层找到 `total_orders` 和 `revenue` 度量
2. 在 Schema 层查看表关系
3. 生成 JOIN 查询

```sql
SELECT
  u.name AS user_name,
  COUNT(o.id) AS order_count,
  SUM(CASE WHEN o.status = 'paid' THEN o.total_amount END) AS revenue
FROM users u
INNER JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.name
ORDER BY revenue DESC
```

## 最佳实践

### 1. Cube 层优先

**✅ DO**：
- 优先使用 Cube 层的预定义度量
- 直接使用度量中的 SQL 表达式
- 应用 Cube 层的过滤器
- 使用 Cube 层的维度粒度

**❌ DON'T**：
- 不要重新实现已定义的业务逻辑
- 不要手动编写复杂的 SQL 聚合
- 不要硬编码常用过滤条件

### 2. Schema 层支持

**✅ DO**：
- 使用 Schema 层确认表结构
- 使用正确的列名和类型
- 应用枚举值
- 使用定义的 JOIN 条件

**❌ DON'T**：
- 不要猜测列名
- 不要使用 Schema 中不存在的列
- 不要使用错误的数据类型
- 不要忽略枚举值

### 3. SQL 质量保证

**✅ DO**：
- 使用表别名提高可读性
- 添加列别名
- 使用参数化条件（如果需要）
- 添加合理的 LIMIT（默认 100）

**❌ DON'T**：
- 不要使用 SELECT *（除非确实需要所有列）
- 不要在 WHERE 中使用函数（如 DATE(created_at) = '...'）
- 不要过度嵌套子查询

### 4. 性能优化

**✅ DO**：
- 使用索引列作为 WHERE 条件
- 使用 INNER JOIN 代替 LEFT JOIN（如果适用）
- 使用 EXISTS 代替 IN（对于大表）

**❌ DON'T**：
- 不要在 WHERE 中对列使用函数
- 不要使用 SELECT *（不必要的列传输）
- 不要过度 JOIN

## 常见错误

### 错误 1: 重新实现业务逻辑

**问题**：
```sql
-- ❌ 手动编写业务逻辑
SELECT
  SUM(CASE WHEN status = 'paid' THEN total_amount END) / 
  COUNT(DISTINCT user_id) AS conversion_rate
FROM orders
```

**正确**：
```sql
-- ✅ 使用 Cube 层的预定义度量
SELECT
  conversion_rate
FROM schema.cubes.business-analytics  -- 引用 Cube 定义
```

### 错误 2: 忽略枚举值

**问题**：
```sql
-- ❌ 使用描述而非枚举值
WHERE status = '已支付'
```

**正确**：
```sql
-- ✅ 使用 Schema 中的枚举值
WHERE status = 'paid'  -- 来自 YAML 的 enum
```

### 错误 3: 错误的列名

**问题**：
```sql
-- ❌ 猜测列名
SELECT
  order_total,  -- 错误
  payment_status
FROM orders
```

**正确**：
```sql
-- ✅ 使用 Schema 中的正确列名
SELECT
  total_amount,  -- 来自 YAML 的 columns.name
  status
FROM orders
```

## 生成示例

### 示例 1: 收入查询

**用户问题**："上个月收入是多少？"

**生成步骤**：
1. 在 Cube 层找到 `revenue` 度量
2. 在 Cube 层找到 `last_month` 过滤器
3. 使用预定义的 SQL 表达式
4. 应用时间过滤

```sql
SELECT
  SUM(CASE WHEN orders.status = 'paid' THEN orders.total_amount END) AS revenue
FROM orders
WHERE orders.created_at >= DATE_FORMAT(CURRENT_DATE, '%Y-%m-01')
```

### 示例 2: 用户分析

**用户问题**："有多少高级订阅用户？"

**生成步骤**：
1. 在 Cube 层找到 `premium_users` 过滤器
2. 在 Schema 层确认表结构
3. 生成 COUNT 查询

```sql
SELECT
  COUNT(*) AS premium_user_count
FROM users
WHERE subscription_tier = 'premium'
  AND status = 'active'
```

### 示例 3: 时间趋势

**用户问题**："每周订单趋势？"

**生成步骤**：
1. 在 Cube 层找到 `total_orders` 度量 + `time` 维度
2. 使用 week 粒度
3. 生成 GROUP BY 查询

```sql
SELECT
  YEARWEEK(created_at) AS week,
  COUNT(*) AS order_count
FROM orders
WHERE status = 'paid'
GROUP BY YEARWEEK(created_at)
ORDER BY week DESC
LIMIT 12
```

## 总结

### 双层架构的优势

1. **业务语义**：Cube 层定义"做什么"
2. **表结构**：Schema 层定义"如何做"
3. **复用性**：复杂的业务逻辑只定义一次
4. **一致性**：所有查询使用相同的度量定义
5. **可维护性**：业务逻辑集中在 Cube 层，易于修改

### 生成流程

1. 🆕 **先 Cube 层** - 找到相关的度量和维度
2. **再 Schema 层** - 确认表结构和关系
3. **生成 SQL** - 结合两层的定义生成准确查询
4. **验证** - 确保列名、类型、枚举值正确
5. **优化** - 添加合理的 LIMIT 和 ORDER BY

记住：Cube 层是业务逻辑的中心，Schema 层是结构的支撑。优先使用 Cube 层，让 Schema 层提供结构支持。
