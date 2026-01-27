/**
 * SQL-Zen 统一错误处理基础类
 */

export interface SQLZenErrorOptions {
  code?: string;
  context?: Record<string, unknown>;
  cause?: Error;
  suggestions?: string[];
  recoverable?: boolean;
}

/**
 * SQL-Zen 基础错误类
 * 所有自定义错误类都继承自此类
 */
export abstract class SQLZenError extends Error {
  public readonly code: string;
  public readonly context?: Record<string, unknown>;
  public readonly cause?: Error;
  public readonly suggestions?: string[];
  public readonly recoverable: boolean;
  public readonly timestamp: Date;

  constructor(message: string, options: SQLZenErrorOptions = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = options.code || 'UNKNOWN_ERROR';
    this.context = options.context;
    this.cause = options.cause;
    this.suggestions = options.suggestions;
    this.recoverable = options.recoverable ?? false;
    this.timestamp = new Date();

    // 保持正确的原型链
    Object.setPrototypeOf(this, new.target.prototype);

    // 捕获堆栈跟踪
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * 格式化错误信息用于 CLI 显示
   */
  format(): string {
    const lines: string[] = [];

    lines.push(`错误: ${this.message}`);
    lines.push(`错误码: ${this.code}`);

    if (this.context && Object.keys(this.context).length > 0) {
      lines.push('上下文:');
      for (const [key, value] of Object.entries(this.context)) {
        lines.push(`  ${key}: ${JSON.stringify(value)}`);
      }
    }

    if (this.suggestions && this.suggestions.length > 0) {
      lines.push('建议:');
      for (const suggestion of this.suggestions) {
        lines.push(`  - ${suggestion}`);
      }
    }

    if (this.cause) {
      lines.push(`原因: ${this.cause.message}`);
    }

    return lines.join('\n');
  }

  /**
   * 转换为 JSON 格式用于 API 响应
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      context: this.context,
      suggestions: this.suggestions,
      recoverable: this.recoverable,
      timestamp: this.timestamp.toISOString(),
      cause: this.cause ? {
        name: this.cause.name,
        message: this.cause.message
      } : undefined
    };
  }

  /**
   * 检查是否为特定错误类型
   */
  static isInstance(error: unknown): error is SQLZenError {
    return error instanceof SQLZenError;
  }
}
