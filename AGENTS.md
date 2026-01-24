# AGENTS.md - Developer Guide for SQL-Zen

This document provides essential information for AI coding agents working on the SQL-Zen project.

## Project Overview

**SQL-Zen** is a minimalist Text-to-SQL Agent inspired by Vercel's d0 project. Core philosophy: "Less Tools, More Intelligence" - using only 2 tools (execute_bash, execute_sql) instead of 15+ traditional tools.

**Key Architecture**: File system-driven approach where schema definitions are stored as YAML files that LLMs explore using standard shell commands (ls, cat, grep, find).

## Build, Lint & Test Commands

### Project Status
⚠️ **Early Stage**: This is a greenfield project in MVP phase (v0.1.0). No build system, dependencies, or tests exist yet.

### Planned Commands (To Be Implemented)
```bash
# Installation (future)
npm install

# Build (future)
npm run build

# Run tests (future)
npm test

# Run single test (future)
npm test -- --grep "test name"
# or
npm test path/to/test-file.test.ts

# Lint (future)
npm run lint

# Format (future)
npm run format

# Type check (future)
npm run type-check

# CLI usage (future)
sql-zen init                    # Initialize project
sql-zen ask "your question"     # Query database
sql-zen validate                # Validate schema files
```

## Technology Stack

| Component | Technology | Status |
|-----------|-----------|--------|
| Language | TypeScript + ESM | To be set up |
| Runtime | Node.js | To be set up |
| LLM SDK | Vercel AI SDK | To be integrated |
| Database | PostgreSQL, SQLite | To be integrated |
| CLI Framework | Commander.js | To be integrated |
| Linting | ESLint | To be configured |
| Formatting | Prettier | To be configured |

## Code Style Guidelines

### File Organization
```
sql-zen/
├── src/                    # Source code
│   ├── agent/             # LLM agent core
│   ├── tools/             # execute_bash, execute_sql
│   ├── schema/            # Schema parser & validator
│   ├── database/          # Database connectors
│   └── cli/               # CLI commands
├── tests/                 # Test files
├── schema/                # Schema definitions (YAML)
│   ├── tables/           # Table definitions
│   ├── joins/            # Relationship definitions
│   ├── measures/         # Metric definitions
│   └── examples/         # Example SQL queries
└── docs/                  # Documentation
```

### TypeScript Style

#### Imports
- Use ES modules (ESM) syntax: `import` / `export`
- Group imports: external packages → internal modules → types
- Use named exports over default exports
```typescript
// Good
import { readFile } from 'fs/promises';
import { parseSchema } from '@/schema/parser';
import type { SchemaDefinition } from '@/types';

export function validateSchema() { }
export class SchemaValidator { }

// Avoid
export default function validateSchema() { }
```

