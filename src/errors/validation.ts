/**
 * 验证相关错误类
 */

import { SQLZenError, SQLZenErrorOptions } from './base.js';

/**
 * 验证错误基类
 */
export class ValidationError extends SQLZenError {
  public readonly field?: string;
  public readonly value?: unknown;

  constructor(
    message: string,
    options: SQLZenErrorOptions & { field?: string; value?: unknown } = {}
  ) {
    super(message, {
      code: options.code || 'VALIDATION_ERROR',
      context: {
        ...options.context,
        field: options.field,
        value: options.value
      },
      recoverable: true,
      ...options
    });
    this.field = options.field;
    this.value = options.value;
  }

  format(): string {
    const lines: string[] = [];

    lines.push(`验证错误: ${this.message}`);

    if (this.field) {
      lines.push(`字段: ${this.field}`);
    }

    if (this.value !== undefined) {
      lines.push(`值: ${JSON.stringify(this.value)}`);
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
 * 必填字段缺失错误
 */
export class RequiredFieldError extends ValidationError {
  constructor(field: string, options: SQLZenErrorOptions = {}) {
    super(`必填字段 '${field}' 缺失`, {
      code: 'REQUIRED_FIELD_MISSING',
      field,
      suggestions: options.suggestions || [
        `请提供 '${field}' 字段的值`,
        '检查配置文件是否完整'
      ],
      ...options
    });
  }
}

/**
 * 无效值错误
 */
export class InvalidValueError extends ValidationError {
  public readonly expectedType?: string;
  public readonly allowedValues?: unknown[];

  constructor(
    field: string,
    value: unknown,
    options: SQLZenErrorOptions & {
      expectedType?: string;
      allowedValues?: unknown[];
    } = {}
  ) {
    const message = options.allowedValues
      ? `字段 '${field}' 的值无效，允许的值: ${options.allowedValues.join(', ')}`
      : options.expectedType
        ? `字段 '${field}' 的值类型无效，期望: ${options.expectedType}`
        : `字段 '${field}' 的值无效`;

    super(message, {
      code: 'INVALID_VALUE',
      field,
      value,
      context: {
        ...options.context,
        expectedType: options.expectedType,
        allowedValues: options.allowedValues
      },
      suggestions: options.suggestions || [
        options.allowedValues
          ? `使用以下值之一: ${options.allowedValues.join(', ')}`
          : '检查值的格式和类型是否正确'
      ],
      ...options
    });
    this.expectedType = options.expectedType;
    this.allowedValues = options.allowedValues;
  }
}

/**
 * 重复值错误
 */
export class DuplicateValueError extends ValidationError {
  constructor(field: string, value: unknown, options: SQLZenErrorOptions = {}) {
    super(`字段 '${field}' 存在重复值: ${value}`, {
      code: 'DUPLICATE_VALUE',
      field,
      value,
      suggestions: options.suggestions || [
        '确保所有值都是唯一的',
        '检查是否有重复的定义'
      ],
      ...options
    });
  }
}
