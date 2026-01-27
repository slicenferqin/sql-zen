/**
 * SQL-Zen 缓存模块
 *
 * 导出缓存管理器和工具函数
 */

// 接口和类型
export type {
  CacheManager,
  CacheEntry,
  CacheStats,
  CacheConfig
} from './cache-manager.js';

// SQLite 实现
export { SQLiteCacheManager } from './sqlite-cache-manager.js';

// 工具函数
export {
  generateCacheKey,
  normalizeQuery,
  isExpired,
  calculateExpiresAt,
  formatCacheStats,
  formatBytes,
  estimateStringSize,
  estimateCacheEntrySize
} from './utils.js';
