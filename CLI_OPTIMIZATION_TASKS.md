# SQL-Zen CLI 优化任务清单

**版本**: v0.3.0 计划
**目标时间**: 2-4 周
**优先级**: P0 (必须) > P1 (重要) > P2 (增强)

---

## P0 - 必须做 (1-2周)

### 1. 单元测试 (Week 1)

**目标**: 代码覆盖率 > 80%

#### 1.1 测试框架搭建
- [ ] 安装 Jest + @types/jest
- [ ] 配置 jest.config.js
- [ ] 配置测试覆盖率报告
- [ ] 更新 package.json scripts
  - `npm test` - 运行所有测试
  - `npm test:watch` - 监听模式
  - `npm test:coverage` - 生成覆盖率报告

#### 1.2 Agent 核心测试 (`src/agent/core.test.ts`)
- [ ] 测试 Agent 初始化
- [ ] 测试 system prompt 生成
- [ ] 测试 processQuery 方法（Mock Anthropic API）
- [ ] 测试 processQueryWithTools 方法（Mock 所有工具）
- [ ] 测试错误处理
- [ ] 测试数据库连接
- [ ] 测试数据库断开

#### 1.3 工具测试 (`src/tools/execute-bash.test.ts`)
- [ ] 测试 execute_bash 工具
- [ ] 测试命令白名单验证
- [ ] 测试沙箱目录限制
- [ ] 测试超时处理
- [ ] 测试错误返回

#### 1.4 Schema Parser 测试 (`src/schema/parser.test.ts`)
- [ ] 测试 YAML 解析
- [ ] 测试表定义解析
- [ ] 测试 Cube 定义解析
- [ ] 测试关系定义解析
- [ ] 测试验证功能
- [ ] 测试错误处理

#### 1.5 Cube Parser 测试 (`src/schema/cube-parser.test.ts`)
- [ ] 测试 Cube 解析
- [ ] 测试维度验证
- [ ] 测试指标验证
- [ ] 测试过滤器验证
- [ ] 测试复杂 SQL 生成

#### 1.6 Database Connector 测试
- [ ] MySQL 测试 (`src/database/mysql.test.ts`)
  - 测试连接
  - 测试查询执行
  - 测试错误处理
  - 测试断开连接
- [ ] PostgreSQL 测试 (`src/database/postgres.test.ts`)
- [ ] SQLite 测试 (`src/database/sqlite.test.ts`)

**验收标准**:
- 所有测试通过
- 代码覆盖率 > 80%
- 核心逻辑覆盖率 > 90%

---

### 2. 基础错误处理改进 (Week 1-2)

**目标**: 统一错误类型，友好的错误提示

#### 2.1 创建错误类型 (`src/errors/index.ts`)
- [ ] `DatabaseConnectionError` - 数据库连接错误
- [ ] `DatabaseQueryError` - 数据库查询错误
- [ ] `SchemaParseError` - Schema 解析错误
- [ ] `APIError` - Anthropic API 调用错误
- [ ] `ValidationError` - 验证错误
- [ ] `ToolExecutionError` - 工具执行错误

#### 2.2 改进错误消息
- [ ] 统一错误消息格式
- [ ] 添加错误上下文信息
- [ ] 添加错误码
- [ ] 添加解决建议

**示例**:
```typescript
class DatabaseConnectionError extends Error {
  constructor(
    public host: string,
    public port: number,
    cause?: Error
  ) {
    super(
      `无法连接到数据库 ${host}:${port}\n` +
      `可能的原因:\n` +
      `1. 数据库服务未启动\n` +
      `2. 主机名或端口错误\n` +
      `3. 用户名或密码错误\n\n` +
      `请检查数据库配置并重试。`
    );
    this.name = 'DatabaseConnectionError';
    this.cause = cause;
  }
}
```

#### 2.3 添加重试机制 (`src/utils/retry.ts`)
- [ ] 实现指数退避重试
- [ ] API 调用失败自动重试（最多 3 次）
- [ ] 数据库连接失败自动重试（最多 2 次）
- [ ] 可配置的重试策略

**验收标准**:
- 所有错误都有清晰的类型
- 错误消息包含解决建议
- API 调用失败自动重试
- 数据库连接失败自动重试

---

### 3. API 文档 (Week 2)

**目标**: 完整的 API 文档

