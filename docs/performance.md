# SQL-Zen 性能优化指南

本文档介绍 SQL-Zen 的性能优化功能和配置选项。

## 概述

SQL-Zen 提供了多种性能优化机制：

| 功能 | 描述 | 默认状态 |
|------|------|----------|
| 数据库连接池 | 复用数据库连接 | 启用 (10 连接) |
| 查询限制 | 限制返回行数 | 启用 (最大 10000 行) |
| 查询超时 | 防止慢查询 | 启用 (30 秒) |
| API 重试 | 自动重试失败的 API 调用 | 启用 (3 次) |
| Schema 缓存 | 缓存 Schema 和 Cube 定义 | 启用 (60 秒 TTL) |
| 消息历史窗口 | 限制对话历史大小 | 启用 (20 条消息) |

## 配置选项

### 环境变量

可以通过环境变量配置性能参数：

```bash
# 查询配置
QUERY_MAX_ROWS=10000        # 最大返回行数
QUERY_DEFAULT_LIMIT=100     # 默认 LIMIT
QUERY_TIMEOUT=30000         # 查询超时（毫秒）

# 连接池配置
DB_POOL_MIN=2               # 最小连接数
DB_POOL_MAX=10              # 最大连接数

# API 配置
API_MAX_RETRIES=3           # 最大重试次数
API_TIMEOUT=60000           # API 超时（毫秒）

# 消息历史配置
MAX_MESSAGES=20             # 最大消息数

# Schema 缓存配置
SCHEMA_CACHE_ENABLED=true   # 是否启用缓存
SCHEMA_CACHE_TTL=60000      # 缓存 TTL（毫秒）
```

### 代码配置

也可以在代码中直接配置：

```typescript
import { SQLZenAgent } from 'sql-zen';

const agent = new SQLZenAgent({
  performance: {
    query: {
      maxRows: 5000,
      defaultLimit: 50,
      timeout: 15000
    },
    connectionPool: {
      minConnections: 2,
      maxConnections: 20,
      acquireTimeout: 10000,
      idleTimeout: 60000
    },
    api: {
      maxRetries: 5,
      baseDelay: 1000,
      maxDelay: 10000,
      timeout: 120000
    },
    messageHistory: {
      maxMessages: 30,
      preserveSystemMessage: true
    },
    schemaCache: {
      enabled: true,
      ttl: 120000,
      maxSize: 200
    }
  }
});
```

## 详细说明

### 数据库连接池

连接池允许复用数据库连接，减少连接建立开销。

**配置项：**
- `maxConnections`: 最大连接数（默认 10）
- `minConnections`: 最小连接数（默认 2）
- `acquireTimeout`: 获取连接超时（默认 10 秒）
- `idleTimeout`: 空闲连接超时（默认 60 秒）

**使用单连接模式：**

如果设置 `maxConnections = 1`，系统将使用单连接而非连接池。

### 查询限制和超时

防止返回过多数据或执行时间过长的查询。

**配置项：**
- `maxRows`: 最大返回行数（默认 10000）
- `defaultLimit`: 默认 LIMIT（默认 100）
- `timeout`: 查询超时（默认 30 秒）

**行为：**
- 所有查询都会自动添加 LIMIT
- 即使用户指定了更大的 LIMIT，也会被限制在 `maxRows` 以内
- 超时的查询会自动取消

### API 重试机制

自动重试失败的 Anthropic API 调用，使用指数退避策略。

**配置项：**
- `maxRetries`: 最大重试次数（默认 3）
- `baseDelay`: 基础延迟（默认 1 秒）
- `maxDelay`: 最大延迟（默认 10 秒）
- `timeout`: API 超时（默认 60 秒）

**重试策略：**
- 使用指数退避：delay = baseDelay * 2^attempt
- 添加 30% 随机抖动避免雷鸣群问题
- 仅重试网络错误和 5xx 错误

### Schema 缓存

缓存 Schema 和 Cube 定义，减少文件 I/O。

**配置项：**
- `enabled`: 是否启用（默认 true）
- `ttl`: 缓存 TTL（默认 60 秒）
- `maxSize`: 最大缓存条目数（默认 100）

**功能：**
- 缓存 Schema 配置
- 缓存 Cube 定义
- 构建 metrics/dimensions/filters 的哈希索引
- O(1) 查找 metrics、dimensions、filters

**手动清理缓存：**

```typescript
import { resetSchemaCache } from 'sql-zen';

// 清理全局 Schema 缓存
resetSchemaCache();
```

### 消息历史窗口

限制对话历史大小，防止内存无限增长。

**配置项：**
- `maxMessages`: 最大消息数（默认 20）
- `preserveSystemMessage`: 保留系统消息（默认 true）

**行为：**
- 当消息数超过限制时，自动删除最旧的消息
- 系统消息（如果有）会被保留

## 性能监控

### 查看性能统计

```bash
sql-zen stats
```

输出示例：
```
性能统计:
  查询执行: 5 次, 平均 234ms
  API 请求: 3 次, 平均 1.2s
  缓存命中: 2 次 (40%)
```

### 编程方式获取统计

```typescript
import { getPerformanceMonitor } from 'sql-zen';

const monitor = getPerformanceMonitor();
const metrics = monitor.getMetrics();

console.log('查询次数:', metrics.totalQueries);
console.log('缓存命中率:', metrics.cacheHitRate);
console.log('平均查询时间:', metrics.queryExecutionTime);
```

## 最佳实践

### 1. 调整连接池大小

根据并发需求调整连接池大小：

```bash
# 低并发场景
DB_POOL_MAX=5

# 高并发场景
DB_POOL_MAX=50
```

### 2. 优化查询限制

根据数据量调整查询限制：

```bash
# 小型数据库
QUERY_MAX_ROWS=50000

# 大型数据库
QUERY_MAX_ROWS=1000
```

### 3. 调整缓存 TTL

根据 Schema 更新频率调整缓存 TTL：

```bash
# Schema 很少更新
SCHEMA_CACHE_TTL=300000  # 5 分钟

# Schema 经常更新
SCHEMA_CACHE_TTL=10000   # 10 秒
```

### 4. 启用详细日志进行诊断

```bash
sql-zen ask "query" --debug
```

## 故障排除

### 查询超时

如果查询经常超时，考虑：
1. 增加 `QUERY_TIMEOUT`
2. 优化 SQL 查询
3. 添加数据库索引

### 连接池耗尽

如果出现连接池耗尽错误：
1. 增加 `DB_POOL_MAX`
2. 减少并发请求
3. 检查连接泄漏

### 内存增长

如果内存持续增长：
1. 减少 `MAX_MESSAGES`
2. 检查 `SCHEMA_CACHE_TTL`
3. 定期重启服务
