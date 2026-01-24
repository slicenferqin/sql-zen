# Schema 目录

此目录包含 SQL-Zen 的**双层语义架构**定义文件。

## 目录结构

```
schema/
├── cubes/               # Cube 层（业务语义）
│   ├── business-metrics.yaml    # 核心业务指标
│   ├── user-analytics.yaml     # 用户分析
│   └── product-analytics.yaml  # 商品分析
├── tables/              # Schema 层（表结构）
│   └── examples/            # 完整的表定义示例
├── joins/               # 关联关系定义 (YAML)
├── skills/              # Agent Skills - 查询模式和最佳实践
│   ├── common-queries.yaml   # 常用查询模式
│   └── best-practices.yaml  # SQL 最佳实践
├── examples/            # 示例 SQL 查询
└── guides/             # 设计指南文档
    ├── schema-methodology.md    # Schema 设计方法论
    ├── cube-design.md         # Cube 设计指南
    ├── table-design.md         # 表设计示例
    ├── column-naming.md       # 列命名规范
    ├── relationship-design.md   # 关系设计模式
    ├── sql-best-practices.md # SQL 最佳实践
    └── schema-usage.md       # Schema 使用指南
```

## 双层语义架构

### Cube 层（业务语义）

**目标**: 定义业务指标和维度，面向业务分析师

**内容**:
- **Metrics（度量）**: 业务指标（KPI）- 收入、转化率、CLV 等
- **Dimensions（维度）**: 分析视角 - 时间、地理、用户分层等
- **Filters（过滤器）**: 常用查询条件
- **Relationships（关系）**: 跨表连接逻辑

**文件位置**: `schema/cubes/`

**示例**: [cube-design.md](./guides/cube-design.md)

### Schema 层（表结构）

**目标**: 描述表结构和数据模型，面向数据工程师

**内容**:
- **表定义**: 表名、描述、数据库、schema
- **列定义**: 列名、类型、描述、主键、外键
- **关系定义**: 表间关联（one_to_one, one_to_many 等）
- **枚举值**: 状态码、类型等有限取值集

**文件位置**: `schema/tables/`

**示例**: [table-design.md](./guides/table-design.md)

### 两层关系

```
┌─────────────────────────────────────────┐
│          Cube 层                      │
│  - 业务语义指标                     │
│  - 维度                             │
│  - 跨表逻辑                         │
└────────────┬─────────────────────┘
              │ 引用
              ▼
┌─────────────────────────────────────────┐
│          Schema 层                     │
│  - 表结构                          │
│  - 列定义                           │
│  - 表间关系                         │
└─────────────────────────────────────────┘
```

**关键点**:
- Cube 层**引用** Schema 层的表和列
- Schema 层是 Cube 层的**基础**
- LLM 可以在两层之间**导航**
- 两层**互补**，共同提供完整的语义

## 快速开始

### 1. 理解双层架构

首先阅读以下文档，理解 SQL-Zen 的双层设计：

1. **[Cube 设计指南](./guides/cube-design.md)** - 学习如何定义业务指标和维度
2. **[Schema 设计方法论](./guides/schema-methodology.md)** - 学习设计原则和最佳实践

### 2. 创建 Cube 层（优先）

从 Cube 层开始，定义你的业务指标：

```yaml
# schema/cubes/business-metrics.yaml
cube: business_analytics
description: "核心业务指标"

dimensions:
  - name: time
    column: "DATE(orders.created_at)"
    granularity: [month, week, day]

metrics:
  - name: revenue
    description: "总收入"
    sql: "SUM(CASE WHEN orders.status = 'paid' THEN orders.total_amount END)"
    type: sum

filters:
  - name: last_30_days
    sql: "orders.created_at >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY)"
    description: "最近30天"
```

### 3. 创建 Schema 层（如果需要）

如果你的表结构还没有定义，创建 Schema 层：

```yaml
# schema/tables/orders.yaml
table:
  name: orders
  description: "订单主表"
  
columns:
  - name: id
    type: BIGINT
    primary_key: true
    
  - name: user_id
    type: BIGINT
    foreign_key:
      table: users
        column: id
```

### 4. 提供查询示例