#### Naming Conventions
- **Files**: kebab-case (`schema-parser.ts`, `execute-bash.ts`)
- **Classes**: PascalCase (`SchemaValidator`, `DatabaseConnector`)
- **Functions**: camelCase (`parseSchema`, `executeSql`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_QUERY_TIMEOUT`, `DEFAULT_LIMIT`)
- **Interfaces/Types**: PascalCase (`SchemaDefinition`, `ToolResult`)
- **Private members**: prefix with `_` (`_internalCache`)

#### Type Annotations
- Always use explicit types for function parameters and return values
- Use `interface` for object shapes, `type` for unions/intersections
- Prefer `unknown` over `any`
```typescript
// Good
interface SchemaTable {
  name: string;
  description: string;
  columns: Column[];
}

function parseYaml(content: string): SchemaTable {
  // implementation
}

// Avoid
function parseYaml(content) {
  // implementation
}
```

#### Error Handling
- Use custom error classes for domain-specific errors
- Always handle promise rejections
- Provide context in error messages
```typescript
// Good
class SchemaValidationError extends Error {
  constructor(message: string, public filePath: string) {
    super(message);
    this.name = 'SchemaValidationError';
  }
}

async function loadSchema(path: string): Promise<Schema> {
  try {
    const content = await readFile(path, 'utf-8');
    return parseSchema(content);
  } catch (error) {
    throw new SchemaValidationError(
      `Failed to load schema from ${path}: ${error.message}`,
      path
    );
  }
}
```

#### Async/Await
- Prefer `async/await` over raw promises
- Use `Promise.all()` for parallel operations
- Always handle errors in async functions

### Code Formatting
- **Indentation**: 2 spaces (no tabs)
- **Line length**: 100 characters max
- **Quotes**: Single quotes for strings, backticks for templates
- **Semicolons**: Required
- **Trailing commas**: Yes (multiline)

### Comments & Documentation
- Use JSDoc for public APIs
- Explain "why" not "what" in comments
- Keep comments up-to-date with code changes
```typescript
/**
 * Executes a bash command in the schema directory sandbox.
 * Only allows read-only commands (ls, cat, grep, find) for security.
 * 
 * @param command - The bash command to execute
 * @returns The command output
 * @throws {SecurityError} If command is not in whitelist
 */
export async function executeBash(command: string): Promise<string> {
  // Implementation
}
```

## Schema File Guidelines

### YAML Structure
- Use 2-space indentation
- Include descriptions for all fields
- Provide examples for enum values
- Add common_filters and measures when applicable

### Table Definition Template
```yaml
table:
  name: table_name
  description: "Clear description of what this table represents"
  database: database_name
  schema: schema_name

columns:
  - name: column_name
    type: data_type
    description: "What this column represents"
    primary_key: true  # if applicable
    foreign_key:       # if applicable
      table: referenced_table
      column: referenced_column
    enum:              # if applicable
      - value: enum_value
        description: "What this value means"

common_filters:
  - name: filter_name
    sql: "SQL condition"
    description: "When to use this filter"

measures:
  - name: metric_name
    sql: "SQL aggregation"
    description: "What this metric calculates"
```

## Security Considerations

### Bash Command Execution
- **Whitelist only**: ls, cat, grep, find, head, tail, wc
- **Sandbox**: Commands execute only in schema/ directory
- **No write operations**: Read-only access

### SQL Execution
- **Default**: SELECT statements only
- **Row limits**: Default 100 rows, configurable max
- **Timeout**: 30 seconds default
- **No sensitive data**: Schema files should not contain real data samples

## Design Principles

1. **Extreme Minimalism**: Resist adding new tools. Can it be done with bash + SQL?
2. **Trust the Model**: Don't over-constrain with prompts. Give context, let LLM reason.
3. **File System First**: Schema as files > Schema as database > Schema as code
4. **Documentation Quality**: Better schema docs > More tools
5. **Future-Proof**: Build for next-gen models, not current limitations

## Common Patterns

### Schema Exploration Pattern
```typescript
// Agent workflow:
// 1. ls schema/tables/          → See available tables
// 2. cat schema/tables/orders.yaml  → Read table definition
// 3. grep -r "user_id" schema/  → Find relationships
// 4. Generate and execute SQL
```

### Error Recovery Pattern
```typescript
// If SQL fails:
// 1. Read error message
// 2. Re-examine schema files
// 3. Adjust SQL and retry
// No need for separate "validate_sql" tool
```

## Testing Guidelines

### Test Structure (To Be Implemented)
- Unit tests: `tests/unit/`
- Integration tests: `tests/integration/`
- E2E tests: `tests/e2e/`
- Test files: `*.test.ts` or `*.spec.ts`

### Coverage Goals
- Unit test coverage: > 80%
- Critical paths: 100% coverage
- Schema validation: Comprehensive test cases

## Git Workflow

### Commit Messages
- Format: `type(scope): description`
- Types: feat, fix, docs, style, refactor, test, chore
- Examples:
  - `feat(agent): add execute_bash tool implementation`
  - `fix(schema): handle missing foreign_key field`
  - `docs(readme): update installation instructions`

### Branch Naming
- Feature: `feat/description`
- Bug fix: `fix/description`
- Documentation: `docs/description`

## References

- [Design Document](./docs/design.md) - Architecture and technical decisions
- [Roadmap](./docs/roadmap.md) - Version planning and milestones
- [Vercel Blog](./docs/references/vercel-blog-we-removed-80-percent-of-our-agents-tools.md) - Inspiration source
- [Schema README](./schema/README.md) - Schema file specifications

## Current Status & Priorities

**Phase**: v0.1.0 MVP (Week 0-2)
**Priority Tasks**:
1. Set up TypeScript + ESM project structure
2. Implement YAML schema parser
3. Build execute_bash and execute_sql tools
4. Create LLM agent core with Claude API
5. Develop CLI commands (init, ask, validate)

**Non-Goals for MVP**:
- Multi-turn conversations
- Result visualization
- Web UI
- Complex RAG systems
