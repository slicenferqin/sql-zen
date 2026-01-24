# SQL-Zen 需求与设计文档

## 1. 项目愿景

**SQL-Zen** 是一个极简主义的 Text-to-SQL Agent，受 Vercel d0 项目启发，采用"文件系统驱动"的架构理念。

**核心理念**: Less Tools, More Intelligence — 用最少的工具，释放 LLM 最大的推理能力。

## 2. 问题背景

### 2.1 传统 Text-to-SQL 方案的痛点

| 问题 | 描述 |
|------|------|
| 工具过多 | 动辄 10+ 个专用工具，维护成本高 |
| 过度约束 | 大量 prompt engineering 限制模型推理 |
| 复杂 RAG | 手写检索逻辑，效果不稳定 |
| 脆弱性 | 每个边界情况都要打补丁 |
| 模型耦合 | 每次模型更新都要重新调整 |

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

2. **文件系统即上下文**: Schema 以结构化文件形式存储，让 LLM 自己探索

3. **信任模型推理**: 不预设约束，让模型自主决策

4. **文档驱动**: 高质量的 Schema 文档是成功的基础

### 3.2 非目标 (Non-Goals)

- 不做复杂的 RAG 检索
- 不做多轮对话状态管理（MVP 阶段）
- 不做查询结果可视化（MVP 阶段）

## 4. 系统架构

### 4.1 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                        SQL-Zen                               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌─────────────┐                                            │
│   │  用户输入    │  "上个月销售额最高的 10 个产品是什么？"      │
│   └──────┬──────┘                                            │
│          │                                                   │
│          ▼                                                   │
│   ┌─────────────────────────────────────────────┐            │
│   │              LLM Agent Core                  │            │
│   │  ┌─────────────────────────────────────┐    │            │
│   │  │  System Prompt + Skills             │    │            │
│   │  │  - 角色定义                          │    │            │
│   │  │  - Schema 目录结构说明               │    │            │
│   │  │  - 工具使用指南                      │    │            │
│   │  │  - Skills 使用指南 (v0.2.0+)        │    │            │
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
│   │  (Schema 文件)   │  │  (执行 SQL)     │                   │
│   │  + Skills 文档   │  │                 │                   │
│   └─────────────────┘  └─────────────────┘                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Skills 层架构 (v0.2.0+)

**设计理念**: 在保持 2 个工具不变的前提下，通过 Skills 提供结构化指导

```
SQL-Zen with Skills
├── Core Tools (核心工具 - 不变)
│   ├── execute_bash: 执行 shell 命令
│   └── execute_sql: 执行 SQL 查询
│
├── Code Skills (代码技能 - TypeScript)
│   ├── schema_exploration: 系统化探索 schema
│   ├── sql_generation: 智能生成 SQL
│   └── error_recovery: 错误处理和重试
│
└── Doc Skills (文档技能 - YAML)
    └── schema/skills/
        ├── common-queries.yaml: 常见查询模式
        ├── best-practices.yaml: SQL 最佳实践
        └── troubleshooting.yaml: 问题排查指南
```

**关键特性**：
- ✅ 保持极简：仍然只有 2 个工具
- ✅ 可选增强：Skills 提供指导，不强制使用
- ✅ 文档驱动：Skills 也是文档，可用 grep/cat 探索
- ✅ 渐进引入：v0.1.0 无 Skills，v0.2.0 引入

## 5. Schema 文件规范

### 5.1 目录结构

```
schema/
├── tables/                 # 表定义
│   ├── orders.yaml
│   ├── users.yaml
│   └── products.yaml
├── joins/                  # 关联关系
│   └── relationships.yaml
├── measures/               # 常用度量定义
│   └── metrics.yaml
├── skills/                 # Skills 文档 (v0.2.0+)
│   ├── common-queries.yaml
│   ├── best-practices.yaml
│   └── troubleshooting.yaml
├── examples/               # 示例 SQL
│   ├── sales_queries.sql
│   └── user_queries.sql
└── README.md               # Schema 概览
```

└── README.md               # Schema 概览
```

### 5.2 表定义格式 (YAML)

```yaml
# schema/tables/orders.yaml
table:
  name: orders
  description: "订单主表，记录所有用户订单信息"
  database: analytics
  schema: public
  
columns:
  - name: order_id
    type: string
    description: "订单唯一标识"
    primary_key: true
    examples: ["ORD-2024-001", "ORD-2024-002"]
    
  - name: user_id
    type: string
    description: "用户ID，关联 users 表"
    foreign_key: 
      table: users
      column: user_id
    
  - name: total_amount
    type: decimal(10,2)
    description: "订单总金额（单位：元）"
    
  - name: status
    type: string
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
    type: timestamp
    description: "订单创建时间"
    
common_filters:
  - name: recent_orders
    sql: "created_at >= CURRENT_DATE - INTERVAL '30 days'"
    description: "最近30天的订单"
```

### 5.3 关联关系定义

```yaml
# schema/joins/relationships.yaml
relationships:
  - name: orders_to_users
    from_table: orders
    to_table: users
    type: many_to_one
    join_sql: "orders.user_id = users.user_id"
    description: "订单关联到用户"
    
  - name: orders_to_products
    from_table: order_items
    to_table: products
    type: many_to_one
    join_sql: "order_items.product_id = products.product_id"
    description: "订单项关联到产品"