#### 3.1 完善 JSDoc 注释
- [ ] `SQLZenAgent` 类
  - [ ] 构造函数
  - [ ] 所有公共方法
- [ ] `SchemaParser` 类
  - [ ] 所有公共方法
- [ ] 所有导出的函数
- [ ] 所有导出的类型

**示例**:
```typescript
/**
 * 执行用户查询
 *
 * @param userQuestion - 用户用自然语言提出的问题
 * @returns Promise<string> - 查询结果的文本描述
 *
 * @throws {APIError} - Anthropic API 调用失败
 * @throws {DatabaseConnectionError} - 数据库未连接
 *
 * @example
 * ```typescript
 * const agent = new SQLZenAgent();
 * await agent.initialize({ database: 'test' });
 * const result = await agent.processQuery('有多少用户？');
 * console.log(result); // "总共有 100 个用户"
 * ```
 */
async processQuery(userQuestion: string): Promise<string> {
  // ...
}
```

#### 3.2 生成 API 文档
- [ ] 安装 TypeDoc: `npm install --save-dev typedoc`
- [ ] 配置 typedoc.json
- [ ] 生成文档: `npm run docs`
- [ ] 更新 README 添加文档链接

**验收标准**:
- 所有公共 API 都有 JSDoc 注释
- TypeDoc 可以成功生成文档
- 文档包含使用示例

---

## P1 - 重要 (2-3周)

### 4. 集成测试 (Week 2-3)

**目标**: 端到端测试流程

