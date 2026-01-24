# SQL-Zen 需求与设计文档

## 1. 项目愿景

**SQL-Zen** 是一个极简主义的 Text-to-SQL Agent，采用**双层语义架构**：
- **Schema 层**：描述表结构和数据模型
- **Cube 层**：定义业务语义指标和维度

受 Vercel d0 项目启发，采用"文件系统驱动"的架构理念。

**核心理念**: Less Tools, More Intelligence — 用最少的工具，释放 LLM 最大的推理能力。

## 2. 问题背景

### 2.1 传统 Text-to-SQL 方案的痛点

| 问题 | 描述 |
|------|------|
| 工具过多 | 动辄 10+ 个专用工具，维护成本高 |
| 过度约束 | 大量 prompt engineering 限制模型推理 |
| 复杂 RAG | 手写检索逻辑，效果不稳定 |
| 缺少语义层 | LLM 需要理解底层数据库结构，而非业务指标 |
| 重复计算 | 每次查询都要重新生成相同的业务逻辑 |

### 2.2 Vercel 的启示

Vercel 将 15+ 工具精简为 2 个，获得了：
- 3.5x 更快的执行速度
- 100% 成功率（vs 80%）
- 37% 更少的 token 消耗
- 42% 更少的执行步骤

## 3. 设计原则

### 3.1 核心原则

1. **极简工具集**: 只提供 2 个核心工具
   - `execute_bash`: 执行 shell 命令（grep, cat, ls, find）
   - `execute_sql`: 执行生成的 SQL 查询

2. **双层语义架构**:
   - **Schema 层**: 表结构定义，面向数据工程师
   - **Cube 层**: 业务指标定义，面向业务分析师

3. **文件系统即上下文**: Schema 和 Cube 都以结构化文件形式存储

4. **信任模型推理**: 不预设约束，让模型自主决策

5. **文档驱动**: 高质量的语义文档是成功的基础

### 3.2 非目标 (Non-Goals)

- 不做复杂的 RAG 检索
- 不做多轮对话状态管理
- 不做查询结果可视化
- 不做实时数据同步

## 4. 系统架构

### 4.1 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                        SQL-Zen                               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌─────────────┐                                            │
│   │  用户输入    │  "上个月每个用户的收入是多少？"        │
│   └──────┬──────┘                                            │
│          │                                                   │
│          ▼                                                   │
│   ┌─────────────────────────────────────────────┐            │
│   │              LLM Agent Core                  │            │
│   │  ┌─────────────────────────────────────┐    │            │
│   │  │  System Prompt + Skills             │    │            │
│   │  │  - 角色定义                          │    │            │
│   │  │  - 双层架构说明                     │    │            │
│   │  │  - 工具使用指南                      │    │            │
│   │  │  - Skills 使用指南                      │    │            │
│   │  └─────────────────────────────────────┘    │            │
│   │                                              │            │
│   │  ┌─────────────┐    ┌─────────────┐         │            │
│   │  │execute_bash │    │ execute_sql │         │            │
│   │  └──────┬──────┘    └──────┬──────┘         │            │
│   └─────────┼──────────────────┼────────────────┘            │
│             │                  │                             │
│             ▼                  ▼                             │
│   ┌─────────────────┐  ┌─────────────────┐                   │
│   │  Sandbox 环境    │  │   数据库连接     │                   │
│   │  (文件系统)    │  │  (执行 SQL)     │                   │
│   │                │  │                 │                   │
│   │  ┌───────────┐ │  │                 │                   │
│   │  │ Cube 层    │ │  │                 │                   │
│   │  │ metrics/   │ │  │                 │                   │
│   │  │ dimensions/│ │  │                 │                   │
│   │  └───────────┘ │  │                 │                   │
│   │                │  │                 │                   │
│   │  ┌───────────┐ │  │                 │                   │
│   │  │Schema 层   │ │  │                 │                   │
│   │  │ tables/    │ │  │                 │                   │
│   │  │ joins/     │ │  │                 │                   │
│   │  └───────────┘ │  │                 │                   │
│   │                │  │                 │                   │
│   │  ┌───────────┐ │  │                 │                   │
│   │  │Skills 文档  │ │  │                 │                   │
│   │  └───────────┘ │  │                 │                   │
│   └─────────────────┘  └─────────────────┘                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 双层语义架构

