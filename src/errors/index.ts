/**
 * SQL-Zen 统一错误处理模块
 *
 * 导出所有错误类和工具函数
 */

// 基础错误类
export { SQLZenError, SQLZenErrorOptions } from './base.js';

// 数据库错误
export {
  DatabaseError,
  DatabaseConnectionError,
  DatabaseQueryError,
  DatabaseNotConnectedError,
  DatabaseConfigError
} from './database.js';

// Schema 错误
export {
  SchemaError,
  SchemaParseError,
  CubeParseError,
  SchemaValidationError
} from './schema.js';

// API 错误
export {
  APIError,
  APIKeyMissingError,
  APIRequestError,
  APIRateLimitError,
  ConfigurationError
} from './api.js';

// 工具错误
export {
  ToolError,
  ToolExecutionError,
  BashExecutionError,
  CommandNotAllowedError
} from './tool.js';

// 验证错误
export {
  ValidationError,
  RequiredFieldError,
  InvalidValueError,
  DuplicateValueError
} from './validation.js';

// 工具函数
export {
  wrapError,
  withRetry,
  RetryOptions,
  ErrorAggregator,
  AggregatedError,
  safeExecute,
  isErrorType,
  formatErrorForLog
} from './utils.js';
