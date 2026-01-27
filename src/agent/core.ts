import Anthropic from '@anthropic-ai/sdk';
import { BashTool } from '../tools/execute-bash.js';
import mysql from 'mysql2/promise';
import {
  APIKeyMissingError,
  APIRequestError,
  DatabaseNotConnectedError,
  DatabaseQueryError
} from '../errors/index.js';
import { SQLiteCacheManager, generateCacheKey, calculateExpiresAt } from '../cache/index.js';
import { loadCacheConfig } from '../config/cache-config.js';
import type { CacheConfig } from '../cache/cache-manager.js';
import { getLogger, getPerformanceMonitor, type Logger } from '../logging/index.js';

export interface AgentOptions {
  apiKey?: string;
  baseURL?: string;
  model?: string;
  maxRetries?: number;
  cache?: Partial<CacheConfig> & { enabled?: boolean };
  database?: {
    host?: string;
    port?: number;
    database: string;
    user?: string;
    password?: string;
    ssl?: boolean;
  };
}

export interface AgentDependencies {
  anthropicClient?: Anthropic;
  bashTool?: BashTool;
  dbConnection?: mysql.Connection;
  mysqlModule?: typeof mysql;
  cacheManager?: SQLiteCacheManager;
}

export class SQLZenAgent {
  private anthropic: Anthropic;
  private bashTool: BashTool;
  private dbConnection: mysql.Connection | null = null;
  private model: string;
  private mysqlModule: typeof mysql;
  private cacheManager: SQLiteCacheManager | null = null;
  private cacheConfig: CacheConfig;
  private cacheEnabled: boolean;
  private logger: Logger;
  private perfMonitor = getPerformanceMonitor();

  constructor(options: AgentOptions = {}, dependencies?: AgentDependencies) {
    // 初始化 logger
    this.logger = getLogger().child({ module: 'agent' });

    // 如果提供了依赖注入，使用注入的对象
    if (dependencies?.anthropicClient) {
      this.anthropic = dependencies.anthropicClient;
    } else {
      const apiKey = options.apiKey || process.env.ANTHROPIC_API_KEY || '';
      if (!apiKey) {
        throw new APIKeyMissingError();
      }

      const baseURL = options.baseURL || process.env.ANTHROPIC_BASE_URL;

      this.anthropic = new Anthropic({
        apiKey: apiKey,
        ...(baseURL ? { baseURL } : {})
      });
    }

    this.model = options.model || process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022';
    this.bashTool = dependencies?.bashTool || new BashTool();
    this.dbConnection = dependencies?.dbConnection || null;
    this.mysqlModule = dependencies?.mysqlModule || mysql;

    // 缓存配置
    this.cacheConfig = loadCacheConfig();
    if (options.cache) {
      this.cacheConfig = { ...this.cacheConfig, ...options.cache };
    }
    this.cacheEnabled = options.cache?.enabled ?? this.cacheConfig.enabled;

    // 使用注入的缓存管理器或创建新的
    if (dependencies?.cacheManager) {
      this.cacheManager = dependencies.cacheManager;
    } else if (this.cacheEnabled) {
      this.cacheManager = new SQLiteCacheManager(this.cacheConfig);
    }
  }

  async initialize(dbConfig: { database: string; host?: string; port?: number; user?: string; password?: string; ssl?: boolean }): Promise<void> {
    // 初始化缓存
    if (this.cacheManager && !this.cacheManager.isInitialized()) {
      await this.cacheManager.initialize();
    }

    // 如果已经有连接（通过依赖注入），则跳过
    if (!this.dbConnection) {
      this.logger.debug('Connecting to database', {
        host: dbConfig.host || 'localhost',
        database: dbConfig.database
      });
      this.dbConnection = await this.mysqlModule.createConnection({
        host: dbConfig.host || 'localhost',
        port: dbConfig.port || 3306,
        database: dbConfig.database,
        user: dbConfig.user || 'root',
        password: dbConfig.password || '',
      });
    }
    this.logger.info('Agent initialized');
  }

  async cleanup(): Promise<void> {
    if (this.dbConnection) {
      await this.dbConnection.end();
    }
    if (this.cacheManager) {
      await this.cacheManager.close();
    }
  }

