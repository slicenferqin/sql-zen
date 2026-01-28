/**
 * 性能优化配置
 */

export interface PerformanceConfig {
  // 查询限制
  query: {
    maxRows: number;           // 最大返回行数
    defaultLimit: number;      // 默认 LIMIT
    timeout: number;           // 查询超时（毫秒）
  };

  // 连接池配置
  connectionPool: {
    minConnections: number;    // 最小连接数
    maxConnections: number;    // 最大连接数
    acquireTimeout: number;    // 获取连接超时（毫秒）
    idleTimeout: number;       // 空闲连接超时（毫秒）
  };

  // API 重试配置
  api: {
    maxRetries: number;        // 最大重试次数
    baseDelay: number;         // 基础延迟（毫秒）
    maxDelay: number;          // 最大延迟（毫秒）
    timeout: number;           // API 超时（毫秒）
  };

  // 消息历史配置
  messageHistory: {
    maxMessages: number;       // 最大消息数
    preserveSystemMessage: boolean;  // 保留系统消息
  };

  // Schema 缓存配置
  schemaCache: {
    enabled: boolean;          // 是否启用
    ttl: number;               // 缓存 TTL（毫秒）
    maxSize: number;           // 最大缓存条目数
  };
}

export const DEFAULT_PERFORMANCE_CONFIG: PerformanceConfig = {
  query: {
    maxRows: 10000,
    defaultLimit: 100,
    timeout: 30000  // 30 秒
  },
  connectionPool: {
    minConnections: 2,
    maxConnections: 10,
    acquireTimeout: 10000,  // 10 秒
    idleTimeout: 60000      // 1 分钟
  },
  api: {
    maxRetries: 3,
    baseDelay: 1000,        // 1 秒
    maxDelay: 10000,        // 10 秒
    timeout: 60000          // 1 分钟
  },
  messageHistory: {
    maxMessages: 20,
    preserveSystemMessage: true
  },
  schemaCache: {
    enabled: true,
    ttl: 60000,             // 1 分钟
    maxSize: 100
  }
};

/**
 * 从环境变量加载性能配置
 */
export function loadPerformanceConfig(): PerformanceConfig {
  const config = { ...DEFAULT_PERFORMANCE_CONFIG };

  // 查询配置
  if (process.env.QUERY_MAX_ROWS) {
    config.query.maxRows = parseInt(process.env.QUERY_MAX_ROWS, 10);
  }
  if (process.env.QUERY_DEFAULT_LIMIT) {
    config.query.defaultLimit = parseInt(process.env.QUERY_DEFAULT_LIMIT, 10);
  }
  if (process.env.QUERY_TIMEOUT) {
    config.query.timeout = parseInt(process.env.QUERY_TIMEOUT, 10);
  }

  // 连接池配置
  if (process.env.DB_POOL_MIN) {
    config.connectionPool.minConnections = parseInt(process.env.DB_POOL_MIN, 10);
  }
  if (process.env.DB_POOL_MAX) {
    config.connectionPool.maxConnections = parseInt(process.env.DB_POOL_MAX, 10);
  }

  // API 配置
  if (process.env.API_MAX_RETRIES) {
    config.api.maxRetries = parseInt(process.env.API_MAX_RETRIES, 10);
  }
  if (process.env.API_TIMEOUT) {
    config.api.timeout = parseInt(process.env.API_TIMEOUT, 10);
  }

  // 消息历史配置
  if (process.env.MAX_MESSAGES) {
    config.messageHistory.maxMessages = parseInt(process.env.MAX_MESSAGES, 10);
  }

  // Schema 缓存配置
  if (process.env.SCHEMA_CACHE_ENABLED) {
    config.schemaCache.enabled = process.env.SCHEMA_CACHE_ENABLED === 'true';
  }
  if (process.env.SCHEMA_CACHE_TTL) {
    config.schemaCache.ttl = parseInt(process.env.SCHEMA_CACHE_TTL, 10);
  }

  return config;
}
