/**
 * Schema 缓存模块
 * 提供内存缓存和哈希索引，避免重复文件 I/O
 */

import { getLogger, type Logger } from '../logging/index.js';
import type { SchemaConfig, Cube } from '../types/index.js';

export interface SchemaCacheConfig {
  enabled: boolean;
  ttl: number;
  maxSize: number;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

interface MetricEntry {
  metric: any;
  cube: Cube;
}

interface DimensionEntry {
  dimension: any;
  cube: Cube;
}

interface FilterEntry {
  filter: any;
  cube: Cube;
}

/**
 * Schema 缓存管理器
 */
export class SchemaCache {
  private schemaCache: Map<string, CacheEntry<SchemaConfig>> = new Map();
  private cubesCache: Map<string, CacheEntry<Cube[]>> = new Map();
  private metricIndex: Map<string, MetricEntry> = new Map();
  private dimensionIndex: Map<string, DimensionEntry> = new Map();
  private filterIndex: Map<string, FilterEntry> = new Map();
  private config: SchemaCacheConfig;
  private logger: Logger;

  constructor(config: Partial<SchemaCacheConfig> = {}) {
    this.config = {
      enabled: config.enabled ?? true,
      ttl: config.ttl ?? 60000,
      maxSize: config.maxSize ?? 100
    };
    this.logger = getLogger().child({ module: 'schema-cache' });
  }

  /**
   * 检查缓存是否有效
   */
  private isValid<T>(entry: CacheEntry<T> | undefined): boolean {
    if (!entry) return false;
    return Date.now() - entry.timestamp < this.config.ttl;
  }

  /**
   * 获取缓存的 Schema
   */
  getSchema(key: string): SchemaConfig | undefined {
    if (!this.config.enabled) return undefined;

    const entry = this.schemaCache.get(key);
    if (this.isValid(entry)) {
      this.logger.debug('Schema cache hit', { key });
      return entry!.data;
    }

    this.logger.debug('Schema cache miss', { key });
    return undefined;
  }

  /**
   * 设置 Schema 缓存
   */
  setSchema(key: string, schema: SchemaConfig): void {
    if (!this.config.enabled) return;

    // 检查缓存大小
    if (this.schemaCache.size >= this.config.maxSize) {
      this.evictOldest(this.schemaCache);
    }

    this.schemaCache.set(key, {
      data: schema,
      timestamp: Date.now()
    });

    this.logger.debug('Schema cached', { key });
  }

  /**
   * 获取缓存的 Cubes
   */
  getCubes(key: string): Cube[] | undefined {
    if (!this.config.enabled) return undefined;

    const entry = this.cubesCache.get(key);
    if (this.isValid(entry)) {
      this.logger.debug('Cubes cache hit', { key });
      return entry!.data;
    }

    this.logger.debug('Cubes cache miss', { key });
    return undefined;
  }

  /**
   * 设置 Cubes 缓存并构建索引
   */
  setCubes(key: string, cubes: Cube[]): void {
    if (!this.config.enabled) return;

    // 检查缓存大小
    if (this.cubesCache.size >= this.config.maxSize) {
      this.evictOldest(this.cubesCache);
    }

    this.cubesCache.set(key, {
      data: cubes,
      timestamp: Date.now()
    });

    // 构建索引
    this.buildIndex(cubes);

    this.logger.debug('Cubes cached and indexed', {
      key,
      cubeCount: cubes.length,
      metricCount: this.metricIndex.size,
      dimensionCount: this.dimensionIndex.size,
      filterCount: this.filterIndex.size
    });
  }

  /**
   * 构建哈希索引
   */
  private buildIndex(cubes: Cube[]): void {
    // 清空旧索引
    this.metricIndex.clear();
    this.dimensionIndex.clear();
    this.filterIndex.clear();

    for (const cube of cubes) {
      // 索引 metrics
      for (const metric of cube.metrics) {
        this.metricIndex.set(metric.name, { metric, cube });
      }

      // 索引 dimensions
      for (const dimension of cube.dimensions) {
        this.dimensionIndex.set(dimension.name, { dimension, cube });
      }

      // 索引 filters
      if (cube.filters) {
        for (const filter of cube.filters) {
          this.filterIndex.set(filter.name, { filter, cube });
        }
      }
    }
  }

  /**
   * O(1) 查找 metric
   */
  findMetric(name: string): MetricEntry | undefined {
    return this.metricIndex.get(name);
  }

  /**
   * O(1) 查找 dimension
   */
  findDimension(name: string): DimensionEntry | undefined {
    return this.dimensionIndex.get(name);
  }

  /**
   * O(1) 查找 filter
   */
  findFilter(name: string): FilterEntry | undefined {
    return this.filterIndex.get(name);
  }

  /**
   * 驱逐最旧的缓存条目
   */
  private evictOldest<T>(cache: Map<string, CacheEntry<T>>): void {
    let oldestKey: string | undefined;
    let oldestTime = Infinity;

    for (const [key, entry] of cache) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      cache.delete(oldestKey);
      this.logger.debug('Cache entry evicted', { key: oldestKey });
    }
  }

  /**
   * 使指定 key 的缓存失效
   */
  invalidate(key: string): void {
    this.schemaCache.delete(key);
    this.cubesCache.delete(key);
    this.logger.debug('Cache invalidated', { key });
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.schemaCache.clear();
    this.cubesCache.clear();
    this.metricIndex.clear();
    this.dimensionIndex.clear();
    this.filterIndex.clear();
    this.logger.debug('All caches cleared');
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): {
    schemaCount: number;
    cubesCount: number;
    metricIndexSize: number;
    dimensionIndexSize: number;
    filterIndexSize: number;
  } {
    return {
      schemaCount: this.schemaCache.size,
      cubesCount: this.cubesCache.size,
      metricIndexSize: this.metricIndex.size,
      dimensionIndexSize: this.dimensionIndex.size,
      filterIndexSize: this.filterIndex.size
    };
  }
}

// 全局 Schema 缓存实例
let globalSchemaCache: SchemaCache | null = null;

/**
 * 获取全局 Schema 缓存实例
 */
export function getSchemaCache(config?: Partial<SchemaCacheConfig>): SchemaCache {
  if (!globalSchemaCache) {
    globalSchemaCache = new SchemaCache(config);
  }
  return globalSchemaCache;
}

/**
 * 重置全局 Schema 缓存
 */
export function resetSchemaCache(): void {
  if (globalSchemaCache) {
    globalSchemaCache.clear();
  }
  globalSchemaCache = null;
}