  /**
   * 获取缓存统计信息
   */
  async getCacheStats() {
    if (!this.cacheManager) {
      return null;
    }
    return this.cacheManager.getStats();
  }

  /**
   * 清空缓存
   */
  async clearCache(): Promise<void> {
    if (this.cacheManager) {
      await this.cacheManager.clear();
    }
  }

  /**
   * 设置缓存启用状态
   */
  setCacheEnabled(enabled: boolean): void {
    this.cacheEnabled = enabled;
  }

  private getSystemPrompt(): string {
    return `You are SQL-Zen, a minimalist Text-to-SQL Agent with dual-layer semantic architecture.

## Your Mission
Help users query databases with natural language using only 2 tools: execute_bash and execute_sql.

## Core Philosophy
- Less Tools, More Intelligence
- File system driven: Use grep, cat, ls to explore schema
- Dual-layer semantics: Use Cube layer for business concepts, Schema layer for structure
- Trust model: Don't over-constrain with prompts
- Documentation quality > Tool quantity
- Reuse business logic: Define once in Cube, use everywhere

## How to Work

### Workflow with Dual-Layer Architecture

1. Understand user's question (business language preferred)
2. Use execute_bash to explore schema/ directory:
   - FIRST: Explore schema/cubes/ to find relevant metrics
   - THEN: Explore schema/tables/ to understand structure
   - Use ls to see available cubes and tables
   - Use cat to read cube definitions (metrics, dimensions, filters)
   - Use grep to find specific metrics or dimensions
3. Generate SQL:
   - PRIORITY: Use metrics from Cube layer (pre-defined business logic)
   - Use table/column names from Schema layer
   - Apply filters from Cube layer
   - Handle dimensions based on cube definitions
4. Use execute_sql to run generated query
5. Return results with explanation

### Query Patterns with Dual-Layer Architecture

Pattern 1: Business Metrics
User asks: "What's the revenue?"

Exploration Steps:
1. Find "revenue" metric in Cube layer
2. Understand metric's SQL expression (defined in YAML)
3. Check table structure from Schema layer (if needed)
4. Generate SQL using metric's SQL expression

SQL Generated:
SELECT SUM(CASE WHEN status = 'paid' THEN total_amount END) AS revenue
FROM orders

Pattern 2: Dimensional Analysis
User asks: "Revenue by month?"

Exploration Steps:
1. Find "revenue" metric + "time" dimension in Cube
2. Understand dimension's granularity (month level)
3. Generate GROUP BY query using time dimension

SQL Generated:
SELECT DATE_FORMAT(created_at, '%Y-%m') AS month,
  SUM(CASE WHEN status = 'paid' THEN total_amount END) AS revenue
FROM orders
GROUP BY DATE_FORMAT(created_at, '%Y-%m')

Pattern 3: Multi-dimensional
User asks: "Revenue by user tier?"

Exploration Steps:
1. Find "revenue" metric + "user_tier" dimension
2. Use enum values from dimension
3. Generate GROUP BY query

SQL Generated:
SELECT users.subscription_tier AS user_tier,
  SUM(orders.total_amount) AS revenue
FROM users
INNER JOIN orders ON users.id = orders.user_id
WHERE orders.status = 'paid'
GROUP BY users.subscription_tier

Pattern 4: Complex Business Logic
User asks: "Conversion rate last 30 days?"

Exploration Steps:
1. Find "conversion_rate" metric + "last_30_days" filter
2. Use complex SQL defined in Cube (cross-table calculations)
3. Apply filter's SQL condition
4. Check JOIN conditions

SQL Generated:
SELECT
  (COUNT(DISTINCT CASE WHEN o.status = 'paid' THEN o.user_id END)::DECIMAL / 
   COUNT(DISTINCT u.id) * 100) AS conversion_rate
FROM orders o
LEFT JOIN users u ON o.user_id = u.id
WHERE o.created_at >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY)

## Important Notes

Cube Layer Priority
- FIRST: Check schema/cubes/ for relevant metrics
- Use pre-defined business logic from Cube definitions
- Leverage dimension granularities for time-series queries
- Apply Cube filters instead of manually writing WHERE conditions

Schema Layer Support
- Use Schema layer to understand table structure
- Use actual column names from YAML definitions
- Check enum values in Schema before using in WHERE conditions
- Understand table relationships for generating JOINs

Query Quality
- Always use actual metric names from Cube (revenue, conversion_rate, CLV)
- Reference dimension names from Cube (time, user_tier, geography)
- Apply filter names from Cube (last_30_days, active_users)
- Use table/column names from Schema layer
- Add LIMIT (default 100) to queries

## Schema Directory Structure

schema/
- cubes/               # Cube Layer (Business Semantics)
  - business-metrics.yaml
  - user-analytics.yaml
  - product-analytics.yaml
- tables/              # Schema Layer (Table Structure)
  - orders.yaml
  - users.yaml
  - products.yaml
- joins/               # Schema Layer (Relationship definitions)
  - user-orders.yaml
  - order-products.yaml
- skills/              # Query patterns and best practices
  - common-queries.yaml
  - best-practices.yaml
- examples/            # Example SQL queries
  - monthly-revenue.sql
  - user-clv.sql

### Key Files

1. Cube Files (schema/cubes/*.yaml):
   - Define business metrics (revenue, conversion_rate, CLV)
   - Define dimensions (time, geography, user_tier)
   - Define filters (last_30_days, active_users)
   - Define joins (cross-table connections)

2. Schema Files (schema/tables/*.yaml):
   - Define table structures (columns, types)
   - Define relationships (foreign keys, joins)
   - Define enumerations (status codes, types)

3. Relationship Files (schema/joins/*.yaml):
   - Define table relationships (one_to_one, one_to_many, many_to_many)
   - Provide join conditions

## Dual-Layer Architecture Advantages

1. Business Semantics: Cube layer defines "what to measure"
2. Table Structure: Schema layer defines "how to query"
3. Reuse: Complex business logic defined once, used everywhere
4. Consistency: All queries use same metric definitions
5. Maintainability: Business logic centralized in Cube layer

Remember: The dual-layer architecture separates concerns:
- Cube Layer: Business semantics (what to measure)
- Schema Layer: Technical structure (how to query)

By using both layers, you can generate SQL that is:
- Business-relevant: Uses pre-defined metrics from Cube layer
- Syntactically correct: Uses table structure from Schema layer
- Reusable: Complex business logic defined once, used everywhere

Start your exploration in schema/cubes/, then fallback to schema/tables/ for structural details.`;
  }

