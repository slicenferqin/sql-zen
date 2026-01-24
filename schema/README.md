# Schema 目录

此目录包含数据库的语义层定义文件。

## 目录结构

```
schema/
├── tables/              # 表定义 (YAML)
│   └── examples/        # 完整的表定义示例
├── joins/               # 关联关系定义 (YAML)
├── skills/              # Agent Skills - 查询模式和最佳实践
│   ├── common-queries.yaml   # 常用查询模式
│   ├── best-practices.yaml  # SQL 最佳实践
│   └── troubleshooting.yaml # 常见问题排查
├── measures/            # 常用度量定义 (YAML)
├── examples/            # 示例 SQL 查询
└── guides/             # Schema 设计指南文档
    ├── schema-methodology.md    # Schema 设计方法论
    ├── table-design.md         # 表设计示例
    ├── column-naming.md       # 列命名规范
    ├── relationship-design.md   # 关系设计模式
    └── sql-best-practices.md # SQL 最佳实践
```

## 快速开始

### 1. 理解 Schema 结构

首先阅读 [Schema 使用指南](./guides/schema-usage.md)，了解：
- 如何创建第一个表
- 如何定义关系
- 如何添加常用过滤器
- 如何定义度量
- 如何提供查询示例

### 2. 深入设计原则

阅读 [Schema 设计方法论](./guides/schema-methodology.md)，了解：
- 设计原则（精确性、完整性、可查询性、一致性）
- 表命名规范
- 列设计指南
- 关系建模
- 度量定义
- 文档质量标准
- 验证清单

### 3. 创建表定义

参考 [完整表设计示例](./guides/table-design.md)，为每个表创建 YAML 文件：

```yaml
# schema/tables/users.yaml
table:
  name: users
  description: "用户表，存储用户基本信息"
  
  columns:
    - name: id
      type: BIGINT
      primary_key: true
      description: "用户唯一标识符"
```

### 3. 定义关联关系

在 `schema/joins/` 目录下定义表间关系：

```yaml
# schema/joins/user-orders.yaml
relationship:
  name: user_orders
  from_table: users
  to_table: orders
  type: one_to_many
  join_sql: "LEFT JOIN orders ON users.id = orders.user_id"
  description: "用户和订单的一对多关系"
```

### 4. 添加常用度量

在表定义中预定义常用分析指标：

```yaml
table:
  name: orders
  measures:
    - name: daily_revenue
      sql: "SUM(total_amount)"
      description: "每日订单金额"
```

### 5. 提供查询示例

在 `schema/examples/` 目录下添加常见查询示例：

```sql
-- schema/examples/daily-orders.sql
SELECT
    DATE(created_at) AS order_date,
    COUNT(*) AS order_count,
    SUM(total_amount) AS total_revenue
FROM orders
WHERE created_at >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY)
GROUP BY DATE(created_at);
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

2. **[表设计示例](./guides/table-design.md)**
   - 用户表（Users）完整定义
   - 订单表（Orders）完整定义
   - 订单明细表（Order Items）完整定义
   - 设计要点总结

3. **[列命名规范](./guides/column-naming.md)**
   - 通用原则
   - 命名风格
   - 字段类型规范（主键、外键、时间戳、布尔值等）
   - 特殊命名模式
   - 命名检查清单

4. **[关系设计模式](./guides/relationship-design.md)**
   - 关系类型（一对一、一对多、多对一、多对多）
   - 外键定义
   - JOIN 关系定义
   - 常见关系模式（主从表、分类层级、时间序列、标签系统、审计日志）
   - 性能考虑
   - 验证清单

5. **[SQL 最佳实践](./guides/sql-best-practices.md)**
   - 查询结构
   - SELECT 最佳实践
   - WHERE 子句
   - JOIN 最佳实践
   - GROUP BY 和聚合
   - ORDER BY 和 LIMIT
   - 子查询
   - 性能优化
   - 完整示例

## Schema 规范

### 表定义格式

```yaml
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
    examples:               # 示例值
      - "示例 1"
      - "示例 2"

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

### 关系定义格式

```yaml
relationship:
  name: relationship_name
  from_table: table_a      # 源表
  to_table: table_b        # 目标表
  type: one_to_one | one_to_many | many_to_one | many_to_many
  join_sql: |
    JOIN SQL 语句
  description: |
    关系的详细描述
    包含：关联字段、使用场景
```

## 示例文件

### 表定义示例

- `schema/examples/users-complete.yaml` - 用户表完整定义
- `schema/examples/products-complete.yaml` - 商品表完整定义
- `schema/examples/order_items-complete.yaml` - 订单明细表完整定义

### 关系定义示例

- `schema/joins/user-orders.yaml` - 用户-订单关系
- `schema/joins/order-products.yaml` - 订单-商品关系
- `schema/joins/order-order_items.yaml` - 订单-明细关系

### 查询示例

- `schema/examples/daily-order-stats.sql` - 每日订单统计
- `schema/examples/user-order-stats.sql` - 用户订单统计
- `schema/examples/product-sales-stats.sql` - 商品销售统计

## 验证 Schema

使用 SQL-Zen CLI 验证 Schema 文件：

```bash
# 验证所有 Schema 文件
sql-zen validate

# 验证特定表
sql-zen validate --table users
```

## 使用 Agent Skills

SQL-Zen 提供了基于 open standard 的 Agent Skills，帮助 LLM 更好地理解和使用 Schema：

1. **[sql-zen-explore](../agentskills/sql-zen-explore.md)** - 系统化探索 Schema
2. **[sql-zen-query](../agentskills/sql-zen-query.md)** - 高质量 SQL 生成
3. **[sql-zen-analyze](../agentskills/sql-zen-analyze.md)** - 数据分析洞察

## 常见问题

### Q: 如何决定是否定义外键？
A: 如果列引用了另一个表的主键，应该定义外键。这能帮助 LLM 理解表间关系，生成正确的 JOIN 语句。

### Q: 什么时候使用枚举？
A: 当列的取值是有限的、预定义的集合时（如状态码、类型、分类），应该定义枚举。这能显著提升查询准确性。

### Q: 度量应该在表定义中还是单独文件？
A: 如果度量仅用于单个表，放在表定义中。如果度量跨多个表或被多个场景复用，放在单独的 measures 文件中。

### Q: 描述应该多长？
A: 平衡详细性和简洁性。一般 2-3 句话，必要时使用项目符号列出关键信息。避免过于简短（如"用户ID"）或过于冗长。

## 参考资料

- [设计文档](../docs/design.md) - 架构和设计决策
- [Agent 开发指南](../AGENTS.md) - 开发者指南
- [官方设计文档](../docs/design.md)
