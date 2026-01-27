/**
 * 数据库相关错误类
 */

import { SQLZenError, SQLZenErrorOptions } from './base.js';

/**
 * 数据库错误基类
 */
export class DatabaseError extends SQLZenError {
  constructor(message: string, options: SQLZenErrorOptions = {}) {
    super(message, {
      code: options.code || 'DATABASE_ERROR',
      ...options
    });
  }
}

/**
 * 数据库连接错误
 */
export class DatabaseConnectionError extends DatabaseError {
  constructor(message: string, options: SQLZenErrorOptions = {}) {
    super(message, {
      code: 'DATABASE_CONNECTION_ERROR',
      suggestions: options.suggestions || [
        '检查数据库服务是否正在运行',
        '验证连接参数（主机、端口、用户名、密码）是否正确',
        '检查网络连接和防火墙设置',
        '确认数据库用户有足够的权限'
      ],
      recoverable: true,
      ...options
    });
  }
}

/**
 * 数据库查询执行错误
 */
export class DatabaseQueryError extends DatabaseError {
  public readonly sql?: string;

  constructor(message: string, options: SQLZenErrorOptions & { sql?: string } = {}) {
    super(message, {
      code: 'DATABASE_QUERY_ERROR',
      context: {
        ...options.context,
        sql: options.sql
      },
      suggestions: options.suggestions || [
        '检查 SQL 语法是否正确',
        '验证表名和列名是否存在',
        '确认数据类型是否匹配'
      ],
      recoverable: true,
      ...options
    });
    this.sql = options.sql;
  }
}

/**
 * 数据库未连接错误
 */
export class DatabaseNotConnectedError extends DatabaseError {
  constructor(options: SQLZenErrorOptions = {}) {
    super('数据库未连接', {
      code: 'DATABASE_NOT_CONNECTED',
      suggestions: options.suggestions || [
        '在执行查询前先调用 connect() 方法',
        '检查数据库配置是否正确',
        '确认数据库服务是否可用'
      ],
      recoverable: true,
      ...options
    });
  }
}

/**
 * 数据库配置错误
 */
export class DatabaseConfigError extends DatabaseError {
  constructor(message: string, options: SQLZenErrorOptions = {}) {
    super(message, {
      code: 'DATABASE_CONFIG_ERROR',
      suggestions: options.suggestions || [
        '检查 .env 文件中的数据库配置',
        '确认所有必需的配置项都已设置',
        '验证配置值的格式是否正确'
      ],
      recoverable: true,
      ...options
    });
  }
}
