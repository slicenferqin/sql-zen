# SQL-Zen

> Less Tools, More Intelligence

**SQL-Zen** 是一个极简主义的 Text-to-SQL Agent，让你用自然语言查询数据库。

采用**双层语义架构**：**Schema 层**描述表结构，**Cube 层**定义业务指标。

## Why SQL-Zen?

传统 Text-to-SQL 方案的问题：

| 问题 | 传统方案 | SQL-Zen |
|------|----------|---------|
| 工具数量 | 15+ 个专用工具 | **2 个** |
| 架构复杂度 | 复杂的 RAG + 多轮验证 | **双层语义层** |
| 语义表达 | 依赖数据库结构 | **Cube 层定义业务指标** |
| 维护成本 | 每个边界情况都要打补丁 | **让模型自己处理** |
| 模型依赖 | 每次更新都要重新调整 | **信任模型推理能力** |

**核心理念**：不要替模型思考，给它好的语义上下文，让它自己探索。

## 双层语义架构

```
┌─────────────────────────────────────────┐
│          Cube 层（业务语义）           │
│  - 业务指标（收入、转化率、CLV）       │
│  - 维度（时间、地理、用户）             │
│  - 跨表计算逻辑                    │
└────────────┬────────────────────────────┘
             │ 引用
             ▼
┌─────────────────────────────────────────┐
│          Schema 层（表结构）          │
│  - 表定义（orders, users, products）     │
│  - 列定义（类型、约束）                 │
│  - 表间关系                            │
└────────────┬────────────────────────────┘
             │ 映射
             ▼
┌─────────────────────────────────────────┐
│          物理数据库                     │
│  (PostgreSQL, MySQL, SQLite)            │
└─────────────────────────────────────────┘
```

**优势**：
- **业务语义优先**：用户用"收入"、"转化率"而非 `SUM(amount)` 提问
- **复用计算逻辑**：复杂的业务逻辑只定义一次，多处复用
- **隐藏复杂性**：底层数据结构变化不影响业务语义

## Quick Start

```bash
# 安装
npm install -g sql-zen

# 初始化项目
sql-zen init

# 配置环境变量（创建 .env 文件）
cat > .env << EOF
ANTHROPIC_API_KEY=sk-ant-your-api-key-here
DB_TYPE=postgresql
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mydb
DB_USER=postgres
DB_PASSWORD=password
EOF

# 开始提问（使用业务术语）
sql-zen ask "上个月收入是多少？"
sql-zen ask "哪个用户群组的转化率最高？"
sql-zen ask "上周客户生命周期价值（CLV）是多少？"

# 使用自定义模型或 API 端点
sql-zen ask "复杂查询" --model claude-3-opus-20240229
sql-zen ask "查询" --base-url https://your-proxy.com/v1
```

详细配置说明请查看 [配置指南](./docs/configuration.md)。

## How It Works

```
┌──────────────────────────────────────────────────┐
│  "上个月收入是多少？"                         │
└────────────────────────┬─────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────┐
│                    LLM Agent                             │
│  ┌────────────────┐    ┌────────────────┐                │
│  │  execute_bash  │    │  execute_sql   │                │
│  │  grep/cat/ls   │    │  运行 SQL      │                │
│  │  探索 Cube 层   │    │               │                │
│  └───────┬────────┘    └───────┬────────┘                │
└──────────┼─────────────────────┼─────────────────────────┘
            │                     │
            ▼                     ▼
┌──────────────────┐    ┌──────────────────┐
│  Cube 文件系统  │    │     数据库       │
│  (业务语义层)    │    │  (PostgreSQL)   │
└──────────────────┘    └──────────────────┘
```

**Agent 的工作流程**：

1. 收到用户问题（如"上个月收入"）
2. 在 **Cube 层**找到 `revenue` 指标定义
3. 理解 `revenue` 的 SQL 表达式（如 `SUM(CASE WHEN ...)`）
4. 在 **Schema 层**找到表结构
5. 生成 SQL 并用 `execute_sql` 执行
6. 返回结果和解释

## Schema 文件结构

SQL-Zen 的核心是高质量的语义文档：

```
schema/
├── cubes/               # Cube 层（业务语义）
│   ├── business-metrics.yaml
│   ├── user-analytics.yaml
│   └── product-analytics.yaml
├── tables/              # Schema 层（表结构）
│   ├── orders.yaml
│   ├── users.yaml
│   └── products.yaml
├── joins/               # 关联关系
│   ├── user-orders.yaml
│   └── order-products.yaml
├── guides/              # 设计指南
│   ├── schema-methodology.md
│   ├── cube-design.md
│   └── ...
├── examples/            # 示例 SQL
│   ├── daily-revenue.sql
│   └── user-clv.sql
└── README.md
```

### Cube 层示例

```yaml
# schema/cubes/business-metrics.yaml
cube: business_analytics
description: "核心业务指标"

dimensions:
  - name: time
    description: "时间维度"
    column: "DATE(orders.created_at)"
    granularity:
      - month
      - week
      - day

metrics:
  - name: revenue
    description: "总收入，包含已支付订单的金额"
    sql: "SUM(CASE WHEN orders.status = 'paid' THEN orders.total_amount END)"
    type: sum
    
  - name: conversion_rate
    description: "转化率，从注册到首次购买的比例"
    sql: |
      COUNT(DISTINCT CASE WHEN o.status = 'paid' THEN o.user_id END)::DECIMAL / 
      COUNT(DISTINCT u.id) * 100
    type: percentage
    
  - name: customer_lifetime_value
    description: "客户生命周期价值（CLV）"
    sql: "SUM(orders.total_amount) / COUNT(DISTINCT orders.user_id)"
    type: avg

filters:
  - name: last_30_days
    sql: "orders.created_at >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY)"
    description: "最近30天"
```

