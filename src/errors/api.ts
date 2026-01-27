/**
 * API 相关错误类
 */

import { SQLZenError, SQLZenErrorOptions } from './base.js';

/**
 * API 错误基类
 */
export class APIError extends SQLZenError {
  constructor(message: string, options: SQLZenErrorOptions = {}) {
    super(message, {
      code: options.code || 'API_ERROR',
      ...options
    });
  }
}

/**
 * API 密钥缺失错误
 */
export class APIKeyMissingError extends APIError {
  constructor(options: SQLZenErrorOptions = {}) {
    super('ANTHROPIC_API_KEY 环境变量未设置', {
      code: 'API_KEY_MISSING',
      suggestions: options.suggestions || [
        '在 .env 文件中设置 ANTHROPIC_API_KEY=sk-ant-...',
        '或通过命令行设置: export ANTHROPIC_API_KEY=sk-ant-...',
        '访问 https://console.anthropic.com 获取 API 密钥'
      ],
      recoverable: true,
      ...options
    });
  }
}

/**
 * API 请求错误
 */
export class APIRequestError extends APIError {
  public readonly statusCode?: number;
  public readonly endpoint?: string;

  constructor(
    message: string,
    options: SQLZenErrorOptions & { statusCode?: number; endpoint?: string } = {}
  ) {
    super(message, {
      code: 'API_REQUEST_ERROR',
      context: {
        ...options.context,
        statusCode: options.statusCode,
        endpoint: options.endpoint
      },
      suggestions: options.suggestions || [
        '检查网络连接是否正常',
        '验证 API 密钥是否有效',
        '确认 API 配额是否充足',
        '稍后重试请求'
      ],
      recoverable: true,
      ...options
    });
    this.statusCode = options.statusCode;
    this.endpoint = options.endpoint;
  }

  format(): string {
    const lines: string[] = [];

    lines.push(`API 请求错误: ${this.message}`);

    if (this.statusCode) {
      lines.push(`状态码: ${this.statusCode}`);
    }

    if (this.endpoint) {
      lines.push(`端点: ${this.endpoint}`);
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
 * API 速率限制错误
 */
export class APIRateLimitError extends APIError {
  public readonly retryAfter?: number;

  constructor(options: SQLZenErrorOptions & { retryAfter?: number } = {}) {
    super('API 请求频率超限', {
      code: 'API_RATE_LIMIT',
      context: {
        ...options.context,
        retryAfter: options.retryAfter
      },
      suggestions: options.suggestions || [
        options.retryAfter
          ? `等待 ${options.retryAfter} 秒后重试`
          : '稍后重试请求',
        '考虑启用查询缓存以减少 API 调用',
        '检查是否有重复的查询可以合并'
      ],
      recoverable: true,
      ...options
    });
    this.retryAfter = options.retryAfter;
  }
}

/**
 * 配置错误
 */
export class ConfigurationError extends APIError {
  public readonly configKey?: string;

  constructor(
    message: string,
    options: SQLZenErrorOptions & { configKey?: string } = {}
  ) {
    super(message, {
      code: 'CONFIGURATION_ERROR',
      context: {
        ...options.context,
        configKey: options.configKey
      },
      suggestions: options.suggestions || [
        '检查 .env 文件中的配置',
        '确认配置值的格式正确',
        '参考文档了解正确的配置方式'
      ],
      recoverable: true,
      ...options
    });
    this.configKey = options.configKey;
  }
}
