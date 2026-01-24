# SQL-Zen

> Less Tools, More Intelligence

**SQL-Zen** 是一个极简主义的 Text-to-SQL Agent，让你用自然语言查询数据库。

受 [Vercel d0 项目](./docs/references/vercel-blog-we-removed-80-percent-of-our-agents-tools.md) 启发，我们采用"文件系统驱动"的架构：**只用 2 个工具，替代传统方案的 15+ 个工具**，反而获得更好的效果。

## Why SQL-Zen?

传统 Text-to-SQL 方案的问题：

| 问题 | 传统方案 | SQL-Zen |
|------|----------|---------|
| 工具数量 | 15+ 个专用工具 | **2 个** |
| 架构复杂度 | 复杂的 RAG + 多轮验证 | **文件系统 + LLM** |
| 维护成本 | 每个边界情况都要打补丁 | **让模型自己处理** |
| 模型依赖 | 每次更新都要重新调整 | **信任模型推理能力** |

**核心理念**：不要替模型思考，给它好的上下文，让它自己探索。

## Quick Start

```bash
# 安装
npm install -g sql-zen

# 初始化项目（生成 schema 目录）
sql-zen init

# 配置数据库连接
export DATABASE_URL="postgresql://user:pass@localhost:5432/mydb"

# 开始提问
sql-zen ask "上个月销售额最高的 10 个产品是什么？"
```

## How It Works

```
┌──────────────────────────────────────────────────────────┐
│  "上个月销售额最高的 10 个产品是什么？"                    │
└────────────────────────┬─────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────┐
│                    LLM Agent                             │
│  ┌────────────────┐    ┌────────────────┐                │
│  │  execute_bash  │    │  execute_sql   │                │
│  │  grep/cat/ls   │    │  运行 SQL      │                │
│  └───────┬────────┘    └───────┬────────┘                │
└──────────┼─────────────────────┼─────────────────────────┘
           │                     │
           ▼                     ▼
┌──────────────────┐    ┌──────────────────┐
│  Schema 文件系统  │    │     数据库       │
│  (YAML/Markdown) │    │  (PostgreSQL)   │
└──────────────────┘    └──────────────────┘
```

**Agent 的工作流程**：

1. 收到用户问题
2. 用 `ls` 查看 schema 目录结构
3. 用 `cat` 读取相关表定义
4. 用 `grep` 搜索关联关系
5. 生成 SQL 并用 `execute_sql` 执行
6. 返回结果和解释

## Schema 文件结构

SQL-Zen 的核心是高质量的 Schema 文档：

```
schema/
├── tables/              # 表定义
│   ├── orders.yaml
│   ├── users.yaml
│   └── products.yaml
├── joins/               # 关联关系
│   └── relationships.yaml
├── measures/            # 常用度量
│   └── metrics.yaml
├── examples/            # 示例 SQL
│   └── common_queries.sql
└── README.md            # Schema 概览
```

**表定义示例** (`schema/tables/orders.yaml`)：

```yaml
table:
  name: orders
  description: "订单主表，记录所有用户订单信息"
  
columns:
  - name: order_id
    type: string
    description: "订单唯一标识"
    primary_key: true
    
  - name: user_id
    type: string
    description: "用户ID，关联 users 表"
    foreign_key: users.user_id
    
  - name: total_amount
    type: decimal
    description: "订单总金额（单位：元）"
    
  - name: status
    type: string
    description: "订单状态"
    enum: [pending, paid, shipped, completed, cancelled]
```

## Features

### 已实现
- [ ] CLI 工具 (`sql-zen ask`)
- [ ] PostgreSQL 支持
- [ ] YAML Schema 解析
- [ ] Claude API 集成

### 计划中
- [ ] 多模型支持 (GPT-4, Ollama)
- [ ] Schema 自动生成 (`sql-zen schema import`)
- [ ] 交互式 REPL 模式
- [ ] Web UI
- [ ] Slack Bot 集成

查看完整 [Roadmap](./docs/roadmap.md)

## Configuration

```bash
# 必需：LLM API Key
export ANTHROPIC_API_KEY="sk-ant-..."
# 或
export OPENAI_API_KEY="sk-..."

# 必需：数据库连接
export DATABASE_URL="postgresql://user:pass@localhost:5432/mydb"

# 可选：模型选择（默认 claude-sonnet-4-20250514）
export SQL_ZEN_MODEL="claude-sonnet-4-20250514"
```

## Documentation

- [设计文档](./docs/design.md) - 架构设计和技术决策
- [Roadmap](./docs/roadmap.md) - 版本规划和迭代计划
- [Vercel 博客参考](./docs/references/vercel-blog-we-removed-80-percent-of-our-agents-tools.md) - 灵感来源

## Philosophy

> "The best agents might be the ones with the fewest tools."
> — Vercel Engineering

我们相信：

1. **文件系统是最好的抽象** - grep 已经 50 年了，依然好用
2. **信任模型的推理能力** - 不要过度约束
3. **文档质量 > 工具数量** - 好的 Schema 文档是成功的基础
4. **为未来的模型构建** - 模型进步比工具迭代更快

## Contributing

欢迎贡献！请查看 [Contributing Guide](./CONTRIBUTING.md)（即将推出）

## License

MIT

---

**Inspired by [Vercel's d0](https://vercel.com/blog/we-removed-80-percent-of-our-agents-tools)** - 感谢他们分享这个极简但强大的架构理念。
