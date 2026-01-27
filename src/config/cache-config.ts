/**
 * 缓存配置加载器
 */

import { join } from 'path';
import { homedir } from 'os';

/**
 * 缓存配置
 */
export interface CacheConfig {
  enabled: boolean;
  ttl: number;
  maxSize: number;
  dbPath: string;
}

/**
 * 默认缓存配置
 */
export const DEFAULT_CACHE_CONFIG: CacheConfig = {
  enabled: true,
  ttl: 5 * 60 * 1000, // 5 分钟
  maxSize: 100,
  dbPath: join(homedir(), '.sql-zen', 'cache.db')
};

/**
 * 从环境变量加载缓存配置
 */
export function loadCacheConfig(): CacheConfig {
  const enabled = process.env.ENABLE_CACHE !== 'false';
  const ttl = parseInt(process.env.CACHE_TTL || '', 10) || DEFAULT_CACHE_CONFIG.ttl;
  const maxSize = parseInt(process.env.CACHE_MAX_SIZE || '', 10) || DEFAULT_CACHE_CONFIG.maxSize;
  const dbPath = process.env.CACHE_DB_PATH || DEFAULT_CACHE_CONFIG.dbPath;

  return {
    enabled,
    ttl,
    maxSize,
    dbPath
  };
}

/**
 * 验证缓存配置
 */
export function validateCacheConfig(config: CacheConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (config.ttl <= 0) {
    errors.push('TTL 必须大于 0');
  }

  if (config.maxSize <= 0) {
    errors.push('最大缓存条目数必须大于 0');
  }

  if (!config.dbPath) {
    errors.push('缓存数据库路径不能为空');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * 合并缓存配置
 */
export function mergeCacheConfig(
  base: CacheConfig,
  override: Partial<CacheConfig>
): CacheConfig {
  return {
    enabled: override.enabled ?? base.enabled,
    ttl: override.ttl ?? base.ttl,
    maxSize: override.maxSize ?? base.maxSize,
    dbPath: override.dbPath ?? base.dbPath
  };
}
