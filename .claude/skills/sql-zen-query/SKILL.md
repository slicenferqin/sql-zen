---
name: sql-zen-query
description: 基于 SQL-Zen schema 生成 SQL 查询。当用户提出数据查询需求时使用。
allowed-tools: Read, Grep, Bash, ExecuteSql
---

# SQL-Zen 查询生成

基于用户问题和 schema 信息，生成准确的 SQL 查询。

## 何时使用

- 用户提出具体的数据查询需求
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

### 2. 使用 sql-zen-explore

如果对表结构不熟悉，先使用 `/sql-zen-explore` 探索相关 schema。

### 3. 参考最佳实践

检查 schema/skills/ 目录中的查询模式：

```bash
cat schema/skills/common-queries.yaml
```

参考：
- 类似查询的 SQL 写法
- 时间范围过滤的最佳实践
- 聚合查询的标准模式

### 4. 生成 SQL

遵循以下原则：

#### 4.1 表名和列名

- 从 YAML schema 中获取正确的表名和列名
- 不要猜测，确保准确

#### 4.2 枚举值处理

**非常重要**：使用 schema 中定义的 enum 值

```yaml
# schema/tables/orders.yaml
columns:
  - name: status
    enum:
      - value: pending
        description: "待支付"
      - value: paid
        description: "已支付"
```

正确的 WHERE：
```sql
WHERE status = 'paid'  -- 使用 YAML 中的值
```

错误的 WHERE：
```sql
WHERE status = '已支付'  -- ❌ 使用了中文描述
```

#### 4.3 时间范围查询

参考 schema/skills/common-queries.yaml 中的时间范围模式：

```sql
-- 推荐：使用 >= 和 <
WHERE created_at >= '2024-01-01' AND created_at < '2024-02-01'

-- 避免使用：函数无法使用索引
WHERE DATE(created_at) = '2024-01-01'  -- ❌
```

#### 4.4 JOIN 查询

```sql
-- 推荐格式
FROM orders o
INNER JOIN users u ON o.user_id = u.user_id
INNER JOIN products p ON o.product_id = p.product_id
```

参考 schema/joins/ 中的关联关系。

#### 4.5 聚合查询

```sql
SELECT
  product_id,
  COUNT(*) as order_count,
  SUM(total_amount) as total_revenue
FROM orders
WHERE status = 'completed'
GROUP BY product_id
ORDER BY total_revenue DESC
LIMIT 10
```

#### 4.6 添加 LIMIT

默认添加 LIMIT 100，除非用户指定不需要限制：

```sql
SELECT * FROM orders LIMIT 100
```

### 5. 执行查询

使用 execute_sql 工具执行生成的 SQL。

### 6. 解释结果

返回结果时，提供：
- 查询返回了什么数据
- 结果的含义
- 重要的发现或趋势
- 如果需要，提供进一步分析建议

## 示例

### 示例 1：时间范围查询

用户: "上个月销售额最高的 10 个产品"

步骤：
1. 理解意图：查询产品销售额，按月过滤，TOP 10
2. 使用 /sql-zen-explore 探索 orders 和 products 表
3. 参考时间范围和聚合查询模式
4. 生成 SQL：
```sql
SELECT
  p.product_name,
  COUNT(o.order_id) as order_count,
  SUM(o.total_amount) as total_sales
FROM orders o
INNER JOIN products p ON o.product_id = p.product_id
WHERE o.status = 'completed'
  AND o.created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
  AND o.created_at < DATE_TRUNC('month', CURRENT_DATE)
GROUP BY p.product_id
ORDER BY total_sales DESC
LIMIT 10
```
5. 执行并解释结果

### 示例 2：复杂 JOIN

用户: "查询订单的用户名、产品名和金额"

步骤：
1. 使用 /sql-zen-explore 探索三个表的关联关系
2. 生成 SQL：
```sql
SELECT
  o.order_id,
  u.user_name,
  p.product_name,
  o.total_amount
FROM orders o
INNER JOIN users u ON o.user_id = u.user_id
INNER JOIN products p ON o.product_id = p.product_id
WHERE o.status != 'cancelled'
LIMIT 100
```

## 常见错误

❌ **错误 1**: 使用了表名或列名的中文描述
- 问题：`SELECT 产品名 FROM 订单`
- 原因：没有使用 YAML 中的实际列名
- 修正：使用 YAML 中的 `product_name`, `orders`

❌ **错误 2**: 忽略了 enum 值
- 问题：`WHERE status = '已支付'`
- 原因：使用了中文描述，不是实际值
- 修正：`WHERE status = 'paid'`（使用 YAML 中的 value）

❌ **错误 3**: 时间查询使用函数
- 问题：`WHERE DATE(created_at) = '2024-01-01'`
- 原因：无法使用索引，性能差
- 修正：`WHERE created_at >= '2024-01-01' AND created_at < '2024-01-02'`

❌ **错误 4**: JOIN 条件错误
- 问题：`WHERE o.user_id = u.id`
- 原因：使用了错误的列名
- 修正：先查看 schema 中的 foreign_key 定义

✅ **最佳实践**：
- 总是先探索 schema，确保表名和列名正确
- 仔细阅读 enum 定义，使用正确的值
- 参考 schema/skills/ 中的查询模式
- 使用时间范围的最佳实践（>= 和 <）
- 总是添加 LIMIT（默认 100）
