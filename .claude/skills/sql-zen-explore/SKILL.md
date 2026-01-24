---
name: sql-zen-explore
description: 系统化探索 SQL-Zen 的双层语义架构，理解业务指标和表结构。当需要了解数据库、开始新查询前使用。
allowed-tools: Read, Grep, Glob, Bash
---

# SQL-Zen 双层架构探索

系统化地探索 SQL-Zen 的**双层语义架构**（Cube 层 + Schema 层），理解业务指标和表结构。

## 何时使用

- 用户询问关于业务指标（收入、转化率、CLV）等
- 需要理解可用的度量和维度
- 开始编写 SQL 查询前
- 不确定某个指标在哪个表

## 探索步骤

### 1. 快速概览

首先了解双层架构的整体结构：

```bash
ls schema/
cat schema/README.md
```

这会告诉你：
- Cube 层目录（`cubes/`）- 业务语义
- Schema 层目录（`tables/`, `joins/`）- 表结构
- 文档和示例

### 2. 🆕 优先探索 Cube 层（业务语义）

**Cube 层**包含业务指标和维度，是回答业务问题的首选。

#### 2.1 列出所有 Cube

```bash
ls schema/cubes/
```

#### 2.2 基于关键词定位相关 Cube

如果用户问题包含特定关键词（如"收入"、"转化"、"用户"、"销售"），使用 grep 快速定位：

```bash
ls schema/cubes/ | grep -i "收入\|revenue"
ls schema/cubes/ | grep -i "用户\|user"
ls schema/cubes/ | grep -i "销售\|sales"
```

常见关键词映射：
- "收入"、"销售额"、"收入" → `business-analytics` cube
- "转化"、"转化率" → `business-analytics` cube
- "用户增长"、"活跃用户" → `user-analytics` cube
- "产品销量"、"产品分析" → `product-analytics` cube

#### 2.3 读取 Cube 定义

对于相关的 Cube，读取其 YAML 定义：

```bash
cat schema/cubes/business-analytics.yaml
```

**重点关注**：
- `metrics`（度量）：业务指标（KPI）
  - `name`: 度量名称（如 `revenue`, `conversion_rate`, `customer_lifetime_value`）
  - `sql`: 预定义的 SQL 表达式
  - `description`: 度量的业务含义
  - `type`: 度量类型（sum, count, avg, percentage）

- `dimensions`（维度）：分析视角
  - `name`: 维度名称（如 `time`, `user_tier`, `geography`）
  - `column`: 引用的列（如 `orders.created_at`）
  - `granularity`: 时间粒度（month, week, day）

- `filters`（过滤器）：常用查询条件
  - `name`: 过滤器名称
  - `sql`: SQL 条件表达式
  - `description`: 过滤器含义

#### 2.4 记录相关度量

找到与用户问题相关的度量后，记录其名称和 SQL 表达式，用于后续生成 SQL。

**示例**：
```
问题："上个月收入是多少？"
找到的度量：
  - name: revenue
  - sql: "SUM(CASE WHEN orders.status = 'paid' THEN orders.total_amount END)"
  - description: "总收入，包含所有已支付订单的金额"
```

### 3. 探索 Schema 层（表结构）

如果 Cube 层的度量需要理解表结构，或者找不到相关度量，则探索 Schema 层。

#### 3.1 列出所有表

```bash
ls schema/tables/
```

#### 3.2 读取表定义

对于每个相关的表，读取其 YAML 定义：

```bash
cat schema/tables/orders.yaml
```

**重点关注**：
- `columns`: 列定义
  - `name`: 列名（如 `total_amount`, `user_id`, `status`）
  - `type`: 数据类型（BIGINT, VARCHAR, TIMESTAMP）
  - `description`: 列含义
  - `enum`: 枚举值（**非常重要**！）
  - `foreign_key`: 外键关系

- `common_filters`: 常用过滤条件
- `measures`: 度量定义

#### 3.3 查找表关联

使用 JOIN 之前，理解表间关系：

```bash
grep -r "orders" schema/joins/
```

或者查看所有关系：

```bash
cat schema/joins/relationships.yaml
```

**关系类型**：
- `one_to_one`: 一对一
- `one_to_many`: 一对多
- `many_to_one`: 多对一
- `many_to_many`: 多对多

## 探索模式

### 模式 1: 业务指标查询

**用户问题**："收入是多少？"

**探索步骤**：
1. 在 Cube 层查找 `revenue` 度量
2. 理解度量的 SQL 表达式
3. 在 Schema 层查找相关表结构（如果需要）
4. 生成 SQL

```bash
# 步骤 1: 找到 revenue 度量
cat schema/cubes/business-analytics.yaml | grep -A 5 "name: revenue"

# 步骤 2: 理解 SQL 表达式（在 YAML 中定义）
# 输出：SUM(CASE WHEN orders.status = 'paid' THEN orders.total_amount END)

# 步骤 3: 查看表结构（如果需要确认列名）
cat schema/tables/orders.yaml | grep "total_amount"
```

### 模式 2: 多维分析

**用户问题**："按月的收入趋势？"

**探索步骤**：
1. 在 Cube 层查找 `revenue` 度量 + `time` 维度
2. 理解时间维度的粒度（month, week, day）
3. 生成 SQL 使用时间分组

