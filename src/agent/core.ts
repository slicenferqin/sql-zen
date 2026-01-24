import Anthropic from '@anthropic-ai/sdk';
import { BashTool } from '../tools/execute-bash.js';
import { DatabaseConnector } from '../database/postgres.js';
import { SchemaParser } from '../schema/parser.js';

export interface AgentOptions {
  model?: string;
  maxRetries?: number;
}

export class SQLZenAgent {
  private anthropic: Anthropic;
  private bashTool: BashTool;
  private schemaParser: SchemaParser;
  private databaseConnector: DatabaseConnector;

  constructor(options: AgentOptions = {}) {
    const apiKey = process.env.ANTHROPIC_API_KEY || '';
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required');
    }

    this.anthropic = new Anthropic({
      apiKey: apiKey,
      ...(options.model ? { defaultHeaders: { 'anthropic-version': options.model } } : {})
    });

    this.bashTool = new BashTool();
    this.schemaParser = new SchemaParser();
    this.databaseConnector = new DatabaseConnector();
  }

  async initialize(): Promise<void> {
    await this.databaseConnector.connect();
    console.log('Agent initialized');
  }

  async cleanup(): Promise<void> {
    await this.databaseConnector.disconnect();
  }

  private getSystemPrompt(): string {
    return `You are SQL-Zen, a minimalist Text-to-SQL Agent.

## Your Mission
Help users query databases with natural language using only 2 tools: execute_bash and execute_sql.

## Core Philosophy
- Less Tools, More Intelligence
- File system driven: Use grep, cat, ls to explore schema
- Trust the model: Don't over-constrain with prompts
- Documentation quality > Tool quantity

## How to Work
1. Understand the user's question
2. Use execute_bash to explore the schema/ directory:
   - ls schema/tables/ to see available tables
   - cat schema/tables/<table>.yaml to read table definitions
   - grep -r '<keyword>' schema/ to find relationships
3. Use execute_sql to run the generated query
4. Return results with explanation

## Important Notes
- Read schema/README.md for database overview
- Always use actual column names from YAML definitions
- Check enum values in schema/tables/ before using in WHERE conditions
- Add LIMIT (default 100) to queries
- Use table and column names from schema, don't guess

## Schema Directory Structure
schema/
├── tables/         # Table definitions (YAML)
├── joins/          # Relationship definitions
├── measures/       # Metric definitions
├── skills/         # Query patterns and best practices
└── examples/       # Example SQL queries

Remember: You have full reasoning capabilities. Use them to solve problems creatively while following the system prompt guidelines.`;
  }

  async processQuery(userQuestion: string): Promise<string> {
    const messages: Anthropic.MessageParam[] = [
      { role: 'user', content: userQuestion },
      { role: 'assistant', content: this.getSystemPrompt() }
    ];

    const response = await this.anthropic.messages.create({ messages });

    return response.content[0].text;
  }

  async processQueryWithTools(userQuestion: string): Promise<string> {
    const messages: Anthropic.MessageParam[] = [
      { role: 'user', content: userQuestion },
      { role: 'assistant', content: this.getSystemPrompt() }
    ];

    const response = await this.anthropic.messages.create({
      messages,
      tools: [
        {
          name: 'execute_bash',
          description: 'Execute a bash command in the schema directory (ls, cat, grep, find)',
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

    if (response.stop_reason === 'tool_use') {
      const toolName = response.content[response.content.length - 1].name;
      const toolInput = JSON.parse(response.content[response.content.length - 1].input);

      if (toolName === 'execute_bash') {
        const result = await this.bashTool.execute(toolInput.command);
        return await this.processQueryWithTools(userQuestion);
      } else if (toolName === 'execute_sql') {
        const result = await this.databaseConnector.executeQuery(toolInput.sql, toolInput.limit || 100);
        return JSON.stringify({
          success: true,
          data: result,
          rowCount: result.length
        });
      }
    }

    return response.content[0].text;
  }
}
