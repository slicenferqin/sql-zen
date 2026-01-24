# Schema 使用指南

本指南提供 SQL-Zen Schema 的实用指南，帮助你快速上手和高效使用。

## 目录

1. [快速开始](#快速开始)
2. [创建第一个表](#创建第一个表)
3. [定义关系](#定义关系)
4. [添加常用过滤器](#添加常用过滤器)
5. [定义度量](#定义度量)
6. [提供查询示例](#提供查询示例)
7. [验证和测试](#验证和测试)
8. [最佳实践](#最佳实践)

---

## 快速开始

### 1. 初始化项目

```bash
# 创建并初始化 SQL-Zen 项目
sql-zen init

# 进入项目目录
cd my-sql-zen-project
```

这会创建以下结构：

```
my-sql-zen-project/
├── schema/
│   ├── tables/
│   ├── joins/
│   ├── measures/
│   └── examples/
└── .env
```

### 2. 配置数据库连接

编辑 `.env` 文件：

```bash
# LLM API Key
ANTHROPIC_API_KEY=sk-ant-...

# 数据库连接（根据你的数据库类型选择）
DATABASE_TYPE=postgresql
DATABASE_URL=postgresql://user:pass@localhost:5432/mydb
```

### 3. 开始提问

```bash
sql-zen ask "查询所有用户"
```

---

## 创建第一个表

### 示例：创建用户表

在 `schema/tables/users.yaml` 中创建：

```yaml
table:
  name: users
  description: "用户表，存储所有注册用户的基本信息"
  
  columns:
    - name: id
      type: BIGINT
      description: "用户唯一标识符"
      primary_key: true

    - name: email
      type: VARCHAR(255)
      description: "用户邮箱地址，用于登录和通知"

    - name: username
      type: VARCHAR(50)
      description: "用户名，用于显示"

    - name: full_name
      type: VARCHAR(100)
      description: "用户全名"

    - name: status
      type: VARCHAR(20)
      description: "用户账户状态"
      enum:
        - value: active
          description: "活跃用户"
        - value: inactive
          description: "非活跃用户"

    - name: created_at
      type: TIMESTAMP
      description: "用户账户创建时间"

  common_filters:
    - name: active_users
      sql: "status = 'active'"
      description: "筛选活跃用户"

  measures:
    - name: total_users
      sql: "COUNT(*)"
      description: "总用户数"
```

### 关键要点

1. **描述要详细**：说明表的用途、数据范围、常见场景
2. **枚举所有状态**：为状态字段定义枚举值
3. **提供常用过滤器**：为高频查询预定义过滤器
4. **定义常用度量**：为常见分析指标预定义度量

---

## 定义关系

### 示例：用户-订单关系

在 `schema/joins/user-orders.yaml` 中创建：

```yaml
relationship:
  name: user_orders
  from_table: users
  to_table: orders
  type: one_to_many
  join_sql: "LEFT JOIN orders ON users.id = orders.user_id"
  description: |
    用户和订单的一对多关系。
    
    每个用户可以有多个订单，每个订单属于一个用户。
    关联字段：users.id → orders.user_id
    
    使用场景：
    - 查询用户的所有订单
    - 计算用户的总消费金额
    - 分析用户购买行为
```

### 关系类型选择

- **one_to_one**：一对一（如用户资料与用户账户）
- **one_to_many**：一对多（如用户与订单）
- **many_to_one**：多对一（如订单与用户）
- **many_to_many**：多对多（如订单与产品，通过中间表）

---

## 添加常用过滤器

### 示例：订单表的过滤器

在表定义中添加：

```yaml
table:
  name: orders
  # ... 其他字段

  common_filters:
    - name: paid_orders
      sql: "status = 'paid' AND payment_status = 'paid'"
      description: "已支付且未取消的订单"

    - name: delivered_orders
      sql: "status = 'delivered'"
      description: "已完成的订单"

    - name: orders_last_7_days
      sql: "created_at >= DATE_SUB(CURRENT_DATE, INTERVAL 7 DAY)"
      description: "最近7天的订单"

    - name: high_value_orders
      sql: "total_amount >= 1000"
      description: "金额超过1000的高价值订单"
```

### 使用场景

过滤器用于：
- 时间范围过滤（如最近30天、本月）
- 状态过滤（如已支付、已发货）
- 数值过滤（如金额大于某个值）
- 组合过滤（多个条件组合）

---

## 定义度量

### 示例：订单表的度量

在表定义中添加：

```yaml
table:
  name: orders
  # ... 其他字段

  measures:
    - name: total_orders
      sql: "COUNT(*)"
      description: "订单总数"
      filters: []

    - name: total_revenue
      sql: "SUM(total_amount)"
      description: "总订单金额"
      filters:
        - "status = 'paid'"
        - "status != 'cancelled'"

    - name: average_order_value
      sql: "AVG(total_amount)"
      description: "平均订单金额（AOV）"
      filters:
        - "status = 'paid'"
        - "status != 'cancelled'"

    - name: daily_revenue
      sql: "SUM(total_amount)"
      description: "每日订单金额"
      filters:
        - "DATE(created_at) = CURRENT_DATE"
```

### 度量类型

1. **计数度量**：`COUNT(*)`
2. **求和度量**：`SUM(amount)`
3. **平均度量**：`AVG(value)`
4. **比率度量**：`AVG(CASE WHEN condition THEN 1 ELSE 0 END)`

---

## 提供查询示例

### 示例：每日订单统计

在 `schema/examples/daily-order-stats.sql` 中创建：

```sql
-- 查询目的：获取每日订单统计
--
-- 统计每日的订单数量和金额，
-- 包含订单状态分布

SELECT
    DATE(created_at) AS order_date,
    COUNT(*) AS total_orders,
    SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) AS paid_orders,
    SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) AS delivered_orders,
    SUM(total_amount) AS total_revenue,
    AVG(total_amount) AS avg_order_value
FROM orders
WHERE created_at >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY)
GROUP BY DATE(created_at)
ORDER BY order_date DESC;
```

### 查询示例的价值

1. **教育意义**：展示如何使用 Schema
2. **参考价值**：提供常见查询模式
3. **文档价值**：作为 Schema 文档的一部分
4. **测试价值**：验证 Schema 设计

---

## 验证和测试

### 验证 Schema 文件

```bash
# 验证所有 Schema 文件
sql-zen validate

# 验证特定表
sql-zen validate --table users

# 验证特定关系
sql-zen validate --join user-orders
```

### 测试查询

```bash
# 使用 ask 命令测试
sql-zen ask "查询所有活跃用户"
sql-zen ask "获取最近7天的订单"
sql-zen ask "计算总销售额"
```

### 常见问题

**问题：验证失败怎么办？**

检查以下几点：
1. YAML 语法是否正确（缩进、引号）
2. 表名是否使用蛇形命名
3. 列类型是否正确
4. 外键引用的表是否存在

---

## 最佳实践

### 1. 从小表开始

先从核心表开始（如 users、orders），逐步添加相关表。

### 2. 迭代完善

不需要一次性完善所有细节，先创建基础版本，逐步完善。

### 3. 参考示例

参考 `schema/examples/` 下的完整示例，学习最佳实践。

### 4. 验证频繁

每创建一个表或关系，立即验证，避免积累问题。

### 5. 保持文档同步

Schema 修改后，同步更新相关文档和示例。

---

## 完整工作流

### 示例：电商系统

```bash
# 1. 初始化项目
sql-zen init

# 2. 创建核心表
# - users.yaml
# - products.yaml
# - orders.yaml

# 3. 创建关系
# - user-orders.yaml
# - order-products.yaml

# 4. 添加过滤器和度量
# - 为每个表添加 common_filters
# - 为每个表添加 measures

# 5. 提供查询示例
# - daily-order-stats.sql
# - product-sales-stats.sql

# 6. 验证
sql-zen validate

# 7. 测试
sql-zen ask "查询最近7天的订单"
sql-zen ask "获取销售额最高的10个产品"
```

---

## 进阶技巧

### 1. 使用视图简化复杂查询

创建视图封装复杂逻辑，在 Schema 中引用视图。

### 2. 冗余字段提升性能

为高频查询添加冗余字段，减少 JOIN。

### 3. 使用 CTE 提高可读性

在查询示例中使用 WITH 子句，提高可读性。

### 4. 建立命名约定

为项目建立统一的命名约定，保持一致性。

---

## 常见问题

### Q: 需要为所有列添加描述吗？

A: 是的，所有列都应该有描述。描述是 LLM 理解 Schema 的关键。

### Q: 什么时候需要定义关系？

A: 当表间有外键关联时，应该定义关系。这能帮助 LLM 生成正确的 JOIN。

### Q: 度量应该定义多少？

A: 定义最常见的 5-10 个度量即可。不要过度设计。

### Q: 如何处理复杂业务逻辑？

A: 在描述中解释业务逻辑，或者创建视图，在 Schema 中引用视图。

---

## 下一步

1. 阅读 [Schema 设计方法论](./schema-methodology.md) 深入了解设计原则
2. 查看 [表设计示例](./table-design.md) 学习完整示例
3. 阅读 [列命名规范](./column-naming.md) 建立命名约定
4. 查看 [SQL 最佳实践](./sql-best-practices.md) 优化查询

---

通过遵循这些指南，你可以快速创建高质量的 SQL-Zen Schema，并开始使用自然语言查询数据库。
