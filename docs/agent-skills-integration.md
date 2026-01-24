# Agent Skills 集成方案 - SQL-Zen

**文档日期**: 2025-01-24  
**目的**: 基于 Agent Skills 开放标准，为 SQL-Zen 设计 Skills 集成方案

---

## 1. Agent Skills 正确理解

### 1.1 什么是 Agent Skills？

**Agent Skills** 是一个开放标准，由 Anthropic 发起，被多个 AI 工具支持（Claude Code, Cursor, VS Code, Goose 等）。

**核心概念**：
- Skills 是 **文件夹 + SKILL.md 文件**
- SKILL.md 包含 **YAML frontmatter + Markdown 指令**
- Agent 可以自动发现和使用 Skills
- 每个 Skill 自动生成 `/skill-name` slash 命令

### 1.2 Skills 文件结构

```
skill-name/
├── SKILL.md           # 主指令文件（必需）
├── template.md        # 可选：模板
├── examples/          # 可选：示例
│   └── sample.md
└── scripts/           # 可选：脚本
    └── helper.py
```

### 1.3 SKILL.md 格式

```markdown
---
name: skill-name
description: 这个 skill 做什么，何时使用
disable-model-invocation: false
user-invocable: true
allowed-tools: Read, Grep
context: fork
---

# Skill 指令内容

当用户请求 XXX 时：
1. 步骤一
2. 步骤二
3. 步骤三
```

### 1.4 Skills 的三种位置

| 位置 | 路径 | 适用范围 |
|------|------|---------|
| Personal | `~/.claude/skills/<skill-name>/` | 所有项目 |
| Project | `.claude/skills/<skill-name>/` | 当前项目 |
| Plugin | `<plugin>/skills/<skill-name>/` | 插件启用处 |

---

## 2. SQL-Zen 与 Skills 的关系

### 2.1 SQL-Zen 的定位

SQL-Zen 本身是一个 **Text-to-SQL Agent 框架**，包含：
- 2 个核心工具（execute_bash, execute_sql）
- Schema 文件系统（YAML 格式）
- System Prompt

### 2.2 Skills 在 SQL-Zen 中的角色

**Skills 不是 SQL-Zen 的内部组件，而是用户可以创建的扩展**：

```
SQL-Zen 核心
├── execute_bash
├── execute_sql
└── schema/ (YAML files)

用户创建的 Skills (可选)
├── .claude/skills/sql-zen-explore/
├── .claude/skills/sql-zen-query/
└── .claude/skills/sql-zen-analyze/
```

**关键理解**：
- SQL-Zen 提供工具和 Schema 系统
- Users 可以创建 Skills 来标准化使用 SQL-Zen 的方式
- Skills 是 **最佳实践的封装**，不是必需的

---

## 3. SQL-Zen Skills 设计方案

### 3.1 推荐的 Skills 集合

为 SQL-Zen 用户提供一组预定义的 Skills，帮助他们更高效地使用 SQL-Zen。

#### Skill 1: Schema 探索

**目的**: 系统化地探索数据库 Schema

**位置**: `.claude/skills/sql-zen-explore/SKILL.md`

