/**
 * 缓存工具函数单元测试
 */

import { describe, it, expect } from '@jest/globals';
import {
  generateCacheKey,
  normalizeQuery,
  isExpired,
  calculateExpiresAt,
  formatCacheStats,
  formatBytes,
  estimateStringSize,
  estimateCacheEntrySize
} from './utils';

describe('generateCacheKey', () => {
  it('应该为相同查询生成相同的键', () => {
    const key1 = generateCacheKey('有多少用户？');
    const key2 = generateCacheKey('有多少用户？');

    expect(key1).toBe(key2);
  });

  it('应该为不同查询生成不同的键', () => {
    const key1 = generateCacheKey('有多少用户？');
    const key2 = generateCacheKey('有多少订单？');

    expect(key1).not.toBe(key2);
  });

  it('应该归一化后生成键（忽略大小写）', () => {
    const key1 = generateCacheKey('SELECT * FROM users');
    const key2 = generateCacheKey('select * from users');

    expect(key1).toBe(key2);
  });

  it('应该归一化后生成键（忽略多余空白）', () => {
    const key1 = generateCacheKey('有多少  用户？');
    const key2 = generateCacheKey('有多少 用户？');

    expect(key1).toBe(key2);
  });

  it('应该返回 64 字符的 SHA-256 哈希', () => {
    const key = generateCacheKey('测试查询');

    expect(key).toHaveLength(64);
    expect(/^[a-f0-9]+$/.test(key)).toBe(true);
  });
});

describe('normalizeQuery', () => {
  it('应该转换为小写', () => {
    expect(normalizeQuery('SELECT * FROM Users')).toBe('select * from users');
  });

  it('应该移除多余空白', () => {
    expect(normalizeQuery('有多少   用户？')).toBe('有多少 用户？');
  });

  it('应该移除首尾空白', () => {
    expect(normalizeQuery('  有多少用户？  ')).toBe('有多少用户？');
  });

  it('应该处理换行符', () => {
    expect(normalizeQuery('有多少\n用户？')).toBe('有多少 用户？');
  });
});

describe('isExpired', () => {
  it('应该在过期时返回 true', () => {
    const pastDate = new Date(Date.now() - 1000);
    expect(isExpired(pastDate)).toBe(true);
  });

  it('应该在未过期时返回 false', () => {
    const futureDate = new Date(Date.now() + 10000);
    expect(isExpired(futureDate)).toBe(false);
  });
});

describe('calculateExpiresAt', () => {
  it('应该计算正确的过期时间', () => {
    const ttl = 5000; // 5 秒
    const before = Date.now();
    const expiresAt = calculateExpiresAt(ttl);
    const after = Date.now();

    expect(expiresAt.getTime()).toBeGreaterThanOrEqual(before + ttl);
    expect(expiresAt.getTime()).toBeLessThanOrEqual(after + ttl);
  });
});

describe('formatCacheStats', () => {
  it('应该格式化缓存统计信息', () => {
    const stats = {
      totalEntries: 10,
      totalHits: 50,
      totalMisses: 20,
      hitRate: 0.714,
      oldestEntry: new Date('2024-01-01'),
      newestEntry: new Date('2024-01-15'),
      totalSize: 1024
    };

    const formatted = formatCacheStats(stats);

    expect(formatted).toContain('缓存统计信息');
    expect(formatted).toContain('总条目数: 10');
    expect(formatted).toContain('命中次数: 50');
    expect(formatted).toContain('未命中次数: 20');
    expect(formatted).toContain('71.40%');
    expect(formatted).toContain('1 KB');
  });

  it('应该处理没有条目的情况', () => {
    const stats = {
      totalEntries: 0,
      totalHits: 0,
      totalMisses: 0,
      hitRate: 0,
      totalSize: 0
    };

    const formatted = formatCacheStats(stats);

    expect(formatted).toContain('总条目数: 0');
    expect(formatted).toContain('0.00%');
  });
});

describe('formatBytes', () => {
  it('应该格式化字节', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(500)).toBe('500 B');
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(1048576)).toBe('1 MB');
    expect(formatBytes(1073741824)).toBe('1 GB');
  });
});

describe('estimateStringSize', () => {
  it('应该估算 ASCII 字符串大小', () => {
    const size = estimateStringSize('hello');
    expect(size).toBe(5);
  });

  it('应该估算中文字符串大小', () => {
    const size = estimateStringSize('你好');
    // UTF-8 中文字符通常是 3 字节
    expect(size).toBe(6);
  });
});

describe('estimateCacheEntrySize', () => {
  it('应该估算缓存条目大小', () => {
    const entry = {
      query: '有多少用户？',
      result: '共有 100 个用户',
      sqlExecuted: ['SELECT COUNT(*) FROM users']
    };

    const size = estimateCacheEntrySize(entry);

    // 应该包含所有字段的大小加上元数据
    expect(size).toBeGreaterThan(0);
  });

  it('应该处理没有 SQL 的情况', () => {
    const entry = {
      query: '有多少用户？',
      result: '共有 100 个用户'
    };

    const size = estimateCacheEntrySize(entry);

    expect(size).toBeGreaterThan(0);
  });
});
