/**
 * Logger 模块
 * 基于 pino 的高性能日志系统
 */

import pino, { Logger as PinoLogger, LoggerOptions as PinoLoggerOptions } from 'pino';
import { LogConfig, LogLevel, loadLogConfig, isValidLogLevel } from './config.js';
import { getCurrentRequestId } from './context.js';

export interface LogContext {
  requestId?: string;
  operation?: string;
  duration?: number;
  [key: string]: unknown;
}

export interface Logger {
  debug(msg: string, context?: LogContext): void;
  info(msg: string, context?: LogContext): void;
  warn(msg: string, context?: LogContext): void;
  error(msg: string, context?: LogContext): void;
  child(bindings: Record<string, unknown>): Logger;
  startTimer(): () => number;
}

export interface LoggerOptions {
  level?: LogLevel;
  pretty?: boolean;
  file?: string;
  jsonLogs?: boolean;
  name?: string;
}

/**
 * 包装 pino logger 以符合我们的 Logger 接口
 */
class LoggerWrapper implements Logger {
  private pinoLogger: PinoLogger;

  constructor(pinoLogger: PinoLogger) {
    this.pinoLogger = pinoLogger;
  }

  private enrichContext(context?: LogContext): Record<string, unknown> {
    const enriched: Record<string, unknown> = { ...context };

    // 自动添加请求 ID（如果存在且未提供）
    if (!enriched.requestId) {
      const requestId = getCurrentRequestId();
      if (requestId) {
        enriched.requestId = requestId;
      }
    }

    return enriched;
  }

  debug(msg: string, context?: LogContext): void {
    this.pinoLogger.debug(this.enrichContext(context), msg);
  }

  info(msg: string, context?: LogContext): void {
    this.pinoLogger.info(this.enrichContext(context), msg);
  }

  warn(msg: string, context?: LogContext): void {
    this.pinoLogger.warn(this.enrichContext(context), msg);
  }

  error(msg: string, context?: LogContext): void {
    this.pinoLogger.error(this.enrichContext(context), msg);
  }

  child(bindings: Record<string, unknown>): Logger {
    return new LoggerWrapper(this.pinoLogger.child(bindings));
  }

  startTimer(): () => number {
    const start = Date.now();
    return () => Date.now() - start;
  }
}

// 全局 logger 实例
let globalLogger: Logger | null = null;
let globalConfig: LogConfig | null = null;

/**
 * 创建 pino 配置
 */
function createPinoConfig(config: LogConfig, options: LoggerOptions = {}): PinoLoggerOptions {
  const level = options.level || config.level;
  const pretty = options.pretty ?? config.pretty;
  const jsonLogs = options.jsonLogs ?? config.jsonLogs;

  const pinoConfig: PinoLoggerOptions = {
    level,
    timestamp: config.includeTimestamp ? pino.stdTimeFunctions.isoTime : false,
  };

  if (options.name) {
    pinoConfig.name = options.name;
  }

  // 如果需要 pretty 输出且不是强制 JSON
  if (pretty && !jsonLogs) {
    pinoConfig.transport = {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
        ignore: 'pid,hostname',
        messageFormat: '{msg}'
      }
    };
  }

  return pinoConfig;
}

/**
 * 创建新的 logger 实例
 */
export function createLogger(options: LoggerOptions = {}): Logger {
  const config = globalConfig || loadLogConfig();
  const pinoConfig = createPinoConfig(config, options);

  // 如果指定了文件输出
  if (options.file || config.file) {
    const filePath = options.file || config.file;
    const pinoLogger = pino(pinoConfig, pino.destination(filePath));
    return new LoggerWrapper(pinoLogger);
  }

  const pinoLogger = pino(pinoConfig);
  return new LoggerWrapper(pinoLogger);
}

/**
 * 获取全局 logger 实例
 */
export function getLogger(): Logger {
  if (!globalLogger) {
    globalLogger = createLogger();
  }
  return globalLogger;
}

/**
 * 设置全局日志级别
 */
export function setLogLevel(level: LogLevel): void {
  if (!isValidLogLevel(level)) {
    throw new Error(`Invalid log level: ${level}`);
  }

  if (!globalConfig) {
    globalConfig = loadLogConfig();
  }
  globalConfig.level = level;

  // 重新创建 logger
  globalLogger = createLogger({ level });
}

/**
 * 配置全局 logger
 */
export function configureLogger(options: LoggerOptions): void {
  if (!globalConfig) {
    globalConfig = loadLogConfig();
  }

  if (options.level) {
    globalConfig.level = options.level;
  }
  if (options.pretty !== undefined) {
    globalConfig.pretty = options.pretty;
  }
  if (options.jsonLogs !== undefined) {
    globalConfig.jsonLogs = options.jsonLogs;
  }
  if (options.file !== undefined) {
    globalConfig.file = options.file;
  }

  // 重新创建 logger
  globalLogger = createLogger(options);
}

/**
 * 重置全局 logger（主要用于测试）
 */
export function resetLogger(): void {
  globalLogger = null;
  globalConfig = null;
}