```markdown
---
name: sql-zen-explore
description: 系统化探索 SQL-Zen 的 schema 文件，理解数据库结构。当需要了解表结构、关联关系时使用。
allowed-tools: Read, Grep, Glob
---

# SQL-Zen Schema 探索

系统化地探索 schema/ 目录，理解数据库结构。

## 探索步骤

### 1. 快速概览
```bash
ls schema/
cat schema/README.md
```

### 2. 查看所有表
```bash
ls schema/tables/
```

### 3. 基于关键词定位相关表
如果用户问题包含特定关键词（如"订单"、"用户"、"产品"）：
```bash
ls schema/tables/ | grep -i <关键词>
```

### 4. 读取表定义
```bash
cat schema/tables/<table_name>.yaml
```

重点关注：
- `columns`: 列名、类型、描述
- `foreign_key`: 外键关系
- `enum`: 枚举值（重要！）
- `common_filters`: 常用过滤条件
- `measures`: 常用度量

### 5. 查找表关联
```bash
grep -r "<table_name>" schema/joins/
```

### 6. 查看示例查询（可选）
```bash
grep -B 2 -A 10 "<关键词>" schema/examples/*.sql
```

## 输出格式

探索完成后，总结：
- **相关表**: [表名列表]
- **关键列**: [列名及用途]
- **关联关系**: [如何 JOIN]
- **注意事项**: [枚举值、单位、特殊逻辑]
```

#### Skill 2: SQL 生成

**目的**: 基于 Schema 智能生成 SQL 查询

**位置**: `.claude/skills/sql-zen-query/SKILL.md`

```markdown
---
name: sql-zen-query
description: 基于 SQL-Zen schema 生成 SQL 查询。当用户提出数据查询需求时使用。
allowed-tools: Read, Grep, Bash, ExecuteSql
---

# SQL-Zen 查询生成

基于用户问题和 schema 信息，生成准确的 SQL 查询。

## 生成流程

### 1. 理解用户意图
分析用户问题，识别：
- 需要查询的数据（SELECT 什么）
- 过滤条件（WHERE 什么）
- 聚合需求（GROUP BY / 聚合函数）
- 排序和限制（ORDER BY / LIMIT）

### 2. 探索相关 Schema
使用 `/sql-zen-explore` 或手动探索相关表。

### 3. 参考最佳实践
检查 schema/skills/ 目录中的查询模式：
```bash
cat schema/skills/common-queries.yaml
```

### 4. 生成 SQL
遵循以下原则：
- 使用正确的表名和列名（从 YAML 中获取）
- 注意枚举值（如 status 的有效值）
- 使用合适的 JOIN 类型
- 添加合理的 LIMIT（默认 100）
- 处理 NULL 值

### 5. 执行前验证
- 检查表名是否存在
- 检查列名是否正确
- 检查枚举值是否有效
- 确认 JOIN 条件正确

### 6. 执行查询
```sql
-- 生成的 SQL
```

### 7. 解释结果
说明：
- 查询返回了什么数据
- 结果的含义
- 如果需要，提供进一步分析建议
```

#### Skill 3: 数据分析

**目的**: 对查询结果进行深入分析

**位置**: `.claude/skills/sql-zen-analyze/SKILL.md`

```markdown
---
name: sql-zen-analyze
description: 分析 SQL 查询结果，提供洞察和建议。当需要理解数据趋势、异常或模式时使用。
context: fork
agent: general
---

# SQL-Zen 数据分析

对查询结果进行深入分析，提供业务洞察。

## 分析步骤

### 1. 数据概览
- 记录总数
- 数据范围（时间、数值等）
- 数据分布

### 2. 关键发现
- 最大值/最小值及其含义
- 异常值或离群点
- 明显的趋势或模式

### 3. 业务洞察
基于数据提供：
- 可能的原因分析
- 业务影响评估
- 行动建议

### 4. 进一步探索建议
如果需要更深入分析，建议：
- 需要查询的额外数据
- 可以做的对比分析
- 相关的指标
```

---

## 4. Schema Skills 文档

除了 Agent Skills，SQL-Zen 的 schema/ 目录也应该包含最佳实践文档。

### 4.1 目录结构

```
schema/
├── tables/
├── joins/
├── measures/
├── skills/                    # 新增：查询模式和最佳实践
│   ├── common-queries.yaml
│   ├── best-practices.yaml
│   └── troubleshooting.yaml
└── examples/
```

### 4.2 common-queries.yaml 示例

```yaml
# schema/skills/common-queries.yaml
# 常见查询模式和最佳实践

query_patterns:
  - name: "时间范围查询"
    description: "如何正确处理时间范围过滤"
    best_practices:
      - "使用 >= 和 < 而不是 DATE() 函数（性能更好）"
      - "时间范围用 BETWEEN 或 >= AND <"
      - "注意时区问题，统一使用 UTC"
    examples:
      - description: "最近 30 天"
        sql: "WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'"
      - description: "上个月"
        sql: |
          WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
            AND created_at < DATE_TRUNC('month', CURRENT_DATE)
    common_mistakes:
      - mistake: "WHERE DATE(created_at) = '2024-01-01'"
        reason: "无法使用索引，性能差"
        fix: "WHERE created_at >= '2024-01-01' AND created_at < '2024-01-02'"

  - name: "聚合查询"
    description: "如何正确使用 GROUP BY 和聚合函数"
    best_practices:
      - "SELECT 中的非聚合列必须在 GROUP BY 中"
      - "使用 HAVING 过滤聚合结果，不要用 WHERE"
      - "注意 NULL 值的处理（COUNT vs COUNT(*)）"
    examples:
      - description: "按产品统计销售额"
        sql: |
          SELECT 
            product_id,
            COUNT(*) as order_count,
            SUM(total_amount) as total_sales
          FROM orders
          WHERE status = 'completed'
          GROUP BY product_id
          ORDER BY total_sales DESC
          LIMIT 10

  - name: "JOIN 查询"
    description: "如何正确使用 JOIN"
    best_practices:
      - "优先使用 INNER JOIN，除非明确需要 LEFT/RIGHT JOIN"
      - "JOIN 条件放在 ON 子句，过滤条件放在 WHERE"
      - "注意 JOIN 顺序，小表在前"
    examples:
      - description: "订单关联用户和产品"
        sql: |
          SELECT 
            o.order_id,
            u.user_name,
            p.product_name,
            o.total_amount
          FROM orders o
          INNER JOIN users u ON o.user_id = u.user_id
          INNER JOIN products p ON o.product_id = p.product_id
          WHERE o.status = 'completed'
```

### 4.3 best-practices.yaml 示例

```yaml
# schema/skills/best-practices.yaml
# SQL 最佳实践

sql_best_practices:
  performance:
    - rule: "避免 SELECT *"
      reason: "只查询需要的列，减少数据传输"
      example: "SELECT user_id, user_name FROM users"
    
    - rule: "使用 LIMIT"
      reason: "限制返回行数，避免大结果集"
      example: "SELECT * FROM orders LIMIT 100"
    
    - rule: "索引友好的查询"
      reason: "避免在 WHERE 中使用函数，无法使用索引"
      bad: "WHERE YEAR(created_at) = 2024"
      good: "WHERE created_at >= '2024-01-01' AND created_at < '2025-01-01'"
  
  readability:
    - rule: "使用表别名"
      reason: "简化查询，提高可读性"
      example: "FROM orders o JOIN users u ON o.user_id = u.user_id"
    
    - rule: "格式化 SQL"
      reason: "保持一致的缩进和换行"
      example: |
        SELECT 
          column1,
          column2
        FROM table
        WHERE condition
  
  safety:
    - rule: "使用参数化查询"
      reason: "防止 SQL 注入"
      note: "SQL-Zen 会自动处理"
    
    - rule: "只读查询"
      reason: "默认只允许 SELECT 语句"
      note: "UPDATE/DELETE 需要特殊权限"
```

---

## 5. 实施方案

### 5.1 Phase 1: 核心 Skills (v0.2.0)

**目标**: 提供 3 个核心 Skills

**交付物**:
```
.claude/skills/
├── sql-zen-explore/
│   └── SKILL.md
├── sql-zen-query/
│   └── SKILL.md
└── sql-zen-analyze/
    └── SKILL.md
```

**同时在 schema/ 中添加**:
```
schema/skills/
├── common-queries.yaml
├── best-practices.yaml
└── troubleshooting.yaml
```

### 5.2 Phase 2: 高级 Skills (v0.3.0)

**扩展 Skills**:
- `sql-zen-optimize`: SQL 性能优化
- `sql-zen-debug`: 查询调试和错误修复
- `sql-zen-export`: 结果导出和格式化

### 5.3 Phase 3: 社区 Skills (v0.4.0+)

**建立 Skills 生态**:
- Skills 模板和生成器
- 社区贡献的 Skills
- Skills 市场/仓库

---

## 6. Skills vs SQL-Zen 核心的关系

### 6.1 清晰的边界

| 组件 | 类型 | 位置 | 作用 |
|------|------|------|------|
| **SQL-Zen 核心** | 框架 | npm 包 | 提供工具和 Schema 系统 |
| **Agent Skills** | 用户扩展 | `.claude/skills/` | 标准化使用方式 |
| **Schema Skills** | 文档 | `schema/skills/` | 查询模式和最佳实践 |

### 6.2 工作流程

```
用户提问
    ↓
Agent 选择使用 /sql-zen-query skill
    ↓
Skill 指导 Agent 使用 SQL-Zen 的工具
    ↓
Agent 使用 execute_bash 探索 schema/
    ↓
Agent 参考 schema/skills/common-queries.yaml
    ↓
Agent 使用 execute_sql 执行查询
    ↓
返回结果
```

### 6.3 Skills 的价值

**对用户**:
- 标准化的工作流程
- 最佳实践的封装
- 减少重复的指令

**对 SQL-Zen**:
- 不增加核心复杂度
- 保持 2 个工具的极简主义
- 通过 Skills 提供灵活性

---

## 7. 与竞品的对比

### 7.1 传统方案 vs SQL-Zen + Skills

| 方案 | 工具数量 | 扩展方式 | 可移植性 |
|------|---------|---------|---------|
| Vanna AI | 8-12 个内置工具 | 代码扩展 | 低 |
| DB-GPT | 15+ 个内置工具 | 插件系统 | 低 |
| Langchain | 10-15 个内置工具 | 自定义工具 | 中 |
| **SQL-Zen** | **2 个核心工具** | **Agent Skills** | **高** |

### 7.2 SQL-Zen 的优势

1. **极简核心** - 只有 2 个工具，易于理解和维护
2. **开放扩展** - 通过 Agent Skills 标准扩展
3. **跨工具兼容** - Skills 可在 Claude Code, Cursor 等工具中使用
4. **社区驱动** - 用户可以创建和分享 Skills

---

## 8. 实际使用示例

### 8.1 场景：查询上个月销售额最高的产品

**不使用 Skills**:
```
User: 上个月销售额最高的 10 个产品是什么？

Agent: 
[自己摸索] ls schema/tables/
[自己摸索] cat schema/tables/orders.yaml
[自己摸索] cat schema/tables/products.yaml
[可能出错] 生成 SQL...
```

**使用 Skills**:
```
User: 上个月销售额最高的 10 个产品是什么？

Agent: 我将使用 /sql-zen-query skill 来处理这个查询。

[按照 skill 指导]
1. 理解意图：查询产品销售额，按月过滤，TOP 10
2. 使用 /sql-zen-explore 探索相关表
3. 参考 schema/skills/common-queries.yaml 中的时间范围和聚合模式
4. 生成 SQL
5. 执行并解释结果
```

**效果对比**:
- 步骤更清晰
- 遵循最佳实践
- 成功率更高
- 结果更一致

### 8.2 场景：调试 SQL 错误

**使用 sql-zen-debug skill**:
```
User: /sql-zen-debug

Agent: 我将帮你调试 SQL 错误。

[按照 skill 指导]
1. 查看错误信息
2. 检查表名和列名是否正确
3. 参考 schema/skills/troubleshooting.yaml
4. 提供修复建议
```

---

## 9. 开发计划

### 9.1 v0.1.0 - MVP (当前)

**不包含 Skills**:
- 专注于核心功能
- 验证 2 个工具是否足够
- 收集用户反馈

### 9.2 v0.2.0 - Skills 集成

**Week 1-2: 创建核心 Skills**
- [ ] sql-zen-explore skill
- [ ] sql-zen-query skill
- [ ] sql-zen-analyze skill

**Week 3: 创建 Schema Skills 文档**
- [ ] schema/skills/common-queries.yaml
- [ ] schema/skills/best-practices.yaml
- [ ] schema/skills/troubleshooting.yaml

**Week 4: 文档和示例**
- [ ] Skills 使用指南
- [ ] 视频教程
- [ ] 最佳实践文档

### 9.3 v0.3.0+ - Skills 生态

- [ ] 更多高级 Skills
- [ ] Skills 生成器
- [ ] 社区 Skills 仓库
- [ ] Skills 市场

---

## 10. 总结

### 10.1 核心要点

1. **Agent Skills 是开放标准** - 不是 SQL-Zen 独有的
2. **Skills 是可选的** - SQL-Zen 核心不依赖 Skills
3. **Skills 是最佳实践** - 帮助用户更好地使用 SQL-Zen
4. **保持极简主义** - 核心仍然只有 2 个工具

### 10.2 推荐方案

**采用双层架构**:
```
Layer 1: SQL-Zen 核心
├── execute_bash (工具)
├── execute_sql (工具)
└── schema/ (YAML 文件系统)

Layer 2: Agent Skills (可选)
├── .claude/skills/sql-zen-*/ (Agent Skills)
└── schema/skills/*.yaml (查询模式文档)
```

### 10.3 关键优势

| 维度 | 优势 |
|------|------|
| **简洁性** | 核心只有 2 个工具 |
| **灵活性** | 通过 Skills 扩展 |
| **可移植性** | Skills 跨工具使用 |
| **社区性** | 用户可贡献 Skills |
| **标准化** | 遵循开放标准 |

### 10.4 与原设计的兼容性

✅ **完全兼容**:
- 核心理念不变：Less Tools, More Intelligence
- 工具数量不变：仍然只有 2 个
- 文件系统驱动不变：Schema 仍然是 YAML 文件
- 极简主义不变：Skills 是可选的增强

✅ **额外价值**:
- 提供标准化的使用方式
- 降低学习曲线
- 提高成功率和一致性
- 支持跨工具使用

---

**文档完成日期**: 2025-01-24  
**参考资料**:
- [Agent Skills 官方文档](https://agentskills.io)
- [Claude Code Skills 文档](https://code.claude.com/docs/en/skills)
- [腾讯云开发者文章](https://cloud.tencent.com/developer/article/2622409)

**下次更新**: v0.2.0 Skills 实现完成后
