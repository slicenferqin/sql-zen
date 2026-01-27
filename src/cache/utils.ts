/**
 * 缓存工具函数
 */

import { createHash } from 'crypto';

/**
 * 生成查询的缓存键
 * 使用 SHA-256 哈希归一化后的查询
 */
export function generateCacheKey(query: string): string {
  const normalized = normalizeQuery(query);
  return createHash('sha256').update(normalized).digest('hex');
}

/**
 * 归一化查询字符串
 * - 转换为小写
 * - 移除多余空白
 * - 移除首尾空白
 */
export function normalizeQuery(query: string): string {
  return query
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 检查缓存条目是否过期
 */
export function isExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt;
}

/**
 * 计算过期时间
 */
export function calculateExpiresAt(ttlMs: number): Date {
  return new Date(Date.now() + ttlMs);
}

/**
 * 格式化缓存统计信息用于显示
 */
export function formatCacheStats(stats: {
  totalEntries: number;
  totalHits: number;
  totalMisses: number;
  hitRate: number;
  oldestEntry?: Date;
  newestEntry?: Date;
  totalSize: number;
}): string {
  const lines: string[] = [];

  lines.push('缓存统计信息:');
  lines.push(`  总条目数: ${stats.totalEntries}`);
  lines.push(`  命中次数: ${stats.totalHits}`);
  lines.push(`  未命中次数: ${stats.totalMisses}`);
  lines.push(`  命中率: ${(stats.hitRate * 100).toFixed(2)}%`);

  if (stats.oldestEntry) {
    lines.push(`  最早条目: ${stats.oldestEntry.toLocaleString()}`);
  }

  if (stats.newestEntry) {
    lines.push(`  最新条目: ${stats.newestEntry.toLocaleString()}`);
  }

  lines.push(`  总大小: ${formatBytes(stats.totalSize)}`);

  return lines.join('\n');
}

/**
 * 格式化字节数
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${units[i]}`;
}

/**
 * 估算字符串大小（字节）
 */
export function estimateStringSize(str: string): number {
  // UTF-8 编码，每个字符平均 2 字节
  return Buffer.byteLength(str, 'utf8');
}

/**
 * 估算缓存条目大小
 */
export function estimateCacheEntrySize(entry: {
  query: string;
  result: string;
  sqlExecuted?: string[];
}): number {
  let size = estimateStringSize(entry.query);
  size += estimateStringSize(entry.result);

  if (entry.sqlExecuted) {
    for (const sql of entry.sqlExecuted) {
      size += estimateStringSize(sql);
    }
  }

  // 加上元数据的估算大小
  size += 100;

  return size;
}