#### Schema 层（底层）

**目标**: 描述表结构和数据模型

**用户**: 数据工程师、开发者

**内容**:
- 表定义（columns, types, constraints）
- 表间关系（foreign keys, joins）
- 数据字典（列的含义、枚举值）

**示例**:
```yaml
# schema/tables/orders.yaml
table:
  name: orders
  description: "订单主表，记录所有用户订单信息"
  
  columns:
    - name: order_id
      type: BIGINT
      description: "订单唯一标识"
      primary_key: true
      
    - name: user_id
      type: BIGINT
      description: "用户ID，关联 users 表"
      foreign_key:
        table: users
        column: id
        
    - name: total_amount
      type: DECIMAL(12,2)
      description: "订单总金额（单位：元）"
```

#### Cube 层（业务语义层）

**目标**: 定义业务指标和维度

**用户**: 业务分析师、产品经理

**内容**:
- Metrics（业务指标：收入、转化率、CLV）
- Dimensions（维度：时间、地理、用户分层）
- 跨表计算逻辑
- 预定义过滤器

**示例**:
```yaml
# schema/cubes/business-metrics.yaml
cube: business_analytics
description: "核心业务指标定义"

dimensions:
  - name: time
    description: "时间维度"
    column: "DATE(orders.created_at)"
    granularity:
      - year
      - month
      - week
      - day
      
  - name: user_tier
    description: "用户分层维度"
    column: "users.subscription_tier"

metrics:
  - name: revenue
    description: "总收入，包含所有已支付订单的金额"
    sql: "SUM(CASE WHEN orders.status = 'paid' THEN orders.total_amount END)"
    type: sum
    
  - name: net_revenue
    description: "净收入，扣除退款后的实际收入"
    sql: "SUM(orders.total_amount - COALESCE(orders.refunded_amount, 0))"
    type: sum
    
  - name: conversion_rate
    description: "转化率，从注册到首次购买的比例"
    sql: |
      COUNT(DISTINCT CASE WHEN o.status = 'paid' THEN o.user_id END)::DECIMAL / 
      COUNT(DISTINCT u.id) * 100
    type: percentage
    
  - name: customer_lifetime_value
    description: "客户生命周期价值，单个客户的平均消费金额"
    sql: "SUM(orders.total_amount) / COUNT(DISTINCT orders.user_id)"
    type: avg

joins:
  - from: orders
    to: users
    type: left
    condition: "orders.user_id = users.id"

filters:
  - name: last_30_days
    sql: "orders.created_at >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY)"
    description: "最近30天"
    
  - name: paid_orders_only
    sql: "orders.status IN ('paid', 'delivered')"
    description: "已支付订单"
```

### 4.3 两层关系

```
┌─────────────────────────────────────────┐
│          Cube 层                      │
│  - 业务语义指标                     │
│  - 维度                             │
│  - 跨表逻辑                         │
│  - 预定义过滤器                       │
└─────────────┬─────────────────────┘
              │ 引用
              ▼
┌─────────────────────────────────────────┐
│          Schema 层                     │
│  - 表结构                          │
│  - 列定义                           │
│  - 表间关系                         │
└─────────────┬─────────────────────┘
              │ 映射
              ▼
┌─────────────────────────────────────────┐
│          物理数据库                     │
│  - 实际表                         │
│  - 数据存储                         │
└─────────────────────────────────────────┘
```

**LLM 查询流程**:
1. 理解用户问题（如"上个月收入"）
2. 在 Cube 层找到 `revenue` 指标
3. 理解 `revenue` 的 SQL 表达式
4. 在 Schema 层找到表结构
5. 生成最终 SQL 查询

## 5. Schema 文件规范

### 5.1 目录结构

```
schema/
├── cubes/                 # Cube 层（业务语义）
│   ├── business-metrics.yaml    # 核心业务指标
│   ├── user-analytics.yaml     # 用户分析
│   └── product-analytics.yaml  # 商品分析
├── tables/                # Schema 层（表结构）
│   ├── orders.yaml
│   ├── users.yaml
│   └── products.yaml
├── joins/                 # 关联关系
│   ├── user-orders.yaml
│   ├── order-products.yaml
│   └── ...
├── guides/                # 设计指南
│   ├── schema-methodology.md
│   ├── table-design.md
│   ├── cube-design.md
│   └── ...
├── examples/              # 示例 SQL
│   ├── daily-revenue.sql
│   └── ...
└── README.md
```