```bash
# 找到 revenue 度量
cat schema/cubes/business-analytics.yaml | grep -A 3 "name: revenue"

# 找到 time 维度的 month 粒度
cat schema/cubes/business-analytics.yaml | grep -A 2 "month:"
```

### 模式 3: 条件过滤

**用户问题**："最近30天的订单数？"

**探索步骤**：
1. 在 Cube 层查找相关过滤器和度量
2. 应用过滤器的 SQL 条件
3. 在 Schema 层确认表和列

```bash
# 找到 last_30_days 过滤器
cat schema/cubes/business-analytics.yaml | grep -A 2 "name: last_30_days"

# 输出：sql: "orders.created_at >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY)"
```

### 模式 4: 跨表查询

**用户问题**："每个用户的收入？"

**探索步骤**：
1. 在 Cube 层查找 `revenue` 度量（可能需要 JOIN）
2. 在 Schema 层查找表关系
3. 理解 JOIN 条件

```bash
# 查找表关系
cat schema/joins/user-orders.yaml

# 输出：from_table: users, to_table: orders, join_sql: "LEFT JOIN orders ON users.id = orders.user_id"
```

## 关键要点

### Cube 层优先
- **首先检查 schema/cubes/** - 这是业务语义层
- 使用预定义的度量和维度
- 复用业务逻辑，避免重复计算

### Schema 层支持
- 使用 Schema 层理解表结构
- 确认列名、类型、枚举值
- 理解表间关系（JOIN 条件）

### 两层结合
- Cube 层定义"做什么"（业务语义）
- Schema 层定义"如何做"（表结构）
- LLM 在两层之间导航，生成准确的 SQL

## 常见场景

### 场景 1: 财务指标

用户问题："总销售额是多少？"

**探索流程**：
```bash
# 1. 在 Cube 层查找 revenue 度量
cat schema/cubes/business-analytics.yaml
# 找到：name: revenue, sql: SUM(CASE WHEN orders.status = 'paid' THEN orders.total_amount END)

# 2. 如果需要，查看表结构
cat schema/tables/orders.yaml
# 确认：orders.total_amount 列存在，类型是 DECIMAL(12,2)
```

### 场景 2: 用户分析

用户问题："有多少活跃用户？"

**探索流程**：
```bash
# 1. 在 Cube 层查找 active_users 过滤器
cat schema/cubes/business-analytics.yaml
# 找到：name: active_users, sql: users.status = 'active' AND users.is_verified = true

# 2. 查看用户表结构
cat schema/tables/users.yaml
# 确认：users.status 和 users.is_verified 列存在
```

### 场景 3: 时间趋势

用户问题："最近30天的订单数？"

**探索流程**：
```bash
# 1. 在 Cube 层查找 total_orders 度量和 last_30_days 过滤器
cat schema/cubes/business-analytics.yaml
# 找到：
# - metric: total_orders (COUNT(orders.id))
# - filter: last_30_days (orders.created_at >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY))

# 2. 组合生成 SQL
# SELECT COUNT(orders.id) FROM orders WHERE orders.created_at >= ...
```

## 最佳实践

### 1. 系统化探索

按照以下顺序探索：
1. 🆕 **先 Cube 层**（业务语义）
2. **再 Schema 层**（表结构）
3. 最后查看关系和示例

### 2. 关键词搜索

使用 grep 基于关键词快速定位：
```bash
# 搜索收入相关内容
grep -ri "收入\|revenue\|sales" schema/cubes/*.yaml

# 搜索用户相关内容
grep -ri "用户\|user\|customer" schema/cubes/*.yaml

# 搜索转化相关内容
grep -ri "转化\|conversion" schema/cubes/*.yaml
```

### 3. 详细阅读

找到相关文件后，仔细阅读：
- 度量的 `sql` 表达式
- 维度的 `granularity` 定义
- 过滤器的 `sql` 条件
- 表的 `foreign_key` 关系
- 枚举值的 `enum` 定义

### 4. 验证理解

生成 SQL 前，验证你的理解：
- 度量的 SQL 表达式是否正确
- 维度的粒度是否合适
- 表间关系是否正确
- 枚举值是否使用正确

## 调试技巧

### 找不到度量？

1. 检查 Cube 文件名是否包含相关关键词
2. 搜索所有 Cube 文件：`grep -r "<关键词>" schema/cubes/`
3. 查看是否有类似的度量（如用"订单数"代替"订单量"）

### 找不到表？

1. 列出所有表：`ls schema/tables/`
2. 查看表定义的 `description`
3. 通过描述判断是否相关

### 理解 SQL 表达式？

1. 查看 Cube 文件中的完整 YAML
2. 注意 JOIN 条件
3. 注意 WHERE 条件
4. 注意 GROUP BY 字段
5. 参考示例查询：`cat schema/examples/*.sql`

## 查看示例查询

如果不确定如何生成 SQL，查看示例：

```bash
# 查看所有示例
ls schema/examples/

# 查看特定类型的示例
cat schema/examples/monthly-revenue.sql
cat schema/examples/user-clv.sql
```

示例可以提供：
- SQL 写法参考
- 度量使用方式
- 维度使用方式
- 最佳实践模式
