# SQL-Zen 日志系统

SQL-Zen 提供生产级的日志和监控系统，基于高性能的 [pino](https://github.com/pinojs/pino) 日志库。

## 功能特性

- **结构化日志** - JSON 格式输出，便于日志分析
- **多级别日志** - DEBUG, INFO, WARN, ERROR, SILENT
- **性能监控** - 查询时间、API 延迟、缓存命中率
- **请求追踪** - 自动关联请求 ID
- **开发友好** - 开发环境下可读的彩色输出

## CLI 选项

```bash
# 启用 DEBUG 级别日志
sql-zen ask "有多少用户？" --debug

# 设置日志级别
sql-zen ask "有多少用户？" --log-level warn

# 输出到文件
sql-zen ask "有多少用户？" --log-file app.log

# 强制 JSON 格式
sql-zen ask "有多少用户？" --json-logs

# 查看性能统计
sql-zen stats
```

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `LOG_LEVEL` | 日志级别 (debug, info, warn, error, silent) | `info` |
| `LOG_PRETTY` | 可读格式输出 | 开发环境 `true`，生产环境 `false` |
| `LOG_FILE` | 日志文件路径 | - |
| `LOG_MAX_SIZE` | 日志文件最大大小 | - |
| `LOG_MAX_FILES` | 保留的日志文件数量 | - |
| `LOG_JSON` | 强制 JSON 格式 | `false` |

## 日志输出格式

### 开发环境（Pretty 格式）

```
[2024-01-27 10:30:45] INFO  Agent initialized
[2024-01-27 10:30:46] DEBUG Checking cache for query hash: abc123
[2024-01-27 10:30:46] INFO  Cache hit { requestId: "req-001", duration: 5 }
[2024-01-27 10:30:47] DEBUG Executing tool { tool: "execute_sql" }
[2024-01-27 10:30:48] INFO  Query completed { duration: 1234, rows: 100 }
```

### 生产环境（JSON 格式）

```json
{"level":"info","time":"2024-01-27T10:30:45.000Z","msg":"Agent initialized","module":"agent"}
{"level":"info","time":"2024-01-27T10:30:46.000Z","msg":"Cache hit","requestId":"req-001","duration":5}
{"level":"info","time":"2024-01-27T10:30:48.000Z","msg":"Query completed","duration":1234,"rows":100}
```

## 编程接口

### 基本使用

```typescript
import { getLogger } from 'sql-zen/logging';

const logger = getLogger();

// 基本日志
logger.info('Operation completed');
logger.debug('Debug information');
logger.warn('Warning message');
logger.error('Error occurred');

// 带上下文的日志
logger.info('Query executed', {
  duration: 1234,
  rows: 100,
  requestId: 'req-001'
});
```

### 子 Logger

```typescript
import { getLogger } from 'sql-zen/logging';

// 创建带模块标识的子 logger
const logger = getLogger().child({ module: 'my-module' });

logger.info('Module initialized');
// 输出: {"level":"info","msg":"Module initialized","module":"my-module"}
```

### 计时器

```typescript
import { getLogger } from 'sql-zen/logging';

const logger = getLogger();

// 使用计时器
const timer = logger.startTimer();
// ... 执行操作
const duration = timer();
logger.info('Operation completed', { duration });
```

### 配置 Logger

```typescript
import { configureLogger, setLogLevel } from 'sql-zen/logging';

// 设置日志级别
setLogLevel('debug');

// 完整配置
configureLogger({
  level: 'debug',
  pretty: false,
  jsonLogs: true,
  file: '/var/log/sql-zen.log'
});
```

## 性能监控

### 获取性能指标

```typescript
import { getPerformanceMonitor } from 'sql-zen/logging';

const monitor = getPerformanceMonitor();

// 记录指标
monitor.recordQueryTime(100);
monitor.recordApiTime(500);
monitor.recordCacheHit();
monitor.recordCacheMiss();

// 获取摘要
const summary = monitor.getSummary();
console.log(summary);
// {
//   avgQueryTime: 100,
//   maxQueryTime: 100,
//   minQueryTime: 100,
//   avgApiTime: 500,
//   cacheHitRate: 50,
//   totalQueries: 1,
//   ...
// }

// 格式化输出
console.log(monitor.formatSummary());
```

### 性能指标说明

| 指标 | 说明 |
|------|------|
| `avgQueryTime` | 平均查询执行时间（毫秒） |
| `maxQueryTime` | 最大查询执行时间 |
| `minQueryTime` | 最小查询执行时间 |
| `avgApiTime` | 平均 API 请求时间 |
| `cacheHitRate` | 缓存命中率（百分比） |
| `totalQueries` | 总查询数 |
| `totalCacheHits` | 缓存命中次数 |
| `totalCacheMisses` | 缓存未命中次数 |
| `uptime` | 运行时间（毫秒） |

## 请求追踪

### 使用请求上下文

```typescript
import {
  createRequestContext,
  runWithContext,
  getCurrentRequestId
} from 'sql-zen/logging';

// 创建请求上下文
const context = createRequestContext({
  operation: 'query',
  userId: 'user-123'
});

// 在上下文中运行
runWithContext(context, () => {
  // 日志会自动包含 requestId
  logger.info('Processing request');

  // 获取当前请求 ID
  const requestId = getCurrentRequestId();
  console.log(requestId); // req-xxx-xxx
});
```

### 异步上下文

```typescript
import { runWithContextAsync } from 'sql-zen/logging';

await runWithContextAsync(context, async () => {
  await someAsyncOperation();
  // 上下文在异步操作中保持
  logger.info('Async operation completed');
});
```

## 日志级别说明

| 级别 | 数值 | 说明 |
|------|------|------|
| `debug` | 20 | 调试信息，详细的执行过程 |
| `info` | 30 | 一般信息，重要的操作记录 |
| `warn` | 40 | 警告信息，潜在问题 |
| `error` | 50 | 错误信息，操作失败 |
| `silent` | 100 | 静默模式，不输出任何日志 |

## 最佳实践

### 1. 使用适当的日志级别

```typescript
// DEBUG: 详细的调试信息
logger.debug('Cache key generated', { key: 'abc123' });

// INFO: 重要的业务操作
logger.info('Query executed', { duration: 100, rows: 50 });

// WARN: 潜在问题，但不影响功能
logger.warn('Cache miss, falling back to database');

// ERROR: 操作失败
logger.error('Database connection failed', { error: err.message });
```

### 2. 包含有用的上下文

```typescript
// 好的做法
logger.info('Query completed', {
  duration: 1234,
  rows: 100,
  sql: query.substring(0, 200)
});

// 避免
logger.info('Query completed');
```

### 3. 不要记录敏感信息

```typescript
// 避免记录密码、API 密钥等
logger.debug('Connecting to database', {
  host: config.host,
  database: config.database
  // 不要记录 password
});
```

### 4. 使用子 Logger 标识模块

```typescript
// 在模块初始化时创建子 logger
const logger = getLogger().child({ module: 'database' });

// 所有日志都会包含 module 字段
logger.info('Connected'); // {"module":"database","msg":"Connected"}
```

## 与现有错误处理集成

SQL-Zen 的日志系统与错误处理系统无缝集成：

```typescript
import { SQLZenError, formatErrorForLog } from 'sql-zen/errors';
import { getLogger } from 'sql-zen/logging';

const logger = getLogger();

try {
  await executeQuery(sql);
} catch (error) {
  if (error instanceof SQLZenError) {
    logger.error('Query failed', {
      code: error.code,
      context: error.context,
      suggestions: error.suggestions
    });
  } else {
    logger.error('Unexpected error', {
      error: error instanceof Error ? error.message : String(error)
    });
  }
}
```
