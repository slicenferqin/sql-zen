/**
 * 日志配置模块
 * 支持环境变量和默认配置
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

export interface LogConfig {
  level: LogLevel;
  pretty: boolean;
  file?: string;
  maxSize?: string;
  maxFiles?: number;
  includeTimestamp: boolean;
  includeHostname: boolean;
  jsonLogs: boolean;
}

export const DEFAULT_LOG_CONFIG: LogConfig = {
  level: 'info',
  pretty: process.env.NODE_ENV !== 'production',
  includeTimestamp: true,
  includeHostname: false,
  jsonLogs: false
};

/**
 * 从环境变量加载日志配置
 */
export function loadLogConfig(): LogConfig {
  const config: LogConfig = { ...DEFAULT_LOG_CONFIG };

  // LOG_LEVEL
  const level = process.env.LOG_LEVEL?.toLowerCase();
  if (level && isValidLogLevel(level)) {
    config.level = level;
  }

  // LOG_PRETTY
  if (process.env.LOG_PRETTY !== undefined) {
    config.pretty = process.env.LOG_PRETTY === 'true';
  }

  // LOG_FILE
  if (process.env.LOG_FILE) {
    config.file = process.env.LOG_FILE;
  }

  // LOG_MAX_SIZE
  if (process.env.LOG_MAX_SIZE) {
    config.maxSize = process.env.LOG_MAX_SIZE;
  }

  // LOG_MAX_FILES
  if (process.env.LOG_MAX_FILES) {
    const maxFiles = parseInt(process.env.LOG_MAX_FILES, 10);
    if (!isNaN(maxFiles) && maxFiles > 0) {
      config.maxFiles = maxFiles;
    }
  }

  // LOG_JSON
  if (process.env.LOG_JSON !== undefined) {
    config.jsonLogs = process.env.LOG_JSON === 'true';
  }

  return config;
}

/**
 * 验证日志级别是否有效
 */
export function isValidLogLevel(level: string): level is LogLevel {
  return ['debug', 'info', 'warn', 'error', 'silent'].includes(level);
}

/**
 * 将日志级别转换为 pino 级别数值
 */
export function logLevelToNumber(level: LogLevel): number {
  const levels: Record<LogLevel, number> = {
    debug: 20,
    info: 30,
    warn: 40,
    error: 50,
    silent: 100
  };
  return levels[level];
}