在 `schema/examples/` 下添加常见查询示例：

```sql
-- schema/examples/monthly-revenue.sql
-- 获取每月收入
SELECT
    DATE_FORMAT(created_at, '%Y-%m') AS month,
    SUM(total_amount) AS revenue
FROM orders
WHERE status = 'paid'
GROUP BY DATE_FORMAT(created_at, '%Y-%m')
ORDER BY month DESC;
```

## 设计指南文档

### 核心文档

1. **[Schema 设计方法论](./guides/schema-methodology.md)**
   - 设计原则（精确性、完整性、可查询性、一致性）
   - 表命名规范
   - 列设计指南
   - 关系建模
   - 度量定义
   - 文档质量标准
   - 验证清单

2. **[Cube 设计指南](./guides/cube-design.md)** 🆕
   - 什么是 Cube 层
   - 设计原则
   - Cube 定义格式
   - 维度设计（时间、地理、用户、产品）
   - 度量设计（求和、计数、平均、比率）
   - 过滤器设计
   - 关系定义
   - 常见模式（收入分析、用户增长、产品分析）
   - 验证清单

3. **[表设计示例](./guides/table-design.md)**
   - 用户表（Users）完整定义
   - 订单表（Orders）完整定义
   - 订单明细表（Order Items）完整定义
   - 设计要点总结

4. **[列命名规范](./guides/column-naming.md)**
   - 通用原则
   - 命名风格（蛇形命名）
   - 字段类型规范（主键、外键、时间戳、布尔值等）
   - 特殊命名模式
   - 命名检查清单

5. **[关系设计模式](./guides/relationship-design.md)**
   - 关系类型（一对一、一对多、多对多）
   - 外键定义
   - JOIN 关系定义
   - 常见关系模式（主从表、分类层级、时间序列等）
   - 性能考虑

6. **[SQL 最佳实践](./guides/sql-best-practices.md)**
   - 查询结构
   - SELECT 最佳实践
   - WHERE 子句
   - JOIN 最佳实践
   - GROUP BY 和聚合
   - ORDER BY 和 LIMIT
   - 性能优化

7. **[Schema 使用指南](./guides/schema-usage.md)**
   - 快速开始
   - 如何创建第一个表
   - 如何定义关系
   - 如何添加常用过滤器
   - 如何定义度量
   - 验证和测试
   - 最佳实践
   - 完整工作流

## 完整示例

### Cube 层示例

- [business-metrics.yaml](./examples/business-metrics.yaml) - 核心业务指标

### Schema 层示例

- [users-complete.yaml](./examples/users-complete.yaml) - 用户表完整定义
- [products-complete.yaml](./examples/products-complete.yaml) - 商品表完整定义
- [order_items-complete.yaml](./examples/order_items-complete.yaml) - 订单明细表完整定义

### 关系定义示例

- [user-orders.yaml](./joins/user-orders.yaml) - 用户-订单关系
- [order-products.yaml](./joins/order-products.yaml) - 订单-商品关系
- [order-order_items.yaml](./joins/order-order_items.yaml) - 订单-明细关系

### 查询示例

- [daily-order-stats.sql](./examples/daily-order-stats.sql) - 每日订单统计
- [user-order-stats.sql](./examples/user-order-stats.sql) - 用户订单统计
- [product-sales-stats.sql](./examples/product-sales-stats.sql) - 商品销售统计

## Schema 规范

### Schema 层格式

```yaml
# schema/tables/{table_name}.yaml
table:
  name: table_name              # 表名（单数，蛇形命名）
  description: |               # 详细描述（业务视角）
    表的详细描述，包含用途、数据范围、常见场景
  
  database: database_name        # 数据库名称（可选）
  schema: schema_name          # Schema 名称（可选）

columns:
  - name: column_name          # 列名（蛇形命名）
    type: data_type           # 数据类型
    description: "列的详细描述"
    primary_key: true         # 是否为主键
    foreign_key:             # 外键定义
      table: referenced_table
        column: referenced_column
    enum:                   # 枚举值
      - value: enum_value
        description: "枚举值含义"

common_filters:
  - name: filter_name        # 过滤器名称
    sql: "SQL 条件"        # 过滤条件
    description: "过滤器描述"

measures:
  - name: metric_name       # 度量名称
    sql: "SQL 聚合"      # 聚合表达式
    description: "度量描述"
    filters:               # 过滤条件
      - "过滤条件 1"
```

