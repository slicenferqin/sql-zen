/**
 * CubeParser 单元测试
 *
 * 测试 Cube Parser 的核心功能
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  parseCubeFile,
  parseCubesDirectory,
  validateCube,
  findMetricByName,
  findDimensionByName,
  findFilterByName,
  generateSqlFromMetric,
  CubeParseError,
} from './cube-parser';
import { promises as fs } from 'fs';
import yaml from 'js-yaml';

// Mock 模块
jest.mock('fs', () => ({
  promises: {
    readdir: jest.fn(),
    readFile: jest.fn(),
  },
}));

jest.mock('js-yaml');

describe('CubeParser', () => {
  let mockFs: any;
  let mockYaml: any;

  // 测试数据
  const validCubeData = {
    cube: 'business_metrics',
    description: 'Business metrics cube',
    dimensions: [
      {
        name: 'time',
        description: 'Time dimension',
        column: 'created_at',
        granularity: [
          { name: 'day', sql: 'DATE(created_at)', description: 'Daily' },
          { name: 'month', sql: 'DATE_FORMAT(created_at, "%Y-%m")', description: 'Monthly' },
        ],
      },
      {
        name: 'user_tier',
        description: 'User subscription tier',
        column: 'subscription_tier',
        enum: ['free', 'pro', 'enterprise'],
      },
    ],
    metrics: [
      {
        name: 'revenue',
        description: 'Total revenue',
        sql: 'SUM(amount)',
        type: 'sum',
        category: 'financial',
        unit: 'USD',
      },
      {
        name: 'order_count',
        description: 'Number of orders',
        sql: 'COUNT(*)',
        type: 'count',
      },
    ],
    filters: [
      {
        name: 'last_30_days',
        sql: 'created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)',
        description: 'Last 30 days',
        dimension: 'time',
      },
    ],
    joins: [
      {
        from: 'orders',
        to: 'users',
        type: 'inner',
        condition: 'orders.user_id = users.id',
        description: 'Orders to users',
      },
    ],
  };

  beforeEach(() => {
    mockFs = fs as any;
    mockYaml = yaml as any;
    jest.clearAllMocks();
  });

  describe('parseCubeFile', () => {
    it('应该成功解析有效的 Cube 文件', async () => {
      mockFs.readFile.mockResolvedValueOnce('cube: business_metrics');
      mockYaml.load.mockReturnValueOnce(validCubeData);

      const cube = await parseCubeFile('test.yaml');

      expect(cube.name).toBe('business_metrics');
      expect(cube.description).toBe('Business metrics cube');
      expect(cube.dimensions).toHaveLength(2);
      expect(cube.metrics).toHaveLength(2);
      expect(cube.filters).toHaveLength(1);
      expect(cube.joins).toHaveLength(1);
    });

    it('应该在缺少 cube 字段时抛出错误', async () => {
      const invalidData = { description: 'No cube field', dimensions: [], metrics: [] };

      mockFs.readFile.mockResolvedValueOnce('invalid');
      mockYaml.load.mockReturnValueOnce(invalidData);

      await expect(parseCubeFile('test.yaml')).rejects.toThrow(CubeParseError);
    });

    it('应该在缺少 dimensions 字段时抛出错误', async () => {
      const invalidData = { ...validCubeData };
      delete (invalidData as any).dimensions;

      mockFs.readFile.mockResolvedValueOnce('invalid');
      mockYaml.load.mockReturnValueOnce(invalidData);

      await expect(parseCubeFile('test.yaml')).rejects.toThrow('"dimensions" 字段缺失或无效（必须是数组）');
    });

    it('应该在 dimensions 不是数组时抛出错误', async () => {
      const invalidData = { ...validCubeData, dimensions: 'not an array' };

      mockFs.readFile.mockResolvedValueOnce('invalid');
      mockYaml.load.mockReturnValueOnce(invalidData);

      await expect(parseCubeFile('test.yaml')).rejects.toThrow('"dimensions" 字段缺失或无效（必须是数组）');
    });

    it('应该在缺少 metrics 字段时抛出错误', async () => {
      const invalidData = { ...validCubeData };
      delete (invalidData as any).metrics;

      mockFs.readFile.mockResolvedValueOnce('invalid');
      mockYaml.load.mockReturnValueOnce(invalidData);

      await expect(parseCubeFile('test.yaml')).rejects.toThrow('"metrics" 字段缺失或无效（必须是数组）');
    });

    it('应该在 metrics 不是数组时抛出错误', async () => {
      const invalidData = { ...validCubeData, metrics: 'not an array' };

      mockFs.readFile.mockResolvedValueOnce('invalid');
      mockYaml.load.mockReturnValueOnce(invalidData);

      await expect(parseCubeFile('test.yaml')).rejects.toThrow('"metrics" 字段缺失或无效（必须是数组）');
    });

    it('应该处理没有 filters 的 Cube', async () => {
      const dataWithoutFilters = { ...validCubeData };
      delete (dataWithoutFilters as any).filters;

      mockFs.readFile.mockResolvedValueOnce('cube');
      mockYaml.load.mockReturnValueOnce(dataWithoutFilters);

      const cube = await parseCubeFile('test.yaml');

      expect(cube.filters).toEqual([]);
    });

    it('应该处理没有 joins 的 Cube', async () => {
      const dataWithoutJoins = { ...validCubeData };
      delete (dataWithoutJoins as any).joins;

      mockFs.readFile.mockResolvedValueOnce('cube');
      mockYaml.load.mockReturnValueOnce(dataWithoutJoins);

      const cube = await parseCubeFile('test.yaml');

      expect(cube.joins).toEqual([]);
    });

    it('应该处理文件读取错误', async () => {
      mockFs.readFile.mockRejectedValueOnce(new Error('File not found'));

      await expect(parseCubeFile('test.yaml')).rejects.toThrow(CubeParseError);
      await expect(parseCubeFile('test.yaml')).rejects.toThrow('解析 Cube 文件失败:');
    });
  });

  describe('parseDimensions', () => {
    it('应该在维度缺少 name 时抛出错误', async () => {
      const invalidData = {
        ...validCubeData,
        dimensions: [{ description: 'No name', column: 'col' }],
      };

      mockFs.readFile.mockResolvedValueOnce('invalid');
      mockYaml.load.mockReturnValueOnce(invalidData);

      await expect(parseCubeFile('test.yaml')).rejects.toThrow('缺少 "name" 字段');
    });

    it('应该在维度缺少 description 时抛出错误', async () => {
      const invalidData = {
        ...validCubeData,
        dimensions: [{ name: 'test', column: 'col' }],
      };

      mockFs.readFile.mockResolvedValueOnce('invalid');
      mockYaml.load.mockReturnValueOnce(invalidData);

      await expect(parseCubeFile('test.yaml')).rejects.toThrow('缺少 "description" 字段');
    });

    it('应该在维度缺少 column 和 columns 时抛出错误', async () => {
      const invalidData = {
        ...validCubeData,
        dimensions: [{ name: 'test', description: 'Test dimension' }],
      };

      mockFs.readFile.mockResolvedValueOnce('invalid');
      mockYaml.load.mockReturnValueOnce(invalidData);

      await expect(parseCubeFile('test.yaml')).rejects.toThrow('必须有 "column" 或 "columns" 字段');
    });
  });

  describe('parseMetrics', () => {
    it('应该在度量缺少 name 时抛出错误', async () => {
      const invalidData = {
        ...validCubeData,
        metrics: [{ description: 'No name', sql: 'COUNT(*)', type: 'count' }],
      };

      mockFs.readFile.mockResolvedValueOnce('invalid');
      mockYaml.load.mockReturnValueOnce(invalidData);

      await expect(parseCubeFile('test.yaml')).rejects.toThrow('缺少 "name" 字段');
    });

    it('应该在度量缺少 description 时抛出错误', async () => {
      const invalidData = {
        ...validCubeData,
        metrics: [{ name: 'test', sql: 'COUNT(*)', type: 'count' }],
      };

      mockFs.readFile.mockResolvedValueOnce('invalid');
      mockYaml.load.mockReturnValueOnce(invalidData);

      await expect(parseCubeFile('test.yaml')).rejects.toThrow('缺少 "description" 字段');
    });

    it('应该在度量缺少 sql 时抛出错误', async () => {
      const invalidData = {
        ...validCubeData,
        metrics: [{ name: 'test', description: 'Test metric', type: 'count' }],
      };

      mockFs.readFile.mockResolvedValueOnce('invalid');
      mockYaml.load.mockReturnValueOnce(invalidData);

      await expect(parseCubeFile('test.yaml')).rejects.toThrow('缺少 "sql" 字段');
    });

    it('应该在度量缺少 type 时抛出错误', async () => {
      const invalidData = {
        ...validCubeData,
        metrics: [{ name: 'test', description: 'Test metric', sql: 'COUNT(*)' }],
      };

      mockFs.readFile.mockResolvedValueOnce('invalid');
      mockYaml.load.mockReturnValueOnce(invalidData);

      await expect(parseCubeFile('test.yaml')).rejects.toThrow('缺少 "type" 字段');
    });

    it('应该在度量 type 无效时抛出错误', async () => {
      const invalidData = {
        ...validCubeData,
        metrics: [{ name: 'test', description: 'Test metric', sql: 'COUNT(*)', type: 'invalid' }],
      };

      mockFs.readFile.mockResolvedValueOnce('invalid');
      mockYaml.load.mockReturnValueOnce(invalidData);

      await expect(parseCubeFile('test.yaml')).rejects.toThrow('的类型');
    });
  });

  describe('parseFilters', () => {
    it('应该在过滤器缺少 name 时抛出错误', async () => {
      const invalidData = {
        ...validCubeData,
        filters: [{ sql: 'WHERE 1=1', description: 'Test filter' }],
      };

      mockFs.readFile.mockResolvedValueOnce('invalid');
      mockYaml.load.mockReturnValueOnce(invalidData);

      await expect(parseCubeFile('test.yaml')).rejects.toThrow('缺少 "name" 字段');
    });

    it('应该在过滤器缺少 sql 时抛出错误', async () => {
      const invalidData = {
        ...validCubeData,
        filters: [{ name: 'test', description: 'Test filter' }],
      };

      mockFs.readFile.mockResolvedValueOnce('invalid');
      mockYaml.load.mockReturnValueOnce(invalidData);

      await expect(parseCubeFile('test.yaml')).rejects.toThrow('缺少 "sql" 字段');
    });

    it('应该在过滤器缺少 description 时抛出错误', async () => {
      const invalidData = {
        ...validCubeData,
        filters: [{ name: 'test', sql: 'WHERE 1=1' }],
      };

      mockFs.readFile.mockResolvedValueOnce('invalid');
      mockYaml.load.mockReturnValueOnce(invalidData);

      await expect(parseCubeFile('test.yaml')).rejects.toThrow('缺少 "description" 字段');
    });
  });

  describe('parseJoins', () => {
    it('应该在 JOIN 缺少 from 时抛出错误', async () => {
      const invalidData = {
        ...validCubeData,
        joins: [{ to: 'users', type: 'inner', condition: 'a.id = b.id' }],
      };

      mockFs.readFile.mockResolvedValueOnce('invalid');
      mockYaml.load.mockReturnValueOnce(invalidData);

      await expect(parseCubeFile('test.yaml')).rejects.toThrow('缺少 "from" 字段');
    });

    it('应该在 JOIN 缺少 to 时抛出错误', async () => {
      const invalidData = {
        ...validCubeData,
        joins: [{ from: 'orders', type: 'inner', condition: 'a.id = b.id' }],
      };

      mockFs.readFile.mockResolvedValueOnce('invalid');
      mockYaml.load.mockReturnValueOnce(invalidData);

      await expect(parseCubeFile('test.yaml')).rejects.toThrow('缺少 "to" 字段');
    });

    it('应该在 JOIN 缺少 type 时抛出错误', async () => {
      const invalidData = {
        ...validCubeData,
        joins: [{ from: 'orders', to: 'users', condition: 'a.id = b.id' }],
      };

      mockFs.readFile.mockResolvedValueOnce('invalid');
      mockYaml.load.mockReturnValueOnce(invalidData);

      await expect(parseCubeFile('test.yaml')).rejects.toThrow('缺少 "type" 字段');
    });

    it('应该在 JOIN 缺少 condition 时抛出错误', async () => {
      const invalidData = {
        ...validCubeData,
        joins: [{ from: 'orders', to: 'users', type: 'inner' }],
      };

      mockFs.readFile.mockResolvedValueOnce('invalid');
      mockYaml.load.mockReturnValueOnce(invalidData);

      await expect(parseCubeFile('test.yaml')).rejects.toThrow('缺少 "condition" 字段');
    });

    it('应该在 JOIN type 无效时抛出错误', async () => {
      const invalidData = {
        ...validCubeData,
        joins: [{ from: 'orders', to: 'users', type: 'invalid', condition: 'a.id = b.id' }],
      };

      mockFs.readFile.mockResolvedValueOnce('invalid');
      mockYaml.load.mockReturnValueOnce(invalidData);

      await expect(parseCubeFile('test.yaml')).rejects.toThrow('的类型');
    });
  });

  describe('parseCubesDirectory', () => {
    it('应该成功解析目录中的所有 Cube 文件', async () => {
      mockFs.readdir.mockResolvedValueOnce(['cube1.yaml', 'cube2.yml', 'README.md']);
      mockFs.readFile
        .mockResolvedValueOnce('cube1')
        .mockResolvedValueOnce('cube2');
      mockYaml.load
        .mockReturnValueOnce({ ...validCubeData, cube: 'cube1' })
        .mockReturnValueOnce({ ...validCubeData, cube: 'cube2' });

      const cubes = await parseCubesDirectory('/test/cubes');

      expect(cubes).toHaveLength(2);
      expect(cubes[0].name).toBe('cube1');
      expect(cubes[1].name).toBe('cube2');
    });

    it('应该跳过非 YAML 文件', async () => {
      mockFs.readdir.mockResolvedValueOnce(['cube1.yaml', 'README.md', 'config.json']);
      mockFs.readFile.mockResolvedValueOnce('cube1');
      mockYaml.load.mockReturnValueOnce(validCubeData);

      const cubes = await parseCubesDirectory('/test/cubes');

      expect(cubes).toHaveLength(1);
      expect(mockFs.readFile).toHaveBeenCalledTimes(1);
    });

    it('应该在 strict 模式下抛出解析错误', async () => {
      mockFs.readdir.mockResolvedValueOnce(['invalid.yaml']);
      mockFs.readFile.mockResolvedValueOnce('invalid');
      mockYaml.load.mockReturnValueOnce({ invalid: 'data' });

      await expect(parseCubesDirectory('/test/cubes', { strict: true })).rejects.toThrow(CubeParseError);
    });

    it('应该在非 strict 模式下跳过无效文件', async () => {
      mockFs.readdir.mockResolvedValueOnce(['invalid.yaml', 'valid.yaml']);
      mockFs.readFile
        .mockResolvedValueOnce('invalid')
        .mockResolvedValueOnce('valid');
      mockYaml.load
        .mockReturnValueOnce({ invalid: 'data' })
        .mockReturnValueOnce(validCubeData);

      const cubes = await parseCubesDirectory('/test/cubes', { strict: false });

      // 应该只返回有效的 cube，跳过无效的
      expect(cubes).toHaveLength(1);
      expect(cubes[0].name).toBe('business_metrics');
    });

    it('应该处理目录读取错误', async () => {
      mockFs.readdir.mockRejectedValueOnce(new Error('Permission denied'));

      await expect(parseCubesDirectory('/test/cubes')).rejects.toThrow(CubeParseError);
      await expect(parseCubesDirectory('/test/cubes')).rejects.toThrow('读取 Cubes 目录失败');
    });
  });

  describe('validateCube', () => {
    const validCube = {
      name: 'test_cube',
      description: 'Test cube',
      dimensions: [
        { name: 'dim1', description: 'Dimension 1', column: 'col1' },
      ],
      metrics: [
        { name: 'metric1', description: 'Metric 1', sql: 'COUNT(*)', type: 'count' },
      ],
    };

    it('应该验证有效的 Cube', async () => {
      const result = await validateCube(validCube as any);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('应该检测缺少 Cube 名称', async () => {
      const invalidCube = { ...validCube, name: '' };

      const result = await validateCube(invalidCube as any);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Cube name is required');
    });

    it('应该检测缺少维度', async () => {
      const invalidCube = { ...validCube, dimensions: [] };

      const result = await validateCube(invalidCube as any);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Cube must have at least one dimension');
    });

    it('应该检测重复的维度名称', async () => {
      const invalidCube = {
        ...validCube,
        dimensions: [
          { name: 'dim1', description: 'Dimension 1', column: 'col1' },
          { name: 'dim1', description: 'Duplicate', column: 'col2' },
        ],
      };

      const result = await validateCube(invalidCube as any);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Duplicate dimension name: dim1');
    });

    it('应该检测维度缺少列引用', async () => {
      const invalidCube = {
        ...validCube,
        dimensions: [
          { name: 'dim1', description: 'Dimension 1' },
        ],
      };

      const result = await validateCube(invalidCube as any);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Dimension "dim1" must have either "column" or "columns" field');
    });

    it('应该检测缺少度量', async () => {
      const invalidCube = { ...validCube, metrics: [] };

      const result = await validateCube(invalidCube as any);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Cube must have at least one metric');
    });

    it('应该检测重复的度量名称', async () => {
      const invalidCube = {
        ...validCube,
        metrics: [
          { name: 'metric1', description: 'Metric 1', sql: 'COUNT(*)', type: 'count' },
          { name: 'metric1', description: 'Duplicate', sql: 'SUM(x)', type: 'sum' },
        ],
      };

      const result = await validateCube(invalidCube as any);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Duplicate metric name: metric1');
    });

    it('应该检测度量缺少 SQL', async () => {
      const invalidCube = {
        ...validCube,
        metrics: [
          { name: 'metric1', description: 'Metric 1', sql: '', type: 'count' },
        ],
      };

      const result = await validateCube(invalidCube as any);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Metric "metric1" must have SQL expression');
    });

    it('应该检测重复的过滤器名称', async () => {
      const invalidCube = {
        ...validCube,
        filters: [
          { name: 'filter1', sql: 'WHERE 1=1', description: 'Filter 1' },
          { name: 'filter1', sql: 'WHERE 2=2', description: 'Duplicate' },
        ],
      };

      const result = await validateCube(invalidCube as any);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Duplicate filter name: filter1');
    });
  });

  describe('findMetricByName', () => {
    const cubes = [
      {
        name: 'cube1',
        metrics: [
          { name: 'revenue', sql: 'SUM(amount)', type: 'sum' },
        ],
      },
      {
        name: 'cube2',
        metrics: [
          { name: 'user_count', sql: 'COUNT(*)', type: 'count' },
        ],
      },
    ];

    it('应该找到存在的度量', () => {
      const result = findMetricByName(cubes as any, 'revenue');

      expect(result).toBeDefined();
      expect(result.metric.name).toBe('revenue');
      expect(result.cube.name).toBe('cube1');
    });

    it('应该在度量不存在时返回 undefined', () => {
      const result = findMetricByName(cubes as any, 'nonexistent');

      expect(result).toBeUndefined();
    });
  });

  describe('findDimensionByName', () => {
    const cubes = [
      {
        name: 'cube1',
        dimensions: [
          { name: 'time', column: 'created_at' },
        ],
      },
      {
        name: 'cube2',
        dimensions: [
          { name: 'geography', column: 'country' },
        ],
      },
    ];

    it('应该找到存在的维度', () => {
      const result = findDimensionByName(cubes as any, 'time');

      expect(result).toBeDefined();
      expect(result.dimension.name).toBe('time');
      expect(result.cube.name).toBe('cube1');
    });

    it('应该在维度不存在时返回 undefined', () => {
      const result = findDimensionByName(cubes as any, 'nonexistent');

      expect(result).toBeUndefined();
    });
  });

  describe('findFilterByName', () => {
    const cubes = [
      {
        name: 'cube1',
        filters: [
          { name: 'last_30_days', sql: 'WHERE date >= NOW() - 30' },
        ],
      },
      {
        name: 'cube2',
        filters: [
          { name: 'active_users', sql: 'WHERE status = "active"' },
        ],
      },
    ];

    it('应该找到存在的过滤器', () => {
      const result = findFilterByName(cubes as any, 'last_30_days');

      expect(result).toBeDefined();
      expect(result.filter.name).toBe('last_30_days');
      expect(result.cube.name).toBe('cube1');
    });

    it('应该在过滤器不存在时返回 undefined', () => {
      const result = findFilterByName(cubes as any, 'nonexistent');

      expect(result).toBeUndefined();
    });

    it('应该处理没有 filters 的 cube', () => {
      const cubesWithoutFilters = [
        { name: 'cube1', dimensions: [], metrics: [] },
      ];

      const result = findFilterByName(cubesWithoutFilters as any, 'any_filter');

      expect(result).toBeUndefined();
    });
  });

  describe('generateSqlFromMetric', () => {
    const metric = {
      name: 'revenue',
      sql: 'SUM(amount)',
      table: 'orders',
    };

    it('应该生成基本 SQL', () => {
      const sql = generateSqlFromMetric(metric);

      expect(sql).toContain('SELECT');
      expect(sql).toContain('FROM orders');
    });

    it('应该添加 GROUP BY 子句', () => {
      const sql = generateSqlFromMetric(metric, undefined, ['user_id', 'date']);

      expect(sql).toContain('user_id, date');
      expect(sql).toContain('GROUP BY user_id, date');
    });

    it('应该添加 WHERE 条件', () => {
      const sql = generateSqlFromMetric(metric, ['status = "paid"', 'amount > 0']);

      expect(sql).toContain('WHERE status = "paid"');
      expect(sql).toContain('AND amount > 0');
    });

    it('应该同时添加 WHERE 和 GROUP BY', () => {
      const sql = generateSqlFromMetric(
        metric,
        ['status = "paid"'],
        ['user_id']
      );

      expect(sql).toContain('WHERE status = "paid"');
      expect(sql).toContain('GROUP BY user_id');
    });
  });
});
