/**
 * 缓存管理器接口定义
 */

// 重新导出 CacheConfig
export type { CacheConfig } from '../config/cache-config.js';

/**
 * 缓存条目
 */
export interface CacheEntry {
  queryHash: string;
  query: string;
  result: string;
  sqlExecuted?: string[];
  createdAt: Date;
  expiresAt: Date;
  hitCount: number;
  lastAccessedAt: Date;
}

/**
 * 缓存统计信息
 */
export interface CacheStats {
  totalEntries: number;
  totalHits: number;
  totalMisses: number;
  hitRate: number;
  oldestEntry?: Date;
  newestEntry?: Date;
  totalSize: number;
}

/**
 * 缓存管理器接口
 */
export interface CacheManager {
  /**
   * 获取缓存条目
   */
  get(queryHash: string): Promise<CacheEntry | null>;

  /**
   * 设置缓存条目
   */
  set(entry: Omit<CacheEntry, 'hitCount' | 'lastAccessedAt'>): Promise<void>;

  /**
   * 清空所有缓存
   */
  clear(): Promise<void>;

  /**
   * 清理过期缓存
   */
  clearExpired(): Promise<number>;

  /**
   * 获取缓存统计信息
   */
  getStats(): Promise<CacheStats>;

  /**
   * 初始化缓存
   */
  initialize(): Promise<void>;

  /**
   * 关闭缓存连接
   */
  close(): Promise<void>;

  /**
   * 检查缓存是否已初始化
   */
  isInitialized(): boolean;
}