### Cube 层格式

```yaml
# schema/cubes/{cube_name}.yaml
cube: cube_name
description: "Cube 的业务描述"

dimensions:
  - name: dimension_name
    description: "维度描述"
    column: "{table}.{column}"
    granularity:
      - level_name:
          sql: "SQL expression"
          description: "粒度描述"

metrics:
  - name: metric_name
    description: "指标的业务含义"
    sql: "{SQL expression}"
    type: sum | count | avg | percentage | ratio
    category: financial | operational | growth | customer | product
    unit: "单位"

filters:
  - name: filter_name
    sql: "{WHERE condition}"
    description: "过滤器描述"
    dimension: time | geography | user | product

joins:
  - from: {table_a}
    to: {table_b}
    type: {join_type}
    condition: "{join_condition}"
```

## 验证 Schema

使用 SQL-Zen CLI 验证 Schema 文件：

```bash
# 验证所有 Schema 文件
sql-zen validate

# 验证特定表
sql-zen validate --table users

# 验证特定 Cube
sql-zen validate --cube business-metrics
```

## 使用 Agent Skills

SQL-Zen 提供了基于 open standard 的 Agent Skills，帮助 LLM 更好地理解和使用双层架构：

1. **[sql-zen-explore](../agentskills/sql-zen-explore.md)** - 系统化探索 Cube 层和 Schema 层
2. **[sql-zen-query](../agentskills/sql-zen-query.md)** - 基于 Cube 层生成高质量 SQL
3. **[sql-zen-analyze](../agentskills/sql-zen-analyze.md)** - 数据分析洞察

## 常见问题

### Q: Cube 层和 Schema 层有什么区别？

A: 
- **Schema 层**：描述表结构（列、类型、约束），面向数据工程师
- **Cube 层**：定义业务指标和维度（收入、转化率），面向业务分析师
- **关系**：Cube 层引用 Schema 层的表和列

### Q: 什么时候创建 Cube，什么时候创建 Schema？

A: 
- **先创建 Cube 层**：定义你的业务指标和维度
- **再创建 Schema 层**：如果表结构还没有定义，或者 Cube 需要的表结构还不存在

### Q: Cube 是否可以跨多个表？

A: 是的。Cube 的度量可以引用多个表，在 `joins` 部分定义表间关系。

### Q: 描述应该多长？

A: 平衡详细性和简洁性。一般 2-3 句话，必要时使用项目符号列出关键信息。

### Q: 如何组织多个 Cube？

A: 按业务域组织：
- `business-metrics.yaml` - 核心业务指标
- `user-analytics.yaml` - 用户分析
- `product-analytics.yaml` - 商品分析
- `revenue-analytics.yaml` - 收入分析

### Q: 是否每个 Cube 都需要定义所有维度？

A: 不需要。每个 Cube 可以定义自己需要的维度。常见维度（如时间）可以复用。

## 参考资料

- [设计文档](../docs/design.md) - 架构设计和双层语义架构
- [Agent 开发指南](../AGENTS.md) - 开发者指南
- [Cube 设计指南](./guides/cube-design.md) - 详细的 Cube 设计方法
- [Schema 使用指南](./guides/schema-usage.md) - 实用使用指南

## 双层架构的优势

### 1. 业务语义优先
用户用"收入"、"转化率"而非 `SUM(amount)` 提问，更符合业务语言。

### 2. 复用计算逻辑
复杂的业务逻辑（如转化率、CLV）只定义一次，多处复用。

### 3. 隐藏复杂性
底层数据结构变化不影响业务语义，Cube 定义保持稳定。

### 4. 面向不同用户
- **业务分析师**：使用 Cube 层，用业务语言查询
- **数据工程师**：使用 Schema 层，管理表结构
- **LLM**：在两层之间导航，生成更准确的 SQL

通过遵循这些指南，你可以创建高质量的 Cube 层和 Schema 层，显著提升业务分析的准确性和效率。
