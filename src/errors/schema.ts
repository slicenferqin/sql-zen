/**
 * Schema 解析相关错误类
 */

import { SQLZenError, SQLZenErrorOptions } from './base.js';

/**
 * Schema 错误基类
 */
export class SchemaError extends SQLZenError {
  constructor(message: string, options: SQLZenErrorOptions = {}) {
    super(message, {
      code: options.code || 'SCHEMA_ERROR',
      ...options
    });
  }
}

/**
 * Schema 解析错误
 */
export class SchemaParseError extends SchemaError {
  public readonly filePath?: string;
  public readonly line?: number;

  constructor(
    message: string,
    options: SQLZenErrorOptions & { filePath?: string; line?: number } = {}
  ) {
    super(message, {
      code: 'SCHEMA_PARSE_ERROR',
      context: {
        ...options.context,
        filePath: options.filePath,
        line: options.line
      },
      suggestions: options.suggestions || [
        '检查 YAML 文件语法是否正确',
        '验证缩进是否一致（使用空格而非制表符）',
        '确认所有必需字段都已填写'
      ],
      recoverable: true,
      ...options
    });
    this.filePath = options.filePath;
    this.line = options.line;
  }

  format(): string {
    const lines: string[] = [];

    lines.push(`Schema 解析错误: ${this.message}`);

    if (this.filePath) {
      lines.push(`文件: ${this.filePath}${this.line ? `:${this.line}` : ''}`);
    }

    lines.push(`错误码: ${this.code}`);

    if (this.suggestions && this.suggestions.length > 0) {
      lines.push('建议:');
      for (const suggestion of this.suggestions) {
        lines.push(`  - ${suggestion}`);
      }
    }

    return lines.join('\n');
  }
}

/**
 * Cube 解析错误（迁移自 cube-parser.ts）
 */
export class CubeParseError extends SchemaError {
  public readonly filePath?: string;
  public readonly line?: number;

  constructor(
    message: string,
    options: SQLZenErrorOptions & { filePath?: string; line?: number } = {}
  ) {
    super(message, {
      code: 'CUBE_PARSE_ERROR',
      context: {
        ...options.context,
        filePath: options.filePath,
        line: options.line
      },
      suggestions: options.suggestions || [
        '检查 Cube YAML 文件格式是否正确',
        '确认 cube、dimensions、metrics 字段都已定义',
        '验证度量类型是否为有效值（sum, count, avg, percentage, ratio, min, max）'
      ],
      recoverable: true,
      ...options
    });
    this.filePath = options.filePath;
    this.line = options.line;
  }

  format(): string {
    const lines: string[] = [];

    lines.push(`Cube 解析错误: ${this.message}`);

    if (this.filePath) {
      lines.push(`文件: ${this.filePath}${this.line ? `:${this.line}` : ''}`);
    }

    lines.push(`错误码: ${this.code}`);

    if (this.suggestions && this.suggestions.length > 0) {
      lines.push('建议:');
      for (const suggestion of this.suggestions) {
        lines.push(`  - ${suggestion}`);
      }
    }

    return lines.join('\n');
  }
}

/**
 * Schema 验证错误
 */
export class SchemaValidationError extends SchemaError {
  public readonly validationErrors: string[];

  constructor(
    message: string,
    options: SQLZenErrorOptions & { validationErrors?: string[] } = {}
  ) {
    super(message, {
      code: 'SCHEMA_VALIDATION_ERROR',
      context: {
        ...options.context,
        validationErrors: options.validationErrors
      },
      suggestions: options.suggestions || [
        '运行 sql-zen validate 查看详细验证错误',
        '检查表定义是否完整',
        '确认列名没有重复'
      ],
      recoverable: true,
      ...options
    });
    this.validationErrors = options.validationErrors || [];
  }

  format(): string {
    const lines: string[] = [];

    lines.push(`Schema 验证错误: ${this.message}`);
    lines.push(`错误码: ${this.code}`);

    if (this.validationErrors.length > 0) {
      lines.push('验证错误:');
      for (const error of this.validationErrors) {
        lines.push(`  - ${error}`);
      }
    }

    if (this.suggestions && this.suggestions.length > 0) {
      lines.push('建议:');
      for (const suggestion of this.suggestions) {
        lines.push(`  - ${suggestion}`);
      }
    }

    return lines.join('\n');
  }
}