```

### 5.4 度量定义

```yaml
# schema/measures/metrics.yaml
measures:
  - name: total_revenue
    table: orders
    sql: "SUM(total_amount)"
    description: "总收入"
    filters:
      - "status IN ('paid', 'completed')"
      
  - name: order_count
    table: orders
    sql: "COUNT(DISTINCT order_id)"
    description: "订单数量"
    
  - name: avg_order_value
    table: orders
    sql: "AVG(total_amount)"
    description: "平均订单金额"
```

## 7. Agent Skills 设计 (v0.2.0+)

### 7.1 Skills 概念

**Agent Skills** 是可复用的能力模块，提供结构化的指导和最佳实践，帮助 Agent 更高效、更一致地完成任务。

**关键特性**：
- 高层抽象：比单个 tool 更高层次
- 可选使用：提供指导，不强制执行
- 文档驱动：Skills 也是文档，符合文件系统理念
- 保持极简：不增加工具数量

### 7.2 Skills 类型

#### 7.2.1 Code Skills (TypeScript)

提供结构化的 prompt 模板和可选的辅助函数。

```typescript
interface AgentSkill {
  name: string;
  description: string;
  category: string;
  tools: string[];
  promptTemplate: string;
  examples?: Example[];
}
```

**核心 Skills**：
1. `schema_exploration`: 系统化探索数据库结构
2. `sql_generation`: 智能生成和优化 SQL
3. `error_recovery`: 处理 SQL 错误和重试

#### 7.2.2 Doc Skills (YAML)

作为 schema 文档的一部分，可被 Agent 探索和参考。

```yaml
# schema/skills/common-queries.yaml
skills:
  - name: "时间范围查询"
    category: "query-patterns"
    best_practices:
      - "使用 >= 和 < 而不是 DATE() 函数"
      - "注意时区问题"
    examples:
      - description: "最近 30 天"
        sql: "WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'"
```

### 7.3 Skills 使用流程

```
用户问题
    ↓
Agent 选择合适的 Skill
    ↓
遵循 Skill 的 prompt 模板
    ↓
参考 schema/skills/ 中的文档
    ↓
使用 execute_bash 和 execute_sql
    ↓
返回结果
```

### 7.4 Skills 优势

| 维度 | 无 Skills | 有 Skills | 改进 |
|------|----------|-----------|------|
| 一致性 | 依赖 LLM 每次推理 | 标准化流程 | +30-40% |
| Token 效率 | 每次重复指导 | 复用模板 | +20-30% |
| 成功率 | 不稳定 | 遵循最佳实践 | +25-35% |
| 可维护性 | Prompt 臃肿 | 模块化 | +50% |

**详细分析**: 参见 [Agent Skills 分析文档](./agent-skills-analysis.md)

## 8. 工具定义

### 8.1 execute_bash

```typescript
interface ExecuteBashTool {
  name: "execute_bash";
  description: "在 Schema 目录中执行 shell 命令，用于探索和理解数据结构";
  parameters: {
    command: string;  // 要执行的命令，如 "ls schema/tables/" 或 "grep -r 'user_id' schema/"
  };
  allowed_commands: ["ls", "cat", "grep", "find", "head", "tail", "wc"];
}
```

### 8.2 execute_sql

```typescript
interface ExecuteBashTool {
  name: "execute_bash";
  description: "在 Schema 目录中执行 shell 命令，用于探索和理解数据结构";
  parameters: {
    command: string;  // 要执行的命令，如 "ls schema/tables/" 或 "grep -r 'user_id' schema/"
  };
  allowed_commands: ["ls", "cat", "grep", "find", "head", "tail", "wc"];
}
```

### 6.2 execute_sql

```typescript
interface ExecuteSqlTool {
  name: "execute_sql";
  description: "执行 SQL 查询并返回结果";
  parameters: {
    sql: string;      // 要执行的 SQL 语句
    limit?: number;   // 结果行数限制，默认 100
  };
}
```

## 7. 支持的数据库

### MVP 阶段
- PostgreSQL
- MySQL
- SQLite

### 后续扩展
- ClickHouse
- DuckDB
- BigQuery
- Snowflake

## 8. 技术选型

| 组件 | 选择 | 理由 |
|------|------|------|
| 语言 | TypeScript | 类型安全，生态丰富 |
| LLM SDK | Vercel AI SDK | 统一接口，支持多模型 |
| 沙箱 | Docker / vm2 | 安全执行 bash 命令 |
| 数据库连接 | Prisma / Knex | 多数据库支持 |
| CLI | Commander.js | 成熟的 CLI 框架 |

## 9. 安全考虑

1. **沙箱隔离**: bash 命令只能在 schema 目录内执行
2. **命令白名单**: 只允许 ls, cat, grep, find 等只读命令
3. **SQL 限制**: 
   - 默认只允许 SELECT 语句
   - 可配置的行数限制
   - 超时控制
4. **敏感信息**: Schema 文件不应包含真实数据样本

## 10. 成功指标

| 指标 | 目标 |
|------|------|
| 查询成功率 | > 90% |
| 平均响应时间 | < 30s |
| Token 效率 | < 50k tokens/query |
| 用户满意度 | > 4/5 |
