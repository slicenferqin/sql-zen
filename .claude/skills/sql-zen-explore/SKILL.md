---
name: sql-zen-explore
description: 系统化探索 SQL-Zen 的 schema 文件，理解数据库结构。当需要了解表结构、关联关系、或开始新查询前使用。
allowed-tools: Read, Grep, Glob, Bash
---

# SQL-Zen Schema 探索

系统化地探索 schema/ 目录，理解数据库结构。

## 何时使用

- 用户询问数据库中有什么表
- 需要理解表之间的关系
- 开始编写 SQL 查询前
- 不确定某个字段在哪个表中

## 探索步骤

### 1. 快速概览

首先了解整体结构：

```bash
ls schema/
cat schema/README.md
```

这会告诉你：
- 有哪些目录（tables, joins, measures, examples）
- 数据库的整体说明

### 2. 查看所有表

列出所有可用的表：

```bash
ls schema/tables/
```

### 3. 基于关键词定位相关表

如果用户问题包含特定关键词（如"订单"、"用户"、"产品"、"销售"），使用 grep 快速定位：

```bash
ls schema/tables/ | grep -i <关键词>
```

例如：
- `ls schema/tables/ | grep -i order` - 查找订单相关表
- `ls schema/tables/ | grep -i user` - 查找用户相关表

### 4. 读取表定义

对于每个相关的表，读取其 YAML 定义：

```bash
cat schema/tables/<table_name>.yaml
```

**重点关注**：
- `columns`: 列名、类型、描述
- `foreign_key`: 外键关系（告诉你如何 JOIN）
- `enum`: 枚举值（**非常重要**！必须使用这些值）
- `common_filters`: 常用过滤条件
- `measures`: 常用度量

### 5. 查找表关联

如果需要多表查询，查找表之间的关联关系：

```bash
grep -r "<table_name>" schema/joins/
```

或者查看所有关联：

```bash
 cat schema/joins/relationships.yaml
```

### 6. 查看示例查询（可选但推荐）

查看类似问题的示例 SQL：

```bash
grep -B 2 -A 10 "<关键词>" schema/examples/*.sql
```

示例可以提供：
- SQL 写法参考
- 最佳实践模式
- 常见错误

### 7. 查看度量定义

如果用户询问关于统计、汇总的问题，检查是否有预定义的度量：

```bash
cat schema/measures/metrics.yaml
```

## 输出格式

探索完成后，向用户总结：

```markdown
## Schema 信息

### 相关表
- 表名: [简要描述]
- 表名: [简要描述]

### 关键列
- `column_name`: [描述]
- `column_name`: [描述]

### 关联关系
[描述表之间的关联方式]

### 注意事项
- [重要提示，如枚举值、单位、特殊逻辑]
```

## 常见错误避免

❌ **不要**：
- 跳过 schema/README.md 直接读表
- 忽略 enum 值，导致过滤条件错误
- 不检查 foreign_key，JOIN 条件错误
- 遗漏 common_filters 中已有的过滤条件

✅ **要**：
- 总是从概览开始
- 仔细阅读 enum 的 value 和 description
- 记录所有找到的关联关系
- 参考示例查询

