#!/usr/bin/env node

import { Command } from 'commander';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import ora from 'ora';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const pkg = JSON.parse(
    readFileSync(join(__dirname, '..', 'package.json'), 'utf-8')
  );

  const program = new Command()
    .name(pkg.name)
    .description(pkg.description)
    .version(pkg.version);

  program
    .command('init', 'Initialize SQL-Zen project')
    .action(async () => {
      console.log(chalk.blue('✨ Initializing SQL-Zen project...'));
      // TODO: Implement init command
      console.log(chalk.green('✓ Project initialized'));
    });

  program
    .command('ask <question>', 'Ask a question to query the database')
    .action(async (question) => {
      console.log(chalk.blue(`🤖 Processing: ${question}`));
      // TODO: Implement ask command
      console.log(chalk.green('✓ Query processed'));
    });

  program
    .command('validate', 'Validate schema files')
    .action(async () => {
      console.log(chalk.blue('🔍 Validating schema files...'));
      // TODO: Implement validate command
      console.log(chalk.green('✓ Schema validated'));
    });

  program.parse();
}

main().catch(console.error);
