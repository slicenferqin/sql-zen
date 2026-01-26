import Anthropic from '@anthropic-ai/sdk';
import { BashTool } from '../tools/execute-bash.js';
import mysql from 'mysql2/promise';

export interface AgentOptions {
  apiKey?: string;
  baseURL?: string;
  model?: string;
  maxRetries?: number;
  database?: {
    host?: string;
    port?: number;
    database: string;
    user?: string;
    password?: string;
    ssl?: boolean;
  };
}

export class SQLZenAgent {
  private anthropic: Anthropic;
  private bashTool: BashTool;
  private dbConnection: mysql.Connection | null = null;
  private model: string;

  constructor(options: AgentOptions = {}) {
    const apiKey = options.apiKey || process.env.ANTHROPIC_API_KEY || '';
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required');
    }

    const baseURL = options.baseURL || process.env.ANTHROPIC_BASE_URL;

    this.anthropic = new Anthropic({
      apiKey: apiKey,
      ...(baseURL ? { baseURL } : {})
    });

    this.model = options.model || process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022';
    this.bashTool = new BashTool();
  }

  async initialize(dbConfig: { database: string; host?: string; port?: number; user?: string; password?: string; ssl?: boolean }): Promise<void> {
    this.dbConnection = await mysql.createConnection({
      host: dbConfig.host || 'localhost',
      port: dbConfig.port || 3306,
      database: dbConfig.database,
      user: dbConfig.user || 'root',
      password: dbConfig.password || '',
    });
    console.log('Agent initialized');
  }

  async cleanup(): Promise<void> {
    if (this.dbConnection) {
      await this.dbConnection.end();
    }
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

  async processQueryWithTools(userQuestion: string): Promise<string> {
    const messages: Anthropic.MessageParam[] = [
      { role: 'user', content: userQuestion }
    ];

    let continueLoop = true;
    let finalResponse = '';

    while (continueLoop) {
      const response = await this.anthropic.messages.create({
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

            console.log(`🔧 Executing tool: ${toolName}`);

            if (toolName === 'execute_bash') {
              const result = await this.bashTool.execute(toolInput.command);
              toolResult = {
                type: 'tool_result',
                tool_use_id: block.id,
                content: result.success ? result.output : `Error: ${result.error}`
              };
            } else if (toolName === 'execute_sql') {
              if (!this.dbConnection) {
                throw new Error('Database not connected');
              }
              try {
                const query = toolInput.limit > 0 ? `${toolInput.sql} LIMIT ${toolInput.limit}` : toolInput.sql;
                console.log(`📊 Executing SQL: ${query}`);
                const [rows] = await this.dbConnection.query(query);
                toolResult = {
                  type: 'tool_result',
                  tool_use_id: block.id,
                  content: JSON.stringify({
                    success: true,
                    data: rows,
                    rowCount: Array.isArray(rows) ? rows.length : 0
                  }, null, 2)
                };
              } catch (error) {
                toolResult = {
                  type: 'tool_result',
                  tool_use_id: block.id,
                  content: JSON.stringify({
                    success: false,
                    error: error instanceof Error ? error.message : String(error)
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

    return finalResponse;
  }
}