### 5.2 Schema 层格式 (tables/)

```yaml
# schema/tables/orders.yaml
table:
  name: orders
  description: "订单主表，记录所有用户订单信息"
  database: analytics
  schema: public
  
  columns:
    - name: order_id
      type: BIGINT
      description: "订单唯一标识"
      primary_key: true
      examples: ["ORD-2024-001", "ORD-2024-002"]
      
    - name: user_id
      type: BIGINT
      description: "用户ID，关联 users 表"
      foreign_key: 
        table: users
        column: id
        
    - name: total_amount
      type: DECIMAL(12,2)
      description: "订单总金额（单位：元）"
      
    - name: status
      type: VARCHAR(50)
      description: "订单状态"
      enum: 
        - value: pending
          description: "待支付"
        - value: paid
          description: "已支付"
        - value: shipped
          description: "已发货"
        - value: completed
          description: "已完成"
        - value: cancelled
          description: "已取消"
      
    - name: created_at
      type: TIMESTAMP
      description: "订单创建时间"
```

### 5.3 Cube 层格式 (cubes/)

```yaml
# schema/cubes/business-metrics.yaml
cube: business_analytics
description: "核心业务指标，包括收入、订单、用户分析"

dimensions:
  - name: time
    description: "时间维度"
    column: "DATE(orders.created_at)"
    granularity:
      - year: "YEAR(orders.created_at)"
      - month: "DATE_FORMAT(orders.created_at, '%Y-%m')"
      - week: "YEARWEEK(orders.created_at)"
      - day: "DATE(orders.created_at)"
      
  - name: user_tier
    description: "用户分层维度"
    column: "users.subscription_tier"
    enum: [free, basic, premium]
    
  - name: geography
    description: "地理维度"
    columns:
      - "orders.shipping_country"
      - "users.country"

metrics:
  - name: revenue
    description: "总收入，包含所有已支付订单的金额"
    sql: "SUM(CASE WHEN orders.status = 'paid' THEN orders.total_amount END)"
    type: sum
    category: financial
    
  - name: net_revenue
    description: "净收入，扣除退款后的实际收入"
    sql: "SUM(orders.total_amount - COALESCE(orders.refunded_amount, 0))"
    type: sum
    category: financial
    
  - name: total_orders
    description: "总订单数"
    sql: "COUNT(orders.id)"
    type: count
    category: operational
    
  - name: average_order_value
    description: "平均客单价（AOV）"
    sql: "AVG(orders.total_amount)"
    type: avg
    category: financial
    
  - name: customer_lifetime_value
    description: "客户生命周期价值，单个客户的平均消费金额"
    sql: "SUM(orders.total_amount) / COUNT(DISTINCT orders.user_id)"
    type: avg
    category: customer
    
  - name: conversion_rate
    description: "转化率，从注册到首次购买的比例"
    sql: |
      COUNT(DISTINCT CASE WHEN o.status = 'paid' THEN o.user_id END)::DECIMAL / 
      COUNT(DISTINCT u.id) * 100
    type: percentage
    category: growth
    
  - name: repeat_purchase_rate
    description: "复购率，有多次购买的用户比例"
    sql: |
      SUM(CASE WHEN order_count > 1 THEN 1 ELSE 0 END)::DECIMAL / 
      COUNT(DISTINCT orders.user_id) * 100
    type: percentage
    category: customer

joins:
  - from: orders
    to: users
    type: left
    condition: "orders.user_id = users.id"
    
  - from: orders
    to: order_items
    type: inner
    condition: "orders.id = order_items.order_id"

filters:
  - name: last_30_days
    sql: "orders.created_at >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY)"
    description: "最近30天"
    dimension: time
    
  - name: last_7_days
    sql: "orders.created_at >= DATE_SUB(CURRENT_DATE, INTERVAL 7 DAY)"
    description: "最近7天"
    dimension: time
    
  - name: last_month
    sql: "orders.created_at >= DATE_FORMAT(CURRENT_DATE, '%Y-%m-01')"
    description: "本月"
    dimension: time
    
  - name: paid_orders_only
    sql: "orders.status IN ('paid', 'delivered')"
    description: "已支付订单"
    
  - name: active_users
    sql: "users.status = 'active' AND users.is_verified = true"
    description: "活跃用户"
    dimension: user
```