#### 4.1 测试环境搭建
- [ ] 使用 Docker Compose 启动测试数据库
  - MySQL 8
  - PostgreSQL 14
  - SQLite (文件）
- [ ] 测试数据初始化脚本
- [ ] 环境变量配置（测试环境）

**docker-compose.yml**:
```yaml
version: '3.8'
services:
  mysql:
    image: mysql:8
    environment:
      MYSQL_ROOT_PASSWORD: test
      MYSQL_DATABASE: test
    ports:
      - "3306:3306"

  postgres:
    image: postgres:14
    environment:
      POSTGRES_PASSWORD: test
      POSTGRES_DB: test
    ports:
      - "5432:5432"
```

#### 4.2 E2E 测试 (`tests/e2e/cli.test.ts`)
- [ ] 测试 `sql-zen init` 命令
- [ ] 测试 `sql-zen validate` 命令
- [ ] 测试 `sql-zen cube` 命令
- [ ] 测试 `sql-zen ask` 命令（Mock API）
- [ ] 测试完整工作流
  1. 初始化项目
  2. 添加 Schema 文件
  3. 验证 Schema
  4. 执行查询

#### 4.3 多数据库测试
- [ ] MySQL 端到端测试
- [ ] PostgreSQL 端到端测试
- [ ] SQLite 端到端测试

**验收标准**:
- 所有 E2E 测试通过
- 支持 3 种数据库的完整流程测试
- 测试可以在 CI/CD 中自动运行

---

### 5. 性能监控 (Week 3)

**目标**: 查询执行时间统计，API 调用耗时统计

#### 5.1 添加性能指标 (`src/monitoring/metrics.ts`)
- [ ] 计数器（Counter）
  - 查询总数
  - 成功/失败数量
- [ ] 直方图（Histogram）
  - 查询执行时间
  - API 调用时间
  - 工具执行时间
- [ ] 仪表（Gauge）
  - 当前活跃查询数

#### 5.2 集成监控
- [ ] 在 Agent 中添加性能埋点
  - API 调用前后记录时间
  - SQL 执行前后记录时间
  - Bash 工具执行前后记录时间
- [ ] 在 CLI 中显示性能信息
  - 显示查询执行时间
  - 显示 API 调用次数
  - 显示工具调用次数

#### 5.3 性能日志
- [ ] 输出格式化的性能日志
- [ ] 支持不同日志级别（info, debug, error）
- [ ] 可配置日志输出位置（文件/控制台）

**验收标准**:
- 每次查询都输出性能信息
- 性能日志格式清晰易读
- 可以追踪慢查询

---

### 6. 查询缓存 (Week 3-4)

**目标**: SQLite 作为本地缓存，基于查询 Hash 的缓存键

#### 6.1 缓存设计 (`src/cache/sqlite-cache.ts`)
- [ ] SQLite 缓存数据库设计
  ```sql
  CREATE TABLE query_cache (
    id INTEGER PRIMARY KEY,
    query_hash TEXT UNIQUE NOT NULL,
    query_text TEXT NOT NULL,
    result TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL
  );
  CREATE INDEX idx_query_hash ON query_cache(query_hash);
  CREATE INDEX idx_expires_at ON query_cache(expires_at);
  ```
- [ ] 缓存键生成（SHA256）
- [ ] TTL 管理（默认 5 分钟）
- [ ] 自动清理过期缓存

#### 6.2 集成缓存
- [ ] 在 Agent 中集成缓存
  - 查询前先检查缓存
  - 命中缓存直接返回
  - 未命中则执行查询并缓存结果
- [ ] 添加缓存统计
  - 缓存命中率
  - 缓存大小

#### 6.3 配置项
- [ ] `ENABLE_CACHE` - 是否启用缓存（默认 true）
- [ ] `CACHE_TTL` - 缓存过期时间（默认 300 秒）
- [ ] `CACHE_MAX_SIZE` - 最大缓存条目数（默认 1000）

**验收标准**:
- 相同查询直接返回缓存结果
- 缓存命中率统计准确
- 过期缓存自动清理

---

## P2 - 增强功能 (3-4周)

### 7. 错误追踪 (Week 4)

**目标**: 集成 Sentry，错误日志记录，用户反馈收集

#### 7.1 集成 Sentry
- [ ] 安装 `@sentry/node`
- [ ] 配置 Sentry DSN
- [ ] 捕获未处理异常
- [ ] 添加上下文信息（用户环境、查询内容）

#### 7.2 错误日志
- [ ] 结构化日志（JSON 格式）
- [ ] 日志级别分级
- [ ] 敏感信息脱敏（API Key、数据库密码）

#### 7.3 用户反馈
- [ ] 错误报告生成命令
  ```bash
  sql-zen report-error
  ```
- [ ] 自动生成错误报告（包含环境信息、日志）

**验收标准**:
- 所有错误都上报到 Sentry
- 日志包含足够的上下文信息
- 敏感信息已脱敏

---

### 8. 并发控制 (Week 4)

**目标**: 请求限流，连接池优化，队列管理

#### 8.1 请求限流
- [ ] 使用 `bottleneck` 实现限流
- [ ] API 调用限流（默认 10 req/min）
- [ ] 数据库查询限流（默认 100 req/min）
- [ ] 可配置限流策略

#### 8.2 连接池优化
- [ ] MySQL 连接池配置
- [ ] PostgreSQL 连接池配置
- [ ] 最大连接数限制
- [ ] 连接超时设置

#### 8.3 队列管理
- [ ] 使用 `bull` 实现任务队列
- [ ] 异步执行长时间查询
- [ ] 队列优先级

**验收标准**:
- 高并发请求不会崩溃
- 连接池配置合理
- 长时间查询异步执行

---

## 验收标准

### 代码质量
- [ ] 单元测试覆盖率 > 80%
- [ ] 核心逻辑覆盖率 > 90%
- [ ] 所有测试通过
- [ ] ESLint 无错误
- [ ] TypeScript 编译无警告

### 功能完整性
- [ ] 所有 P0 功能完成
- [ ] 所有 P1 功能完成
- [ ] 核心功能无回归 Bug

### 性能指标
- [ ] 简单查询响应时间 < 2s
- [ ] 缓存命中率 > 30%
- [ ] API 调用重试成功率 > 90%

### 文档完整性
- [ ] API 文档完整
- [ ] 所有公共 API 有 JSDoc 注释
- [ ] README 更新
- [ ] CHANGELOG 更新

---

## 发布计划

### v0.3.0-alpha (Week 2)
- 单元测试完成
- 错误处理改进
- API 文档完成

### v0.3.0-beta (Week 3)
- 集成测试完成
- 性能监控完成
- 查询缓存完成

### v0.3.0 (Week 4)
- 错误追踪完成
- 并发控制完成
- 所有功能测试通过
- 发布到 npm

---

## 参考资料

- [Jest 文档](https://jestjs.io/docs/getting-started)
- [TypeDoc 文档](https://typedoc.org/guides/overview)
- [Sentry 文档](https://docs.sentry.io/platforms/node/)
- [Bottleneck 文档](https://github.com/SGrondin/bottleneck)
- [Bull 文档](https://docs.bullmq.io/)

---

**创建日期**: 2026-01-26
**负责人**: slicenfer
**状态**: 待开始
