/**
 * SchemaParser 单元测试
 *
 * 测试 Schema Parser 的核心功能
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { SchemaParser } from './parser';
import { promises as fs } from 'fs';
import yaml from 'js-yaml';
import * as cubeParser from './cube-parser.js';

// Mock 模块
jest.mock('fs', () => ({
  promises: {
    readdir: jest.fn(),
    readFile: jest.fn(),
    access: jest.fn(),
  },
}));

jest.mock('js-yaml');
jest.mock('./cube-parser.js');

describe('SchemaParser', () => {
  let parser: SchemaParser;
  let mockFs: any;
  let mockYaml: any;
  let mockCubeParser: any;

  // 测试数据
  const mockTable = {
    table: {
      name: 'users',
      description: 'User table',
      columns: [
        { name: 'id', type: 'int', description: 'User ID', primary_key: true },
        { name: 'email', type: 'varchar', description: 'Email address' },
        { name: 'created_at', type: 'timestamp', description: 'Creation time' },
      ],
    },
  };

  const mockRelationship = {
    relationship: {
      name: 'user_orders',
      from_table: 'users',
      to_table: 'orders',
      type: 'one_to_many',
      join_sql: 'users.id = orders.user_id',
      description: 'User to orders relationship',
    },
  };

  const mockCube = {
    name: 'business_metrics',
    description: 'Business metrics cube',
    dimensions: [
      { name: 'time', description: 'Time dimension', column: 'created_at' },
    ],
    metrics: [
      { name: 'revenue', description: 'Total revenue', sql: 'SUM(amount)', type: 'sum' },
    ],
    filters: [
      { name: 'last_30_days', sql: 'created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)', description: 'Last 30 days' },
    ],
  };

  beforeEach(() => {
    parser = new SchemaParser('schema');
    mockFs = fs as any;
    mockYaml = yaml as any;
    mockCubeParser = cubeParser as any;
    jest.clearAllMocks();
  });

  describe('构造函数', () => {
    it('应该使用默认 schema 目录', () => {
      const defaultParser = new SchemaParser();
      expect(defaultParser).toBeInstanceOf(SchemaParser);
    });

    it('应该支持自定义 schema 目录', () => {
      const customParser = new SchemaParser('/custom/schema');
      expect(customParser).toBeInstanceOf(SchemaParser);
    });
  });

  describe('loadSchema', () => {
    it('应该成功加载 schema（仅表）', async () => {
      mockFs.readdir.mockResolvedValueOnce(['users.yaml']);
      mockFs.readFile.mockResolvedValueOnce('table: users');
      mockYaml.load.mockReturnValueOnce(mockTable);
      mockFs.access.mockRejectedValueOnce(new Error('Directory not found'));

      const schema = await parser.loadSchema();

      expect(schema.tables).toHaveLength(1);
      expect(schema.tables[0].name).toBe('users');
      expect(schema.relationships).toBeUndefined();
      expect(schema.cubes).toBeUndefined();
    });

    it('应该加载表和关系', async () => {
      // Mock tables directory
      mockFs.readdir
        .mockResolvedValueOnce(['users.yaml'])
        .mockResolvedValueOnce(['user_orders.yaml']);

      mockFs.readFile
        .mockResolvedValueOnce('table: users')
        .mockResolvedValueOnce('relationship: user_orders');

      mockYaml.load
        .mockReturnValueOnce(mockTable)
        .mockReturnValueOnce(mockRelationship);

      // Mock joins directory exists
      mockFs.access.mockResolvedValueOnce(undefined);

      const schema = await parser.loadSchema();

      expect(schema.tables).toHaveLength(1);
      expect(schema.relationships).toHaveLength(1);
      expect(schema.relationships![0].name).toBe('user_orders');
    });

    it('应该加载表、关系和 cubes', async () => {
      // Mock tables directory
      mockFs.readdir
        .mockResolvedValueOnce(['users.yaml'])
        .mockResolvedValueOnce(['user_orders.yaml']);

      mockFs.readFile
        .mockResolvedValueOnce('table: users')
        .mockResolvedValueOnce('relationship: user_orders');

      mockYaml.load
        .mockReturnValueOnce(mockTable)
        .mockReturnValueOnce(mockRelationship);

      // Mock joins and cubes directories exist
      mockFs.access
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined);

      mockCubeParser.parseCubesDirectory.mockResolvedValueOnce([mockCube]);

      const schema = await parser.loadSchema({ includeCubes: true });

      expect(schema.tables).toHaveLength(1);
      expect(schema.relationships).toHaveLength(1);
      expect(schema.cubes).toHaveLength(1);
      expect(schema.cubes![0].name).toBe('business_metrics');
    });

    it('应该处理多个关系定义（relationships 数组）', async () => {
      const mockMultipleRelationships = {
        relationships: [
          { name: 'rel1', from_table: 'a', to_table: 'b', type: 'one_to_many', join_sql: 'a.id = b.a_id', description: 'Rel 1' },
          { name: 'rel2', from_table: 'b', to_table: 'c', type: 'one_to_many', join_sql: 'b.id = c.b_id', description: 'Rel 2' },
        ],
      };

      mockFs.readdir
        .mockResolvedValueOnce(['users.yaml'])
        .mockResolvedValueOnce(['relationships.yaml']);

      mockFs.readFile
        .mockResolvedValueOnce('table: users')
        .mockResolvedValueOnce('relationships: []');

      mockYaml.load
        .mockReturnValueOnce(mockTable)
        .mockReturnValueOnce(mockMultipleRelationships);

      mockFs.access.mockResolvedValueOnce(undefined);

      const schema = await parser.loadSchema();

      expect(schema.relationships).toHaveLength(2);
      expect(schema.relationships![0].name).toBe('rel1');
      expect(schema.relationships![1].name).toBe('rel2');
    });

    it('应该跳过非 YAML 文件', async () => {
      mockFs.readdir.mockResolvedValueOnce(['users.yaml', 'README.md', 'config.json']);
      mockFs.readFile.mockResolvedValueOnce('table: users');
      mockYaml.load.mockReturnValueOnce(mockTable);
      mockFs.access.mockRejectedValueOnce(new Error('Directory not found'));

      const schema = await parser.loadSchema();

      expect(schema.tables).toHaveLength(1);
      expect(mockFs.readFile).toHaveBeenCalledTimes(1);
    });

    it('应该处理空目录', async () => {
      mockFs.readdir.mockResolvedValueOnce([]);
      mockFs.access.mockRejectedValueOnce(new Error('Directory not found'));

      const schema = await parser.loadSchema();

      expect(schema.tables).toHaveLength(0);
      expect(schema.relationships).toBeUndefined();
    });

    it('应该处理文件读取错误', async () => {
      mockFs.readdir.mockRejectedValueOnce(new Error('Permission denied'));

      await expect(parser.loadSchema()).rejects.toThrow('Failed to load schema: Permission denied');
    });

    it('应该处理 YAML 解析错误', async () => {
      mockFs.readdir.mockResolvedValueOnce(['invalid.yaml']);
      mockFs.readFile.mockResolvedValueOnce('invalid: yaml: content');
      mockYaml.load.mockImplementation(() => {
        throw new Error('YAML parse error');
      });

      await expect(parser.loadSchema()).rejects.toThrow('Failed to load schema: YAML parse error');
    });
  });

  describe('loadCubes', () => {
    it('应该成功加载 cubes', async () => {
      mockFs.access.mockResolvedValueOnce(undefined);
      mockCubeParser.parseCubesDirectory.mockResolvedValueOnce([mockCube]);

      const cubes = await parser.loadCubes();

      expect(cubes).toHaveLength(1);
      expect(cubes[0].name).toBe('business_metrics');
      expect(mockCubeParser.parseCubesDirectory).toHaveBeenCalledWith('schema/cubes');
    });

    it('应该在 cubes 目录不存在时返回空数组', async () => {
      mockFs.access.mockRejectedValueOnce(new Error('Directory not found'));

      const cubes = await parser.loadCubes();

      expect(cubes).toHaveLength(0);
      expect(mockCubeParser.parseCubesDirectory).not.toHaveBeenCalled();
    });

    it('应该处理多个 cubes', async () => {
      const mockCubes = [mockCube, { ...mockCube, name: 'user_analytics' }];
      mockFs.access.mockResolvedValueOnce(undefined);
      mockCubeParser.parseCubesDirectory.mockResolvedValueOnce(mockCubes);

      const cubes = await parser.loadCubes();

      expect(cubes).toHaveLength(2);
      expect(cubes[0].name).toBe('business_metrics');
      expect(cubes[1].name).toBe('user_analytics');
    });
  });

  describe('validateSchema', () => {
    it('应该验证有效的 schema', async () => {
      mockFs.readdir.mockResolvedValueOnce(['users.yaml']);
      mockFs.readFile.mockResolvedValueOnce('table: users');
      mockYaml.load.mockReturnValueOnce(mockTable);
      mockFs.access.mockRejectedValueOnce(new Error('Directory not found'));

      const result = await parser.validateSchema();

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('应该检测无效的表定义（缺少名称）', async () => {
      const invalidTable = {
        table: {
          name: '',
          description: 'Invalid table',
          columns: [{ name: 'id', type: 'int', description: 'ID' }],
        },
      };

      mockFs.readdir.mockResolvedValueOnce(['invalid.yaml']);
      mockFs.readFile.mockResolvedValueOnce('table: invalid');
      mockYaml.load.mockReturnValueOnce(invalidTable);
      mockFs.access.mockRejectedValueOnce(new Error('Directory not found'));

      const result = await parser.validateSchema();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid table definition: ');
    });

    it('应该检测无效的表定义（缺少列）', async () => {
      const invalidTable = {
        table: {
          name: 'invalid',
          description: 'Invalid table',
          columns: [],
        },
      };

      mockFs.readdir.mockResolvedValueOnce(['invalid.yaml']);
      mockFs.readFile.mockResolvedValueOnce('table: invalid');
      mockYaml.load.mockReturnValueOnce(invalidTable);
      mockFs.access.mockRejectedValueOnce(new Error('Directory not found'));

      const result = await parser.validateSchema();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid table definition: invalid');
    });

    it('应该检测重复的列名', async () => {
      const duplicateColumnsTable = {
        table: {
          name: 'users',
          description: 'User table',
          columns: [
            { name: 'id', type: 'int', description: 'ID' },
            { name: 'id', type: 'int', description: 'Duplicate ID' },
          ],
        },
      };

      mockFs.readdir.mockResolvedValueOnce(['users.yaml']);
      mockFs.readFile.mockResolvedValueOnce('table: users');
      mockYaml.load.mockReturnValueOnce(duplicateColumnsTable);
      mockFs.access.mockRejectedValueOnce(new Error('Directory not found'));

      const result = await parser.validateSchema();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Duplicate column names in table: users');
    });

    it('应该验证 cubes（当 includeCubes 为 true）', async () => {
      mockFs.readdir.mockResolvedValueOnce(['users.yaml']);
      mockFs.readFile.mockResolvedValueOnce('table: users');
      mockYaml.load.mockReturnValueOnce(mockTable);
      mockFs.access
        .mockRejectedValueOnce(new Error('Directory not found'))
        .mockResolvedValueOnce(undefined);

      mockCubeParser.parseCubesDirectory.mockResolvedValueOnce([mockCube]);
      mockCubeParser.validateCube.mockResolvedValueOnce({ valid: true, errors: [] });

      const result = await parser.validateSchema({ includeCubes: true });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(mockCubeParser.validateCube).toHaveBeenCalledWith(mockCube);
    });

    it('应该检测无效的 cubes', async () => {
      mockFs.readdir.mockResolvedValueOnce(['users.yaml']);
      mockFs.readFile.mockResolvedValueOnce('table: users');
      mockYaml.load.mockReturnValueOnce(mockTable);
      mockFs.access
        .mockRejectedValueOnce(new Error('Directory not found'))
        .mockResolvedValueOnce(undefined);

      mockCubeParser.parseCubesDirectory.mockResolvedValueOnce([mockCube]);
      mockCubeParser.validateCube.mockResolvedValueOnce({
        valid: false,
        errors: ['Missing required field: sql'],
      });

      const result = await parser.validateSchema({ includeCubes: true });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Cube "business_metrics": Missing required field: sql');
    });

    it('应该处理验证过程中的错误', async () => {
      mockFs.readdir.mockRejectedValueOnce(new Error('File system error'));

      const result = await parser.validateSchema();

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Validation failed:');
      expect(result.errors[0]).toContain('File system error');
    });
  });

  describe('findTable', () => {
    beforeEach(() => {
      mockFs.readdir.mockResolvedValue(['users.yaml']);
      mockFs.readFile.mockResolvedValue('table: users');
      mockYaml.load.mockReturnValue(mockTable);
      mockFs.access.mockRejectedValue(new Error('Directory not found'));
    });

    it('应该找到存在的表', async () => {
      const table = await parser.findTable('users');

      expect(table).toBeDefined();
      expect(table!.name).toBe('users');
      expect(table!.columns).toHaveLength(3);
    });

    it('应该在表不存在时返回 undefined', async () => {
      const table = await parser.findTable('nonexistent');

      expect(table).toBeUndefined();
    });
  });

  describe('findMetric', () => {
    beforeEach(() => {
      mockFs.access.mockResolvedValue(undefined);
      mockCubeParser.parseCubesDirectory.mockResolvedValue([mockCube]);
    });

    it('应该找到存在的 metric', async () => {
      const result = await parser.findMetric('revenue');

      expect(result).toBeDefined();
      expect(result!.metric.name).toBe('revenue');
      expect(result!.cube.name).toBe('business_metrics');
    });

    it('应该在 metric 不存在时返回 undefined', async () => {
      const result = await parser.findMetric('nonexistent');

      expect(result).toBeUndefined();
    });

    it('应该在多个 cubes 中搜索', async () => {
      const cube2 = {
        ...mockCube,
        name: 'user_analytics',
        metrics: [
          { name: 'user_count', description: 'User count', sql: 'COUNT(*)', type: 'count' },
        ],
      };

      mockCubeParser.parseCubesDirectory.mockResolvedValueOnce([mockCube, cube2]);

      const result = await parser.findMetric('user_count');

      expect(result).toBeDefined();
      expect(result!.metric.name).toBe('user_count');
      expect(result!.cube.name).toBe('user_analytics');
    });
  });

  describe('findDimension', () => {
    beforeEach(() => {
      mockFs.access.mockResolvedValue(undefined);
      mockCubeParser.parseCubesDirectory.mockResolvedValue([mockCube]);
    });

    it('应该找到存在的 dimension', async () => {
      const result = await parser.findDimension('time');

      expect(result).toBeDefined();
      expect(result!.dimension.name).toBe('time');
      expect(result!.cube.name).toBe('business_metrics');
    });

    it('应该在 dimension 不存在时返回 undefined', async () => {
      const result = await parser.findDimension('nonexistent');

      expect(result).toBeUndefined();
    });

    it('应该在多个 cubes 中搜索', async () => {
      const cube2 = {
        ...mockCube,
        name: 'user_analytics',
        dimensions: [
          { name: 'geography', description: 'Geography dimension', column: 'country' },
        ],
      };

      mockCubeParser.parseCubesDirectory.mockResolvedValueOnce([mockCube, cube2]);

      const result = await parser.findDimension('geography');

      expect(result).toBeDefined();
      expect(result!.dimension.name).toBe('geography');
      expect(result!.cube.name).toBe('user_analytics');
    });
  });

  describe('findFilter', () => {
    beforeEach(() => {
      mockFs.access.mockResolvedValue(undefined);
      mockCubeParser.parseCubesDirectory.mockResolvedValue([mockCube]);
    });

    it('应该找到存在的 filter', async () => {
      const result = await parser.findFilter('last_30_days');

      expect(result).toBeDefined();
      expect(result!.filter.name).toBe('last_30_days');
      expect(result!.cube.name).toBe('business_metrics');
    });

    it('应该在 filter 不存在时返回 undefined', async () => {
      const result = await parser.findFilter('nonexistent');

      expect(result).toBeUndefined();
    });

    it('应该处理没有 filters 的 cube', async () => {
      const cubeWithoutFilters = {
        ...mockCube,
        filters: undefined,
      };

      mockCubeParser.parseCubesDirectory.mockResolvedValueOnce([cubeWithoutFilters]);

      const result = await parser.findFilter('last_30_days');

      expect(result).toBeUndefined();
    });

    it('应该在多个 cubes 中搜索', async () => {
      const cube2 = {
        ...mockCube,
        name: 'user_analytics',
        filters: [
          { name: 'active_users', sql: 'status = "active"', description: 'Active users only' },
        ],
      };

      mockCubeParser.parseCubesDirectory.mockResolvedValueOnce([mockCube, cube2]);

      const result = await parser.findFilter('active_users');

      expect(result).toBeDefined();
      expect(result!.filter.name).toBe('active_users');
      expect(result!.cube.name).toBe('user_analytics');
    });
  });
});