### 5.4 关联关系定义 (joins/)

```yaml
# schema/joins/user-orders.yaml
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

## 6. Agent Skills 设计

### 6.1 什么是 Agent Skills？

**Agent Skills** 是基于 [Agent Skills 开放标准](https://agentskills.io) 的扩展机制。

**核心概念**：
- Skills 是 **文件夹 + SKILL.md 文件**
- SKILL.md 包含 **YAML frontmatter + Markdown 指令**
- Agent 可以自动发现和使用 Skills

### 6.2 SQL-Zen 推荐的 Skills

SQL-Zen 将提供 3 个核心 Skills：

1. **sql-zen-explore**: 系统化探索 Schema 和 Cube 层
2. **sql-zen-query**: 基于 Cube 层智能生成 SQL 查询
3. **sql-zen-analyze**: 分析查询结果，提供业务洞察

### 6.3 Skills 与双层架构的关系

```
sql-zen-explore:
  1. 先探索 cubes/ 找到相关业务指标
  2. 再探索 tables/ 找到底层数据结构
  3. 返回语义和结构的完整理解

sql-zen-query:
  1. 在 cubes/ 中找到目标指标
  2. 理解指标的 SQL 表达式
  3. 在 tables/ 中找到表结构
  4. 生成最终 SQL 查询

sql-zen-analyze:
  1. 基于 cubes/ 中的指标定义
  2. 对查询结果进行分析和解读
  3. 提供业务视角的洞察
```

## 7. 工具定义

### 7.1 execute_bash

```typescript
interface ExecuteBashTool {
  name: "execute_bash";
  description: "在 Schema 目录中执行 shell 命令，用于探索和理解数据结构";
  parameters: {
    command: string;  // 要执行的命令
  };
  allowed_commands: ["ls", "cat", "grep", "find", "head", "tail", "wc"];
  sandbox_path: "./schema";  // 只能在 schema 目录执行
}
```

### 7.2 execute_sql

```typescript
interface ExecuteSqlTool {
  name: "execute_sql";
  description: "执行 SQL 查询并返回结果";
  parameters: {
    sql: string;      // 要执行的 SQL 语句
    limit?: number;   // 结果行数限制，默认 100
  };
  timeout: 30s;  // 查询超时时间
}
```

## 8. 支持的数据库

### MVP 阶段 (v0.1.0)
- PostgreSQL
- MySQL
- SQLite

### 后续扩展
- ClickHouse
- DuckDB
- BigQuery
- Snowflake

## 9. 技术选型

| 组件 | 选择 | 理由 |
|------|------|------|
| 语言 | TypeScript | 类型安全，生态丰富 |
| LLM SDK | Vercel AI SDK | 统一接口，支持多模型 |
| 数据库连接 | 原生驱动 (pg, mysql2, better-sqlite3) | 轻量，高性能 |
| CLI | Commander.js | 成熟的 CLI 框架 |

## 10. 安全考虑

1. **沙箱隔离**: bash 命令只能在 schema 目录内执行
2. **命令白名单**: 只允许 ls, cat, grep, find 等只读命令
3. **SQL 限制**: 
   - 默认只允许 SELECT 语句
   - 可配置的行数限制
   - 超时控制
4. **敏感信息**: Schema 和 Cube 文件不应包含真实数据样本

## 11. 成功指标

| 指标 | 目标 |
|------|------|
| 查询成功率 | > 90% |
| 平均响应时间 | < 30s |
| Token 效率 | < 50k tokens/query |
| 业务指标准确率 | > 85% |
| 用户满意度 | > 4/5 |

## 12. 版本规划

### v0.1.0 (当前) - MVP
- ✅ 双层语义架构（Schema 层 + Cube 层）
- ✅ PostgreSQL, MySQL, SQLite 支持
- ✅ CLI 工具（init, ask, validate）
- ✅ Agent Skills 集成
- ✅ 完整的设计指南文档

### v0.2.0 - 增强
- Cube 层验证工具
- 查询结果缓存
- 多模型支持（GPT-4, Ollama）
- 交互式 REPL 模式

### v1.0.0 - 生产就绪
- Web UI
- 权限控制
- 审计日志
- 企业级功能
