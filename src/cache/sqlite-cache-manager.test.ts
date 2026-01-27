/**
 * SQLite 缓存管理器单元测试
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { SQLiteCacheManager } from './sqlite-cache-manager';
import { existsSync, rmSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('SQLiteCacheManager', () => {
  let cacheManager: SQLiteCacheManager;
  let testDbPath: string;

  beforeEach(() => {
    // 使用临时目录创建测试数据库
    const testDir = join(tmpdir(), 'sql-zen-test-' + Date.now());
    mkdirSync(testDir, { recursive: true });
    testDbPath = join(testDir, 'test-cache.db');

    cacheManager = new SQLiteCacheManager({
      enabled: true,
      ttl: 60000, // 1 分钟
      maxSize: 10,
      dbPath: testDbPath
    });
  });

  afterEach(async () => {
    if (cacheManager.isInitialized()) {
      await cacheManager.close();
    }
    // 清理测试文件
    if (existsSync(testDbPath)) {
      rmSync(testDbPath, { force: true });
    }
    if (existsSync(testDbPath + '-wal')) {
      rmSync(testDbPath + '-wal', { force: true });
    }
    if (existsSync(testDbPath + '-shm')) {
      rmSync(testDbPath + '-shm', { force: true });
    }
  });

  describe('initialize', () => {
    it('应该初始化缓存数据库', async () => {
      await cacheManager.initialize();

      expect(cacheManager.isInitialized()).toBe(true);
      expect(existsSync(testDbPath)).toBe(true);
    });

    it('应该在重复初始化时不报错', async () => {
      await cacheManager.initialize();
      await cacheManager.initialize();

      expect(cacheManager.isInitialized()).toBe(true);
    });
  });

  describe('set 和 get', () => {
    beforeEach(async () => {
      await cacheManager.initialize();
    });

    it('应该存储和获取缓存条目', async () => {
      const entry = {
        queryHash: 'test-hash-1',
        query: '有多少用户？',
        result: '共有 100 个用户',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 60000)
      };

      await cacheManager.set(entry);
      const cached = await cacheManager.get('test-hash-1');

      expect(cached).not.toBeNull();
      expect(cached?.query).toBe('有多少用户？');
      expect(cached?.result).toBe('共有 100 个用户');
      expect(cached?.hitCount).toBe(1);
    });

    it('应该存储带有 SQL 的条目', async () => {
      const entry = {
        queryHash: 'test-hash-2',
        query: '有多少用户？',
        result: '共有 100 个用户',
        sqlExecuted: ['SELECT COUNT(*) FROM users'],
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 60000)
      };

      await cacheManager.set(entry);
      const cached = await cacheManager.get('test-hash-2');

      expect(cached?.sqlExecuted).toEqual(['SELECT COUNT(*) FROM users']);
    });

    it('应该在缓存未命中时返回 null', async () => {
      const cached = await cacheManager.get('non-existent');

      expect(cached).toBeNull();
    });

    it('应该在缓存过期时返回 null', async () => {
      const entry = {
        queryHash: 'test-hash-expired',
        query: '过期查询',
        result: '结果',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() - 1000) // 已过期
      };

      await cacheManager.set(entry);
      const cached = await cacheManager.get('test-hash-expired');

      expect(cached).toBeNull();
    });

    it('应该更新命中计数', async () => {
      const entry = {
        queryHash: 'test-hash-hits',
        query: '测试查询',
        result: '结果',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 60000)
      };

      await cacheManager.set(entry);

      // 多次获取
      await cacheManager.get('test-hash-hits');
      await cacheManager.get('test-hash-hits');
      const cached = await cacheManager.get('test-hash-hits');

      expect(cached?.hitCount).toBe(3); // 3 次获取
    });
  });

  describe('clear', () => {
    beforeEach(async () => {
      await cacheManager.initialize();
    });

    it('应该清空所有缓存', async () => {
      // 添加一些条目
      for (let i = 0; i < 5; i++) {
        await cacheManager.set({
          queryHash: `hash-${i}`,
          query: `查询 ${i}`,
          result: `结果 ${i}`,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 60000)
        });
      }

      await cacheManager.clear();

      const stats = await cacheManager.getStats();
      expect(stats.totalEntries).toBe(0);
    });
  });

  describe('clearExpired', () => {
    beforeEach(async () => {
      await cacheManager.initialize();
    });

    it('应该清理过期条目', async () => {
      // 添加过期条目
      await cacheManager.set({
        queryHash: 'expired-1',
        query: '过期查询 1',
        result: '结果',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() - 1000)
      });

      // 添加未过期条目
      await cacheManager.set({
        queryHash: 'valid-1',
        query: '有效查询 1',
        result: '结果',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 60000)
      });

      const deleted = await cacheManager.clearExpired();

      expect(deleted).toBe(1);

      const stats = await cacheManager.getStats();
      expect(stats.totalEntries).toBe(1);
    });
  });

  describe('getStats', () => {
    beforeEach(async () => {
      await cacheManager.initialize();
    });

    it('应该返回正确的统计信息', async () => {
      // 添加条目
      await cacheManager.set({
        queryHash: 'stats-1',
        query: '查询 1',
        result: '结果 1',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 60000)
      });

      // 命中
      await cacheManager.get('stats-1');

      // 未命中
      await cacheManager.get('non-existent');

      const stats = await cacheManager.getStats();

      expect(stats.totalEntries).toBe(1);
      expect(stats.totalHits).toBeGreaterThanOrEqual(1);
      expect(stats.totalMisses).toBeGreaterThanOrEqual(1);
      expect(stats.hitRate).toBeGreaterThan(0);
      expect(stats.hitRate).toBeLessThan(1);
    });

    it('应该在空缓存时返回零值', async () => {
      const stats = await cacheManager.getStats();

      expect(stats.totalEntries).toBe(0);
      expect(stats.hitRate).toBe(0);
    });
  });

  describe('LRU 驱逐', () => {
    beforeEach(async () => {
      cacheManager = new SQLiteCacheManager({
        enabled: true,
        ttl: 60000,
        maxSize: 3, // 小容量以测试驱逐
        dbPath: testDbPath
      });
      await cacheManager.initialize();
    });

    it('应该在达到最大容量时驱逐旧条目', async () => {
      // 添加 3 个条目（达到最大容量）
      for (let i = 0; i < 3; i++) {
        await cacheManager.set({
          queryHash: `lru-${i}`,
          query: `查询 ${i}`,
          result: `结果 ${i}`,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 60000)
        });
      }

      // 访问第一个条目使其成为最近访问
      await cacheManager.get('lru-0');

      // 添加第 4 个条目，应该触发驱逐
      await cacheManager.set({
        queryHash: 'lru-3',
        query: '查询 3',
        result: '结果 3',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 60000)
      });

      const stats = await cacheManager.getStats();
      // 由于 LRU 驱逐，条目数应该不超过 maxSize
      expect(stats.totalEntries).toBeLessThanOrEqual(3);
    });
  });

  describe('close', () => {
    it('应该关闭数据库连接', async () => {
      await cacheManager.initialize();
      await cacheManager.close();

      expect(cacheManager.isInitialized()).toBe(false);
    });

    it('应该在未初始化时安全调用', async () => {
      await expect(cacheManager.close()).resolves.not.toThrow();
    });
  });

  describe('错误处理', () => {
    it('应该在未初始化时抛出错误', async () => {
      await expect(cacheManager.get('test')).rejects.toThrow('缓存管理器未初始化');
    });
  });
});