  async processQuery(userQuestion: string): Promise<string> {
    const messages: Anthropic.MessageParam[] = [
      { role: 'user', content: userQuestion }
    ];

    const response = await this.anthropic.messages.create({
      model: this.model,
      max_tokens: 4096,
      system: this.getSystemPrompt(),
      messages
    });

    const firstBlock = response.content[0];
    if (firstBlock && firstBlock.type === 'text') {
      return firstBlock.text;
    }
    return '';
  }

  async processQueryWithTools(userQuestion: string, options: { useCache?: boolean } = {}): Promise<string> {
    const useCache = options.useCache ?? this.cacheEnabled;
    const overallTimer = this.logger.startTimer();

    this.logger.info('Processing query', { query: userQuestion.substring(0, 100) });

    // 1. 检查缓存
    if (useCache && this.cacheManager) {
      const queryHash = generateCacheKey(userQuestion);
      const cached = await this.cacheManager.get(queryHash);
      if (cached) {
        this.perfMonitor.recordCacheHit();
        this.logger.info('Cache hit', { duration: overallTimer() });
        return cached.result;
      }
      this.perfMonitor.recordCacheMiss();
    }

    // 2. 执行查询
    const messages: Anthropic.MessageParam[] = [
      { role: 'user', content: userQuestion }
    ];

    let continueLoop = true;
    let finalResponse = '';
    const executedSqls: string[] = [];
    let toolCallCount = 0;

    while (continueLoop) {
      let response;
      try {
        const apiTimer = this.logger.startTimer();
        response = await this.anthropic.messages.create({
          model: this.model,
          max_tokens: 4096,
          system: this.getSystemPrompt(),
          messages,
          tools: [
            {
              name: 'execute_bash',
              description: 'Execute a bash command in schema directory (ls, cat, grep, find)',
              input_schema: {
                type: 'object',
                properties: {
                  command: {
                    type: 'string',
                    description: 'The bash command to execute'
                  }
                },
                required: ['command']
              }
            },
            {
              name: 'execute_sql',
              description: 'Execute a SQL query and return results',
              input_schema: {
                type: 'object',
                properties: {
                  sql: {
                    type: 'string',
                    description: 'The SQL query to execute'
                  },
                  limit: {
                    type: 'number',
                    description: 'Maximum number of rows to return (default: 100)'
                  }
                },
                required: ['sql']
              }
            }
          ]
        });
        this.perfMonitor.recordApiTime(apiTimer());
      } catch (error) {
        this.logger.error('API request failed', { error: error instanceof Error ? error.message : String(error) });
        throw new APIRequestError(
          `API 请求失败: ${error instanceof Error ? error.message : String(error)}`,
          { cause: error instanceof Error ? error : undefined }
        );
      }

      // 添加 assistant 的响应到消息历史
      messages.push({
        role: 'assistant',
        content: response.content
      });

      // 检查是否需要执行工具
      if (response.stop_reason === 'tool_use') {
        // 收集所有工具调用结果
        const toolResults: Anthropic.MessageParam = {
          role: 'user',
          content: []
        };

        for (const block of response.content) {
          if (block.type === 'tool_use') {
            const toolName = block.name;
            const toolInput = block.input as any;
            let toolResult: any;
            toolCallCount++;

            this.logger.debug('Executing tool', { tool: toolName });

            if (toolName === 'execute_bash') {
              const result = await this.bashTool.execute(toolInput.command);
              toolResult = {
                type: 'tool_result',
                tool_use_id: block.id,
                content: result.success ? result.output : `Error: ${result.error}`
              };
            } else if (toolName === 'execute_sql') {
              if (!this.dbConnection) {
                throw new DatabaseNotConnectedError();
              }
              try {
                const query = toolInput.limit > 0 ? `${toolInput.sql} LIMIT ${toolInput.limit}` : toolInput.sql;
                this.logger.debug('Executing SQL', { sql: query.substring(0, 200) });
                executedSqls.push(query);

                const sqlTimer = this.logger.startTimer();
                const [rows] = await this.dbConnection.query(query);
                const sqlDuration = sqlTimer();
                this.perfMonitor.recordQueryTime(sqlDuration);

                const rowCount = Array.isArray(rows) ? rows.length : 0;
                this.logger.info('Query completed', { duration: sqlDuration, rows: rowCount });

                toolResult = {
                  type: 'tool_result',
                  tool_use_id: block.id,
                  content: JSON.stringify({
                    success: true,
                    data: rows,
                    rowCount
                  }, null, 2)
                };
              } catch (error) {
                this.logger.error('Query execution failed', {
                  sql: toolInput.sql.substring(0, 200),
                  error: error instanceof Error ? error.message : String(error)
                });
                const dbError = new DatabaseQueryError(
                  `查询执行失败: ${error instanceof Error ? error.message : String(error)}`,
                  {
                    sql: toolInput.sql,
                    cause: error instanceof Error ? error : undefined
                  }
                );
                toolResult = {
                  type: 'tool_result',
                  tool_use_id: block.id,
                  content: JSON.stringify({
                    success: false,
                    error: dbError.message
                  })
                };
              }
            }

            if (toolResult) {
              (toolResults.content as any[]).push(toolResult);
            }
          }
        }

        // 添加工具结果到消息历史
        if ((toolResults.content as any[]).length > 0) {
          messages.push(toolResults);
        }
      } else {
        // 没有更多工具调用，结束循环
        continueLoop = false;

        // 提取最终文本响应
        for (const block of response.content) {
          if (block.type === 'text') {
            finalResponse += block.text;
          }
        }
      }
    }

    // 3. 存储到缓存
    if (useCache && this.cacheManager && finalResponse) {
      const queryHash = generateCacheKey(userQuestion);
      await this.cacheManager.set({
        queryHash,
        query: userQuestion,
        result: finalResponse,
        sqlExecuted: executedSqls.length > 0 ? executedSqls : undefined,
        createdAt: new Date(),
        expiresAt: calculateExpiresAt(this.cacheConfig.ttl)
      });
    }

    this.logger.info('Query processing completed', {
      duration: overallTimer(),
      toolCalls: toolCallCount,
      sqlQueries: executedSqls.length
    });

    return finalResponse;
  }
}
