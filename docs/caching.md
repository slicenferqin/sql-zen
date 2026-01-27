# SQL-Zen 缓存系统

SQL-Zen 内置了查询结果缓存系统，可以避免重复的 API 调用，提高响应速度并降低成本。

## 功能特性

- **基于 SQLite 的持久化缓存** - 缓存数据存储在本地 SQLite 数据库中
- **自动过期管理** - 支持 TTL（生存时间）配置
- **LRU 驱逐策略** - 当缓存达到最大容量时自动清理最久未使用的条目
- **查询归一化** - 相似的查询会被归一化后缓存，提高命中率
- **统计信息追踪** - 可查看缓存命中率、条目数等统计信息

## 配置

### 环境变量

在 `.env` 文件中配置以下变量：

```bash
# 启用/禁用缓存（默认: true）
ENABLE_CACHE=true

# 缓存 TTL，单位毫秒（默认: 300000，即 5 分钟）
CACHE_TTL=300000

# 最大缓存条目数（默认: 100）
CACHE_MAX_SIZE=100

# 缓存数据库路径（默认: ~/.sql-zen/cache.db）
CACHE_DB_PATH=~/.sql-zen/cache.db
```

### 默认配置

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| `ENABLE_CACHE` | `true` | 是否启用缓存 |
| `CACHE_TTL` | `300000` | 缓存有效期（5 分钟） |
| `CACHE_MAX_SIZE` | `100` | 最大缓存条目数 |
| `CACHE_DB_PATH` | `~/.sql-zen/cache.db` | 缓存数据库位置 |

## CLI 命令

### 查询时禁用缓存

```bash
# 使用 --no-cache 选项强制跳过缓存
sql-zen ask "有多少用户？" --no-cache
```

### 查看缓存统计

```bash
sql-zen cache stats
```

输出示例：
```
缓存统计信息:
  总条目数: 15
  命中次数: 42
  未命中次数: 18
  命中率: 70.00%
  最早条目: 2024/1/15 10:30:00
  最新条目: 2024/1/15 14:45:00
  总大小: 125.5 KB
```

### 清空缓存

```bash
sql-zen cache clear
```

## 工作原理

### 缓存键生成

1. 用户查询被归一化（转小写、移除多余空白）
2. 使用 SHA-256 生成哈希作为缓存键
3. 相同语义的查询会命中同一缓存条目

### 缓存流程

```
用户查询
    ↓
生成缓存键
    ↓
检查缓存 ─── 命中 ──→ 返回缓存结果
    │
    └── 未命中
          ↓
    调用 Claude API
          ↓
    存储到缓存
          ↓
    返回结果
```

### 缓存失效

缓存条目在以下情况下会失效：

1. **TTL 过期** - 超过配置的生存时间
2. **手动清除** - 使用 `sql-zen cache clear` 命令
3. **LRU 驱逐** - 缓存满时自动清理最久未访问的条目

## 最佳实践

### 何时使用缓存

- ✅ 重复的业务查询（如日报、周报）
- ✅ 开发和测试阶段
- ✅ 演示和培训场景

### 何时禁用缓存

- ❌ 需要实时数据的查询
- ❌ 数据库结构刚发生变化
- ❌ Schema 文件刚更新

### 性能优化建议

1. **合理设置 TTL** - 根据数据更新频率调整
2. **定期清理缓存** - 在 Schema 变更后清空缓存
3. **监控命中率** - 使用 `cache stats` 了解缓存效果

## 技术细节

### 数据库 Schema

```sql
CREATE TABLE query_cache (
  query_hash TEXT PRIMARY KEY,
  query TEXT NOT NULL,
  result TEXT NOT NULL,
  sql_executed TEXT,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  hit_count INTEGER DEFAULT 0,
  last_accessed_at INTEGER
);

CREATE INDEX idx_expires_at ON query_cache(expires_at);
CREATE INDEX idx_last_accessed ON query_cache(last_accessed_at);
```

### 并发支持

缓存使用 SQLite WAL（Write-Ahead Logging）模式，支持多进程并发读写。

## 故障排除

### 缓存不生效

1. 检查 `ENABLE_CACHE` 是否为 `true`
2. 确认没有使用 `--no-cache` 选项
3. 检查缓存数据库路径是否可写

### 缓存命中率低

1. 检查查询是否有细微差异（如空格、大小写）
2. 考虑增加 `CACHE_TTL` 值
3. 检查 `CACHE_MAX_SIZE` 是否足够

### 清理缓存数据库

如果缓存数据库损坏，可以手动删除：

```bash
rm ~/.sql-zen/cache.db
```

下次运行时会自动创建新的缓存数据库。
