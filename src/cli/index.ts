#!/usr/bin/env node

import { Command } from 'commander';
import { promises as fs } from 'fs';
import ora from 'ora';
import { config } from 'dotenv';
import { SQLZenAgent } from '../agent/core.js';
import { SchemaParser } from '../schema/parser.js';
import { SQLZenError } from '../errors/index.js';
import { formatCacheStats } from '../cache/index.js';

// 加载 .env 文件
config();

/**
 * 格式化错误输出
 */
function formatError(error: unknown): string {
  if (error instanceof SQLZenError) {
    return error.format();
  }
  return error instanceof Error ? error.message : String(error);
}

async function main() {
  const pkg = JSON.parse(
    await fs.readFile(
      new URL('../../package.json', import.meta.url),
      'utf-8'
    )
  );

  const program = new Command()
    .name(pkg.name)
    .description(pkg.description)
    .version(pkg.version);

  program
    .command('init')
    .description('Initialize SQL-Zen project')
    .action(async () => {
      const spinner = ora('Initializing SQL-Zen...').start();
      
      try {
        const schemaDir = `${process.cwd()}/schema`;
        const dirs = ['tables', 'joins', 'cubes', 'examples', 'skills'];
        
        for (const dir of dirs) {
          const dirPath = `${schemaDir}/${dir}`;
          if (!await fs.access(dirPath).then(() => true).catch(() => false)) {
            await fs.mkdir(dirPath, { recursive: true });
          }
        }

        const gitignorePath = `${schemaDir}/.gitignore`;
        await fs.writeFile(
          gitignorePath,
          '# Dependencies\nnode_modules/\n\n# Build output\ndist/\nbuild/\n\n# Environment variables\n.env\n.env.local\n.env.*.local\n\n# IDE\n.idea/\n.vscode/\n'
        );

        // 创建 Cube 层示例
        const cubeExamplePath = `${schemaDir}/cubes/business-metrics.yaml`;
        const cubeExampleContent = `cube: business_metrics
description: "核心业务指标"

dimensions:
  - name: time
    description: "时间维度"
    column: "DATE(orders.created_at)"
    granularity:
      - month:
          sql: "DATE_FORMAT(created_at, '%Y-%m')"
          description: "月"
      - day:
          sql: "DATE(created_at)"
          description: "日"

metrics:
  - name: revenue
    description: "总收入"
    sql: "SUM(CASE WHEN status = 'paid' THEN total_amount END)"
    type: sum
    
  - name: total_orders
    description: "总订单数"
    sql: "COUNT(*)"
    type: count

filters:
  - name: last_30_days
    sql: "created_at >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY)"
    description: "最近30天"
`;

        await fs.writeFile(cubeExamplePath, cubeExampleContent);

        spinner.succeed('SQL-Zen project initialized successfully!');
        console.log('✓ Project initialized');
        console.log('Schema directory: schema/');
        console.log('  - tables/    # Schema Layer (table definitions)');
        console.log('  - joins/     # Schema Layer (relationship definitions)');
        console.log('  - cubes/     # Cube Layer (business metrics)');
        console.log('  - examples/  # Example SQL queries');
        console.log('');
        console.log('Cube layer example created: schema/cubes/business-metrics.yaml');
        console.log('Run "sql-zen ask \\"your question\\"" to start querying');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        spinner.fail(`Failed to initialize: ${errorMessage}`);
        console.error(errorMessage);
        process.exit(1);
      }
    });

  program
    .command('ask <question>')
    .description('Ask a question to query database')
    .option('--cube', 'Prioritize Cube layer for business metrics')
    .option('--model <model>', 'Specify Claude model to use')
    .option('--base-url <url>', 'Specify custom API base URL')
    .option('--no-cache', 'Disable query result caching')
    .action(async (question, cmdOptions) => {
      const spinner = ora('Processing query...').start();

      try {
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
          throw new Error('ANTHROPIC_API_KEY environment variable is required.\nCreate a .env file with:\n  ANTHROPIC_API_KEY=sk-ant-...\nOr set it with:\n  export ANTHROPIC_API_KEY=sk-ant-...');
        }

        // 读取数据库配置
        const dbConfig = {
          database: process.env.DB_NAME || 'test',
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432'),
          user: process.env.DB_USER || process.env.USER || 'postgres',
          password: process.env.DB_PASSWORD,
          ssl: process.env.DB_SSL === 'true'
        };

        // 创建 Agent，支持自定义配置
        const agent = new SQLZenAgent({
          model: cmdOptions.model,
          baseURL: cmdOptions.baseUrl,
          cache: { enabled: cmdOptions.cache !== false }
        });
        await agent.initialize(dbConfig);

        const response = await agent.processQueryWithTools(question, {
          useCache: cmdOptions.cache !== false
        });

        spinner.succeed('Query processed successfully!');
        console.log('✓ Query processed');
        console.log(response);

        await agent.cleanup();
      } catch (error) {
        spinner.fail(`Query failed`);
        console.error(formatError(error));
        process.exit(1);
      }
    });

  program
    .command('validate')
    .description('Validate schema files')
    .option('--cube', 'Validate Cube layer files')
    .action(async (options) => {
      const spinner = ora('Validating schema...').start();
      
      try {
        const schemaParser = new SchemaParser(`${process.cwd()}/schema`);
        const isValid = await schemaParser.validateSchema({ includeCubes: options.cube });
        
        if (isValid.valid) {
          spinner.succeed('Schema is valid!');
          console.log('✓ Schema validated');
          if (options.cube) {
            console.log('  - Schema Layer: tables/');
            console.log('  - Cube Layer: cubes/');
          }
        } else {
          spinner.fail('Schema validation failed');
          console.log('✗ Schema validation failed');
          console.error('Validation errors:');
          isValid.errors.forEach(err => console.error(`  - ${err}`));
          process.exit(1);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        spinner.fail(`Validation failed: ${errorMessage}`);
        console.error(errorMessage);
        process.exit(1);
      }
    });

  program
    .command('cube <name>')
    .description('Create a new Cube')
    .action(async (name) => {
      const spinner = ora(`Creating Cube: ${name}...`).start();
      
      try {
        const cubePath = `${process.cwd()}/schema/cubes/${name}.yaml`;
        
        if (await fs.access(cubePath).then(() => true).catch(() => false)) {
          throw new Error(`Cube "${name}" already exists`);
        }

        const cubeContent = `cube: ${name}
description: "业务指标定义"

dimensions:
  - name: time
    description: "时间维度"
    column: "DATE(orders.created_at)"

metrics:
  - name: metric_name
    description: "度量描述"
    sql: "SELECT COUNT(*) FROM orders"
    type: count

filters:
  - name: filter_name
    sql: "created_at >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY)"
    description: "过滤器描述"
`;

        await fs.writeFile(cubePath, cubeContent);

        spinner.succeed(`Cube "${name}" created successfully!`);
        console.log(`✓ Cube created: schema/cubes/${name}.yaml`);
        console.log('Edit the file to add your metrics, dimensions, and filters');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        spinner.fail(`Failed to create Cube: ${errorMessage}`);
        console.error(errorMessage);
        process.exit(1);
      }
    });

  // 缓存命令组
  const cacheCommand = program
    .command('cache')
    .description('Manage query result cache');

  cacheCommand
    .command('stats')
    .description('Show cache statistics')
    .action(async () => {
      const spinner = ora('Loading cache statistics...').start();

      try {
        // 初始化缓存但不连接数据库
        const { SQLiteCacheManager } = await import('../cache/index.js');
        const { loadCacheConfig } = await import('../config/cache-config.js');
        const cacheConfig = loadCacheConfig();
        const cacheManager = new SQLiteCacheManager(cacheConfig);
        await cacheManager.initialize();

        const stats = await cacheManager.getStats();
        await cacheManager.close();

        spinner.succeed('Cache statistics loaded');
        console.log(formatCacheStats(stats));
      } catch (error) {
        spinner.fail('Failed to load cache statistics');
        console.error(formatError(error));
        process.exit(1);
      }
    });

  cacheCommand
    .command('clear')
    .description('Clear all cached query results')
    .action(async () => {
      const spinner = ora('Clearing cache...').start();

      try {
        const { SQLiteCacheManager } = await import('../cache/index.js');
        const { loadCacheConfig } = await import('../config/cache-config.js');
        const cacheConfig = loadCacheConfig();
        const cacheManager = new SQLiteCacheManager(cacheConfig);
        await cacheManager.initialize();

        await cacheManager.clear();
        await cacheManager.close();

        spinner.succeed('Cache cleared successfully');
        console.log('✓ All cached query results have been removed');
      } catch (error) {
        spinner.fail('Failed to clear cache');
        console.error(formatError(error));
        process.exit(1);
      }
    });

  program.parse();
}

main().catch(console.error);
