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

### 4.2 Agent Skills 集成 (v0.2.0+)

**设计理念**: SQL-Zen 核心保持极简，通过 Agent Skills 开放标准提供可选的扩展

**重要说明**: Agent Skills 不是 SQL-Zen 的内部组件，而是基于 [Agent Skills 开放标准](https://agentskills.io) 的用户扩展。

```
SQL-Zen 架构
├── 核心层 (SQL-Zen 提供)
│   ├── execute_bash: 执行 shell 命令
│   ├── execute_sql: 执行 SQL 查询
│   └── schema/: YAML 文件系统
│
└── Skills 层 (用户可选创建)
    ├── .claude/skills/sql-zen-explore/  # Agent Skill
    ├── .claude/skills/sql-zen-query/    # Agent Skill
    └── schema/skills/*.yaml              # 查询模式文档
```

**关键特性**：
- ✅ 保持极简：核心仍然只有 2 个工具
- ✅ 开放标准：遵循 Agent Skills 标准，跨工具兼容
- ✅ 可选增强：Skills 是最佳实践封装，不是必需的
- ✅ 社区驱动：用户可创建和分享 Skills

**详细设计**: 参见 [Agent Skills 集成方案](./agent-skills-integration.md)

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

### 7.1 什么是 Agent Skills？

**Agent Skills** 是基于 [Agent Skills 开放标准](https://agentskills.io) 的扩展机制，由 Anthropic 发起，被多个 AI 工具支持（Claude Code, Cursor, VS Code 等）。

**核心概念**：
- Skills 是 **文件夹 + SKILL.md 文件**
- SKILL.md 包含 **YAML frontmatter + Markdown 指令**
- Agent 可以自动发现和使用 Skills
- 每个 Skill 自动生成 `/skill-name` slash 命令

**文件结构**：
```
.claude/skills/sql-zen-explore/
├── SKILL.md           # 主指令文件（必需）
├── examples/          # 可选：示例
└── scripts/           # 可选：脚本
```

### 7.2 SQL-Zen 推荐的 Skills

SQL-Zen 将提供 3 个核心 Skills 作为最佳实践：

1. **sql-zen-explore**: 系统化探索 Schema 结构
2. **sql-zen-query**: 智能生成 SQL 查询
3. **sql-zen-analyze**: 分析查询结果

这些 Skills 是 **可选的**，用户可以选择使用或不使用。

### 7.3 Skills 与 SQL-Zen 核心的关系

| 组件 | 类型 | 位置 | 必需性 |
|------|------|------|--------|
| SQL-Zen 核心 | 框架 | npm 包 | 必需 |
| Agent Skills | 用户扩展 | `.claude/skills/` | 可选 |
| Schema Skills 文档 | 文档 | `schema/skills/` | 推荐 |

**工作流程**：
```
用户提问
    ↓
[可选] Agent 使用 /sql-zen-query skill
    ↓
Skill 指导 Agent 使用 SQL-Zen 工具
    ↓
Agent 使用 execute_bash 探索 schema/
    ↓
[可选] Agent 参考 schema/skills/common-queries.yaml
    ↓
Agent 使用 execute_sql 执行查询
    ↓
返回结果
```

### 7.4 Skills 的价值

**对用户**：
- 标准化的工作流程
- 最佳实践的封装
- 减少重复的指令
- 跨工具兼容（Claude Code, Cursor 等）

**对 SQL-Zen**：
- 不增加核心复杂度
- 保持 2 个工具的极简主义
- 通过开放标准提供扩展性
- 社区可贡献 Skills

**详细设计**: 参见 [Agent Skills 集成方案](./agent-skills-integration.md)

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
