/**
 * 错误处理工具函数
 */

import { SQLZenError } from './base.js';
import { DatabaseError, DatabaseConnectionError, DatabaseQueryError } from './database.js';
import { SchemaParseError } from './schema.js';
import { APIRequestError } from './api.js';

/**
 * 将原生错误转换为 SQLZenError
 */
export function wrapError(
  error: unknown,
  defaultErrorClass: new (message: string, options?: any) => SQLZenError = DatabaseError
): SQLZenError {
  if (error instanceof SQLZenError) {
    return error;
  }

  const message = error instanceof Error ? error.message : String(error);
  const cause = error instanceof Error ? error : undefined;

  // 尝试根据错误消息推断错误类型
  if (message.includes('ECONNREFUSED') || message.includes('connect')) {
    return new DatabaseConnectionError(message, { cause });
  }

  if (message.includes('syntax') || message.includes('SQL')) {
    return new DatabaseQueryError(message, { cause });
  }

  if (message.includes('YAML') || message.includes('parse')) {
    return new SchemaParseError(message, { cause });
  }

  if (message.includes('API') || message.includes('request')) {
    return new APIRequestError(message, { cause });
  }

  return new defaultErrorClass(message, { cause });
}

/**
 * 重试配置
 */
export interface RetryOptions {
  maxRetries?: number;
  delay?: number;
  backoff?: number;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  onRetry?: (error: unknown, attempt: number) => void;
}

/**
 * 带重试机制的函数执行器
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    delay = 1000,
    backoff = 2,
    shouldRetry = (error) => {
      if (error instanceof SQLZenError) {
        return error.recoverable;
      }
      return true;
    },
    onRetry
  } = options;

  let lastError: unknown;
  let currentDelay = delay;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries || !shouldRetry(error, attempt)) {
        throw error;
      }

      if (onRetry) {
        onRetry(error, attempt);
      }

      await sleep(currentDelay);
      currentDelay *= backoff;
    }
  }

  throw lastError;
}

/**
 * 睡眠函数
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 错误聚合器 - 收集多个错误
 */
export class ErrorAggregator {
  private errors: SQLZenError[] = [];

  /**
   * 添加错误
   */
  add(error: SQLZenError | Error | string): void {
    if (error instanceof SQLZenError) {
      this.errors.push(error);
    } else if (error instanceof Error) {
      this.errors.push(wrapError(error));
    } else {
      this.errors.push(wrapError(new Error(error)));
    }
  }

  /**
   * 检查是否有错误
   */
  hasErrors(): boolean {
    return this.errors.length > 0;
  }

  /**
   * 获取所有错误
   */
  getErrors(): SQLZenError[] {
    return [...this.errors];
  }

  /**
   * 获取错误数量
   */
  count(): number {
    return this.errors.length;
  }

  /**
   * 清空错误
   */
  clear(): void {
    this.errors = [];
  }

  /**
   * 格式化所有错误
   */
  format(): string {
    if (this.errors.length === 0) {
      return '没有错误';
    }

    const lines: string[] = [`发现 ${this.errors.length} 个错误:`];

    for (let i = 0; i < this.errors.length; i++) {
      lines.push(`\n[${i + 1}] ${this.errors[i].format()}`);
    }

    return lines.join('\n');
  }

  /**
   * 如果有错误则抛出
   */
  throwIfErrors(): void {
    if (this.errors.length === 1) {
      throw this.errors[0];
    }

    if (this.errors.length > 1) {
      throw new AggregatedError(this.errors);
    }
  }
}

/**
 * 聚合错误类
 */
export class AggregatedError extends SQLZenError {
  public readonly errors: SQLZenError[];

  constructor(errors: SQLZenError[]) {
    super(`发生了 ${errors.length} 个错误`, {
      code: 'AGGREGATED_ERROR',
      context: {
        errorCount: errors.length,
        errorCodes: errors.map(e => e.code)
      },
      recoverable: errors.every(e => e.recoverable)
    });
    this.errors = errors;
  }

  format(): string {
    const lines: string[] = [`发生了 ${this.errors.length} 个错误:`];

    for (let i = 0; i < this.errors.length; i++) {
      lines.push(`\n[${i + 1}] ${this.errors[i].format()}`);
    }

    return lines.join('\n');
  }
}

/**
 * 安全执行函数，捕获错误并返回结果或错误
 */
export async function safeExecute<T>(
  fn: () => Promise<T>
): Promise<{ success: true; data: T } | { success: false; error: SQLZenError }> {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: wrapError(error) };
  }
}

/**
 * 检查错误是否为特定类型
 */
export function isErrorType<T extends SQLZenError>(
  error: unknown,
  errorClass: new (...args: any[]) => T
): error is T {
  return error instanceof errorClass;
}

/**
 * 格式化错误用于日志
 */
export function formatErrorForLog(error: unknown): string {
  if (error instanceof SQLZenError) {
    return JSON.stringify(error.toJSON(), null, 2);
  }

  if (error instanceof Error) {
    return JSON.stringify({
      name: error.name,
      message: error.message,
      stack: error.stack
    }, null, 2);
  }

  return String(error);
}
