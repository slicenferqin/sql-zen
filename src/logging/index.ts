/**
 * SQL-Zen 日志系统
 *
 * 提供生产级的日志和监控功能：
 * - 结构化日志（基于 pino）
 * - 性能监控
 * - 请求追踪
 *
 * @example
 * ```typescript
 * import { getLogger, getPerformanceMonitor } from './logging';
 *
 * const logger = getLogger();
 * logger.info('Query started', { query: 'SELECT * FROM users' });
 *
 * const monitor = getPerformanceMonitor();
 * const timer = monitor.startTimer();
 * // ... execute query
 * monitor.recordQueryTime(timer());
 * ```
 */

// Logger
export {
  Logger,
  LogContext,
  LoggerOptions,
  createLogger,
  getLogger,
  setLogLevel,
  configureLogger,
  resetLogger
} from './logger.js';

// Config
export {
  LogLevel,
  LogConfig,
  DEFAULT_LOG_CONFIG,
  loadLogConfig,
  isValidLogLevel
} from './config.js';

// Context
export {
  RequestContext,
  createRequestContext,
  getCurrentContext,
  runWithContext,
  runWithContextAsync,
  generateRequestId,
  getCurrentRequestId,
  getElapsedTime
} from './context.js';

// Performance
export {
  PerformanceMetrics,
  PerformanceSummary,
  PerformanceMonitor,
  getPerformanceMonitor,
  resetPerformanceMonitor
} from './performance.js';
