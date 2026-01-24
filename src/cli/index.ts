#!/usr/bin/env node

import { Command } from 'commander';
import { promises as fs } from 'fs';
import ora from 'ora';
import { SQLZenAgent } from '../agent/core.js';
import { SchemaParser } from '../schema/parser.js';

async function main() {
  const pkg = JSON.parse(
    await fs.readFile(
      new URL('../package.json', import.meta.url),
      'utf-8'
    )
  );

  const program = new Command()
    .name(pkg.name)
    .description(pkg.description)
    .version(pkg.version);

  program
    .command('init', 'Initialize SQL-Zen project')
    .action(async () => {
      const spinner = ora('Initializing SQL-Zen...').start();
      
      try {
        const schemaDir = `${process.cwd()}/schema`;
        const dirs = ['tables', 'joins', 'measures', 'examples', 'skills'];
        
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

        spinner.succeed('SQL-Zen project initialized successfully!');
        console.log(chalk.green('✓ Project initialized'));
        console.log(chalk.gray('Schema directory: schema/'));
        console.log(chalk.gray('Run "sql-zen ask \\"your question\\"" to start querying'));
      } catch (error) {
        spinner.fail(`Failed to initialize: ${error.message}`);
        console.error(chalk.red(error.message));
        process.exit(1);
      }
    });

  program
    .command('ask <question>', 'Ask a question to query the database')
    .action(async (question) => {
      const spinner = ora('Processing query...').start();
      
      try {
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
          throw new Error('ANTHROPIC_API_KEY environment variable is required. Set it with:\n  export ANTHROPIC_API_KEY=sk-ant-...');
        }

        const agent = new SQLZenAgent(apiKey);
        await agent.initialize();

        const response = await agent.processQuery(question);
        
        spinner.succeed('Query processed successfully!');
        console.log(chalk.green('✓ Query processed'));
        console.log(chalk.white(response));
      } catch (error) {
        spinner.fail(`Query failed: ${error.message}`);
        console.error(chalk.red(error.message));
        process.exit(1);
      }
    });

  program
    .command('validate', 'Validate schema files')
    .action(async () => {
      const spinner = ora('Validating schema...').start();
      
      try {
        const schemaParser = new SchemaParser(`${process.cwd()}/schema`);
        const isValid = await schemaParser.validateSchema();
        
        if (isValid) {
          spinner.succeed('Schema is valid!');
          console.log(chalk.green('✓ Schema validated'));
        } else {
          spinner.fail('Schema validation failed');
          console.log(chalk.red('✗ Schema validation failed'));
          process.exit(1);
        }
      } catch (error) {
        spinner.fail(`Validation failed: ${error.message}`);
        console.error(chalk.red(error.message));
        process.exit(1);
      }
    });

  program.parse();
}

main().catch(console.error);