### Schema 层示例

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
    foreign_key: users.user_id
    
  - name: total_amount
    type: DECIMAL(12,2)
    description: "订单总金额（单位：元）"
    
  - name: status
    type: VARCHAR(50)
    description: "订单状态"
    enum: [pending, paid, shipped, completed, cancelled]
```

## Features

### 已实现

- [x] 双层语义架构（Schema 层 + Cube 层）
- [x] CLI 工具 (`sql-zen init`, `sql-zen ask`, `sql-zen validate`)
- [x] PostgreSQL 支持
- [x] MySQL 支持
- [x] SQLite 支持
- [x] Claude API 集成
- [x] execute_bash 工具实现
- [x] execute_sql 工具实现
- [x] Agent Skills 集成（3 个核心 Skills）
- [x] 完整的设计指南文档
- [x] 高质量 Schema 示例

### 计划中

- [ ] Cube 层验证工具
- [ ] 查询结果缓存
- [ ] 多模型支持 (GPT-4, Ollama)
- [ ] 交互式 REPL 模式
- [ ] Web UI
- [ ] 单元测试和集成测试

查看完整 [Roadmap](./docs/roadmap.md)

## Configuration

### 环境变量配置

创建 `.env` 文件或使用 `export` 命令设置环境变量：

```bash
# 必需：Anthropic API Key
ANTHROPIC_API_KEY=sk-ant-your-api-key-here

# 可选：自定义 API 端点（用于代理或私有部署）
# ANTHROPIC_BASE_URL=https://api.anthropic.com
# 或使用代理
# ANTHROPIC_BASE_URL=https://your-proxy.com/v1

# 可选：自定义模型（默认：claude-3-5-sonnet-20241022）
# ANTHROPIC_MODEL=claude-3-5-sonnet-20241022
# 或使用其他模型
# ANTHROPIC_MODEL=claude-3-opus-20240229
# ANTHROPIC_MODEL=claude-3-haiku-20240307

# 数据库配置（用于实际查询）
DB_TYPE=postgresql
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mydb
DB_USER=postgres
DB_PASSWORD=password

# MySQL 示例
# DB_TYPE=mysql
# DB_HOST=localhost
# DB_PORT=3306
# DB_NAME=mydb
# DB_USER=root
# DB_PASSWORD=password

# SQLite 示例
# DB_TYPE=sqlite
# DB_PATH=/path/to/database.db
```

### 命令行选项

除了环境变量，还可以通过命令行选项覆盖配置：

```bash
# 使用自定义模型
sql-zen ask "上个月收入是多少？" --model claude-3-opus-20240229

# 使用自定义 API 端点
sql-zen ask "用户转化率" --base-url https://your-proxy.com/v1

# 组合使用
sql-zen ask "最近30天订单数" --model claude-3-haiku-20240307 --base-url https://api.example.com
```

### 配置优先级

配置的优先级从高到低：
1. **命令行选项** (`--model`, `--base-url`)
2. **环境变量** (`ANTHROPIC_MODEL`, `ANTHROPIC_BASE_URL`)
3. **默认值** (`claude-3-5-sonnet-20241022`, `https://api.anthropic.com`)

## Documentation

### 核心文档

- [配置指南](./docs/configuration.md) - 环境变量、命令行选项、配置优先级
- [设计文档](./docs/design.md) - 架构设计和技术决策（包含双层语义架构）
- [Roadmap](./docs/roadmap.md) - 版本规划和迭代计划
- [开发者指南](./AGENTS.md) - AI Agent 开发指南

### Schema 设计指南

- [Schema README](./schema/README.md) - Schema 目录概览
- [Schema 设计方法论](./schema/guides/schema-methodology.md) - 设计原则和最佳实践
- [表设计示例](./schema/guides/table-design.md) - 完整的表定义示例
- [列命名规范](./schema/guides/column-naming.md) - 命名规范和约定
- [关系设计模式](./schema/guides/relationship-design.md) - 表间关系建模
- [SQL 最佳实践](./schema/guides/sql-best-practices.md) - 查询优化和规范

### Agent Skills

- [sql-zen-explore](./agentskills/sql-zen-explore.md) - 系统化探索 Schema 和 Cube
- [sql-zen-query](./agentskills/sql-zen-query.md) - 基于 Cube 层生成高质量 SQL
- [sql-zen-analyze](./agentskills/sql-zen-analyze.md) - 数据分析洞察

## Philosophy

> "The best agents might be ones with the fewest tools."
> — Vercel Engineering

我们相信：

1. **双层语义层是最好的抽象** - Schema 层描述结构，Cube 层描述业务
2. **文件系统是最稳定的载体** - grep 已经 50 年了，依然好用
3. **信任模型的推理能力** - 不要过度约束
4. **业务语义 > 工具数量** - 好的 Cube 定义是成功的基础
5. **为未来的模型构建** - 模型进步比工具迭代更快

## Contributing

欢迎贡献！请查看 [Contributing Guide](./CONTRIBUTING.md)（即将推出）

## License

MIT

---

**Inspired by [Vercel's d0](https://vercel.com/blog/we-removed-80-percent-of-our-agents-tools)** - 感谢他们分享这个极简但强大的架构理念。
