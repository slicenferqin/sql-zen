/**
 * Schema 缓存单元测试
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { SchemaCache, getSchemaCache, resetSchemaCache } from './schema-cache';
import type { SchemaConfig, Cube } from '../types/index.js';

describe('SchemaCache', () => {
  let cache: SchemaCache;

  beforeEach(() => {
    cache = new SchemaCache({ ttl: 1000, maxSize: 5 });
  });

  describe('Schema 缓存', () => {
    const mockSchema: SchemaConfig = {
      tables: [
        {
          name: 'users',
          description: 'Users table',
          columns: [
            { name: 'id', type: 'int', description: 'User ID', primary_key: true },
            { name: 'email', type: 'varchar', description: 'Email address' }
          ]
        }
      ]
    };

    it('应该缓存和检索 Schema', () => {
      cache.setSchema('key1', mockSchema);

      const result = cache.getSchema('key1');

      expect(result).toEqual(mockSchema);
    });

    it('应该在 key 不存在时返回 undefined', () => {
      const result = cache.getSchema('non-existent');

      expect(result).toBeUndefined();
    });

    it('应该在 TTL 过期后返回 undefined', async () => {
      const shortCache = new SchemaCache({ ttl: 50 });
      shortCache.setSchema('key1', mockSchema);

      // 等待 TTL 过期
      await new Promise(resolve => setTimeout(resolve, 60));

      const result = shortCache.getSchema('key1');

      expect(result).toBeUndefined();
    });

    it('应该在达到 maxSize 时驱逐最旧的条目', () => {
      const smallCache = new SchemaCache({ maxSize: 2 });

      smallCache.setSchema('key1', mockSchema);
      smallCache.setSchema('key2', mockSchema);
      smallCache.setSchema('key3', mockSchema);

      expect(smallCache.getSchema('key1')).toBeUndefined();
      expect(smallCache.getSchema('key2')).toBeDefined();
      expect(smallCache.getSchema('key3')).toBeDefined();
    });
  });

  describe('Cubes 缓存和索引', () => {
    const mockCubes: Cube[] = [
      {
        name: 'cube1',
        description: 'Cube 1',
        metrics: [
          { name: 'revenue', description: 'Total revenue', sql: 'SUM(amount)', type: 'sum' },
          { name: 'count', description: 'Total count', sql: 'COUNT(*)', type: 'count' }
        ],
        dimensions: [
          { name: 'time', description: 'Time dimension', column: 'created_at' }
        ],
        filters: [
          { name: 'last_30_days', sql: 'created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)', description: 'Last 30 days' }
        ]
      },
      {
        name: 'cube2',
        description: 'Cube 2',
        metrics: [
          { name: 'users', description: 'Total users', sql: 'COUNT(DISTINCT user_id)', type: 'count' }
        ],
        dimensions: [
          { name: 'geography', description: 'Geography dimension', column: 'country' }
        ],
        filters: []
      }
    ];

    it('应该缓存和检索 Cubes', () => {
      cache.setCubes('key1', mockCubes);

      const result = cache.getCubes('key1');

      expect(result).toEqual(mockCubes);
    });

    it('应该构建 metric 索引', () => {
      cache.setCubes('key1', mockCubes);

      const revenue = cache.findMetric('revenue');
      const users = cache.findMetric('users');
      const nonExistent = cache.findMetric('non-existent');

      expect(revenue).toBeDefined();
      expect(revenue!.metric.name).toBe('revenue');
      expect(revenue!.cube.name).toBe('cube1');

      expect(users).toBeDefined();
      expect(users!.metric.name).toBe('users');
      expect(users!.cube.name).toBe('cube2');

      expect(nonExistent).toBeUndefined();
    });

    it('应该构建 dimension 索引', () => {
      cache.setCubes('key1', mockCubes);

      const time = cache.findDimension('time');
      const geography = cache.findDimension('geography');
      const nonExistent = cache.findDimension('non-existent');

      expect(time).toBeDefined();
      expect(time!.dimension.name).toBe('time');
      expect(time!.cube.name).toBe('cube1');

      expect(geography).toBeDefined();
      expect(geography!.dimension.name).toBe('geography');
      expect(geography!.cube.name).toBe('cube2');

      expect(nonExistent).toBeUndefined();
    });

    it('应该构建 filter 索引', () => {
      cache.setCubes('key1', mockCubes);

      const last30Days = cache.findFilter('last_30_days');
      const nonExistent = cache.findFilter('non-existent');

      expect(last30Days).toBeDefined();
      expect(last30Days!.filter.name).toBe('last_30_days');
      expect(last30Days!.cube.name).toBe('cube1');

      expect(nonExistent).toBeUndefined();
    });

    it('应该更新索引当缓存更新时', () => {
      cache.setCubes('key1', mockCubes);

      const newCubes: Cube[] = [
        {
          name: 'cube3',
          description: 'Cube 3',
          metrics: [
            { name: 'new_metric', description: 'New metric', sql: 'SUM(value)', type: 'sum' }
          ],
          dimensions: [],
          filters: []
        }
      ];

      cache.setCubes('key1', newCubes);

      // 旧指标应该被清除
      expect(cache.findMetric('revenue')).toBeUndefined();

      // 新指标应该存在
      const newMetric = cache.findMetric('new_metric');
      expect(newMetric).toBeDefined();
      expect(newMetric!.cube.name).toBe('cube3');
    });
  });

  describe('缓存管理', () => {
    it('应该使指定 key 的缓存失效', () => {
      const mockSchema: SchemaConfig = { tables: [] };

      cache.setSchema('key1', mockSchema);
      cache.setSchema('key2', mockSchema);

      cache.invalidate('key1');

      expect(cache.getSchema('key1')).toBeUndefined();
      expect(cache.getSchema('key2')).toBeDefined();
    });

    it('应该清空所有缓存', () => {
      const mockSchema: SchemaConfig = { tables: [] };
      const mockCubes: Cube[] = [];

      cache.setSchema('key1', mockSchema);
      cache.setCubes('key2', mockCubes);

      cache.clear();

      expect(cache.getSchema('key1')).toBeUndefined();
      expect(cache.getCubes('key2')).toBeUndefined();
    });

    it('应该返回正确的缓存统计信息', () => {
      const mockSchema: SchemaConfig = { tables: [] };
      const mockCubes: Cube[] = [
        {
          name: 'cube1',
          description: 'Cube 1',
          metrics: [{ name: 'metric1', description: '', sql: '', type: 'sum' }],
          dimensions: [{ name: 'dim1', description: '', column: '' }],
          filters: [{ name: 'filter1', sql: '', description: '' }]
        }
      ];

      cache.setSchema('key1', mockSchema);
      cache.setCubes('key2', mockCubes);

      const stats = cache.getStats();

      expect(stats.schemaCount).toBe(1);
      expect(stats.cubesCount).toBe(1);
      expect(stats.metricIndexSize).toBe(1);
      expect(stats.dimensionIndexSize).toBe(1);
      expect(stats.filterIndexSize).toBe(1);
    });
  });

  describe('全局缓存实例', () => {
    afterEach(() => {
      resetSchemaCache();
    });

    it('应该返回单例实例', () => {
      const cache1 = getSchemaCache();
      const cache2 = getSchemaCache();

      expect(cache1).toBe(cache2);
    });

    it('应该重置全局实例', () => {
      const cache1 = getSchemaCache();
      cache1.setSchema('key1', { tables: [] });

      resetSchemaCache();

      const cache2 = getSchemaCache();
      expect(cache2.getSchema('key1')).toBeUndefined();
    });
  });

  describe('禁用缓存', () => {
    it('应该在禁用时不缓存 Schema', () => {
      const disabledCache = new SchemaCache({ enabled: false });
      const mockSchema: SchemaConfig = { tables: [] };

      disabledCache.setSchema('key1', mockSchema);

      const result = disabledCache.getSchema('key1');

      expect(result).toBeUndefined();
    });

    it('应该在禁用时不缓存 Cubes', () => {
      const disabledCache = new SchemaCache({ enabled: false });
      const mockCubes: Cube[] = [];

      disabledCache.setCubes('key1', mockCubes);

      const result = disabledCache.getCubes('key1');

      expect(result).toBeUndefined();
    });
  });
});
