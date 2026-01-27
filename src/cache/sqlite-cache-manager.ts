/**
 * SQLite 缓存管理器实现
 */

import Database from 'better-sqlite3';
import { mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';
import type { CacheManager, CacheEntry, CacheStats, CacheConfig } from './cache-manager.js';
import { DEFAULT_CACHE_CONFIG } from '../config/cache-config.js';

/**
 * SQLite 缓存管理器
 */
export class SQLiteCacheManager implements CacheManager {
  private db: Database.Database | null = null;
  private config: CacheConfig;
  private initialized: boolean = false;
  private totalHits: number = 0;
  private totalMisses: number = 0;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      ...DEFAULT_CACHE_CONFIG,
      ...config
    };
  }

  /**
   * 初始化缓存数据库
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // 确保目录存在
    const dir = dirname(this.config.dbPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    // 打开数据库
    this.db = new Database(this.config.dbPath);

    // 启用 WAL 模式以支持并发
    this.db.pragma('journal_mode = WAL');

    // 创建表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS query_cache (
        query_hash TEXT PRIMARY KEY,
        query TEXT NOT NULL,
        result TEXT NOT NULL,
        sql_executed TEXT,
        created_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        hit_count INTEGER DEFAULT 0,
        last_accessed_at INTEGER
      );

      CREATE INDEX IF NOT EXISTS idx_expires_at ON query_cache(expires_at);
      CREATE INDEX IF NOT EXISTS idx_last_accessed ON query_cache(last_accessed_at);

      CREATE TABLE IF NOT EXISTS cache_stats (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        total_hits INTEGER DEFAULT 0,
        total_misses INTEGER DEFAULT 0
      );

      INSERT OR IGNORE INTO cache_stats (id, total_hits, total_misses) VALUES (1, 0, 0);
    `);

    // 加载统计信息
    const stats = this.db.prepare('SELECT total_hits, total_misses FROM cache_stats WHERE id = 1').get() as any;
    if (stats) {
      this.totalHits = stats.total_hits;
      this.totalMisses = stats.total_misses;
    }

    this.initialized = true;
  }

  /**
   * 获取缓存条目
   */
  async get(queryHash: string): Promise<CacheEntry | null> {
    this.ensureInitialized();

    const row = this.db!.prepare(`
      SELECT * FROM query_cache WHERE query_hash = ?
    `).get(queryHash) as any;

    if (!row) {
      this.totalMisses++;
      this.updateStats();
      return null;
    }

    // 检查是否过期
    if (row.expires_at < Date.now()) {
      // 删除过期条目
      this.db!.prepare('DELETE FROM query_cache WHERE query_hash = ?').run(queryHash);
      this.totalMisses++;
      this.updateStats();
      return null;
    }

    // 更新命中计数和最后访问时间
    this.db!.prepare(`
      UPDATE query_cache
      SET hit_count = hit_count + 1, last_accessed_at = ?
      WHERE query_hash = ?
    `).run(Date.now(), queryHash);

    this.totalHits++;
    this.updateStats();

    return {
      queryHash: row.query_hash,
      query: row.query,
      result: row.result,
      sqlExecuted: row.sql_executed ? JSON.parse(row.sql_executed) : undefined,
      createdAt: new Date(row.created_at),
      expiresAt: new Date(row.expires_at),
      hitCount: row.hit_count + 1,
      lastAccessedAt: new Date()
    };
  }

  /**
   * 设置缓存条目
   */
  async set(entry: Omit<CacheEntry, 'hitCount' | 'lastAccessedAt'>): Promise<void> {
    this.ensureInitialized();

    // 检查是否需要驱逐旧条目
    await this.evictIfNeeded();

    this.db!.prepare(`
      INSERT OR REPLACE INTO query_cache
      (query_hash, query, result, sql_executed, created_at, expires_at, hit_count, last_accessed_at)
      VALUES (?, ?, ?, ?, ?, ?, 0, ?)
    `).run(
      entry.queryHash,
      entry.query,
      entry.result,
      entry.sqlExecuted ? JSON.stringify(entry.sqlExecuted) : null,
      entry.createdAt.getTime(),
      entry.expiresAt.getTime(),
      Date.now()
    );
  }

  /**
   * 清空所有缓存
   */
  async clear(): Promise<void> {
    this.ensureInitialized();

    this.db!.exec('DELETE FROM query_cache');
    this.totalHits = 0;
    this.totalMisses = 0;
    this.updateStats();
  }

  /**
   * 清理过期缓存
   */
  async clearExpired(): Promise<number> {
    this.ensureInitialized();

    const result = this.db!.prepare(`
      DELETE FROM query_cache WHERE expires_at < ?
    `).run(Date.now());

    return result.changes;
  }

  /**
   * 获取缓存统计信息
   */
  async getStats(): Promise<CacheStats> {
    this.ensureInitialized();

    const countResult = this.db!.prepare('SELECT COUNT(*) as count FROM query_cache').get() as any;
    const totalEntries = countResult?.count || 0;

    const oldestResult = this.db!.prepare('SELECT MIN(created_at) as oldest FROM query_cache').get() as any;
    const newestResult = this.db!.prepare('SELECT MAX(created_at) as newest FROM query_cache').get() as any;

    // 估算总大小
    const sizeResult = this.db!.prepare(`
      SELECT SUM(LENGTH(query) + LENGTH(result) + COALESCE(LENGTH(sql_executed), 0)) as total_size
      FROM query_cache
    `).get() as any;

    const totalRequests = this.totalHits + this.totalMisses;
    const hitRate = totalRequests > 0 ? this.totalHits / totalRequests : 0;

    return {
      totalEntries,
      totalHits: this.totalHits,
      totalMisses: this.totalMisses,
      hitRate,
      oldestEntry: oldestResult?.oldest ? new Date(oldestResult.oldest) : undefined,
      newestEntry: newestResult?.newest ? new Date(newestResult.newest) : undefined,
      totalSize: sizeResult?.total_size || 0
    };
  }

  /**
   * 关闭缓存连接
   */
  async close(): Promise<void> {
    if (this.db) {
      this.updateStats();
      this.db.close();
      this.db = null;
      this.initialized = false;
    }
  }

  /**
   * 检查缓存是否已初始化
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * 确保已初始化
   */
  private ensureInitialized(): void {
    if (!this.initialized || !this.db) {
      throw new Error('缓存管理器未初始化，请先调用 initialize()');
    }
  }

  /**
   * 更新统计信息到数据库
   */
  private updateStats(): void {
    if (this.db) {
      this.db.prepare(`
        UPDATE cache_stats SET total_hits = ?, total_misses = ? WHERE id = 1
      `).run(this.totalHits, this.totalMisses);
    }
  }

  /**
   * 如果需要则驱逐旧条目（LRU）
   */
  private async evictIfNeeded(): Promise<void> {
    const countResult = this.db!.prepare('SELECT COUNT(*) as count FROM query_cache').get() as any;
    const currentCount = countResult?.count || 0;

    if (currentCount >= this.config.maxSize) {
      // 先清理过期条目
      await this.clearExpired();

      // 如果仍然超过限制，删除最久未访问的条目
      const newCountResult = this.db!.prepare('SELECT COUNT(*) as count FROM query_cache').get() as any;
      const newCount = newCountResult?.count || 0;

      if (newCount >= this.config.maxSize) {
        // 删除最久未访问的 10% 条目
        const toDelete = Math.max(1, Math.floor(this.config.maxSize * 0.1));
        this.db!.prepare(`
          DELETE FROM query_cache
          WHERE query_hash IN (
            SELECT query_hash FROM query_cache
            ORDER BY last_accessed_at ASC
            LIMIT ?
          )
        `).run(toDelete);
      }
    }
  }
}
