import yaml from 'js-yaml';
import { promises as fs } from 'fs';
import { join } from 'path';
import type { Cube } from '../types/index.js';

/**
 * Cube 层解析器，解析 YAML 格式的 Cube 定义文件。
 */

export interface CubeParseOptions {
  cubeDir?: string;
  strict?: boolean;
}

export class CubeParseError extends Error {
  constructor(message: string, public filePath?: string, public line?: number) {
    super(message);
    this.name = 'CubeParseError';
  }
}

/**
 * 解析单个 Cube 文件
 */
export async function parseCubeFile(filePath: string): Promise<Cube> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const data = yaml.load(content) as any;

    if (!data.cube) {
      throw new CubeParseError('Missing "cube" field', filePath);
    }

    if (!data.dimensions || !Array.isArray(data.dimensions)) {
      throw new CubeParseError('Missing or invalid "dimensions" field (must be array)', filePath);
    }

    if (!data.metrics || !Array.isArray(data.metrics)) {
      throw new CubeParseError('Missing or invalid "metrics" field (must be array)', filePath);
    }

    const cube: Cube = {
      name: data.cube,
      description: data.description || '',
      dimensions: parseDimensions(data.dimensions, filePath),
      metrics: parseMetrics(data.metrics, filePath),
      filters: data.filters ? parseFilters(data.filters, filePath) : [],
      joins: data.joins ? parseJoins(data.joins, filePath) : [],
    };

    return cube;
  } catch (error) {
    if (error instanceof CubeParseError) {
      throw error;
    }
    throw new CubeParseError(`Failed to parse cube file: ${error instanceof Error ? error.message : String(error)}`, filePath);
  }
}

/**
 * 解析多个 Cube 文件
 */
export async function parseCubesDirectory(dir: string, options: CubeParseOptions = {}): Promise<Cube[]> {
  const cubes: Cube[] = [];

  try {
    const files = await fs.readdir(dir);
    const cubeFiles = files.filter((file) => file.endsWith('.yaml') || file.endsWith('.yml'));

    for (const file of cubeFiles) {
      const filePath = join(dir, file);
      try {
        const cube = await parseCubeFile(filePath);
        cubes.push(cube);
      } catch (error) {
        if (options.strict) {
          throw error;
        }
        console.warn(`Warning: Failed to parse ${file}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  } catch (error) {
    throw new CubeParseError(`Failed to read cubes directory: ${error instanceof Error ? error.message : String(error)}`, dir);
  }

  return cubes;
}

/**
 * 解析维度定义
 */
function parseDimensions(dimensions: any[], filePath?: string): any[] {
  return dimensions.map((dim, index) => {
    if (!dim.name) {
      throw new CubeParseError(`Dimension at index ${index} missing "name" field`, filePath);
    }

    if (!dim.description) {
      throw new CubeParseError(`Dimension "${dim.name}" missing "description" field`, filePath);
    }

    if (!dim.column && !dim.columns) {
      throw new CubeParseError(`Dimension "${dim.name}" must have either "column" or "columns" field`, filePath);
    }

    return {
      name: dim.name,
      description: dim.description,
      column: dim.column,
      columns: dim.columns,
      enum: dim.enum,
      granularity: dim.granularity || [],
      hierarchy: dim.hierarchy || {},
    };
  });
}

/**
 * 解析度量定义
 */
function parseMetrics(metrics: any[], filePath?: string): any[] {
  return metrics.map((metric, index) => {
    if (!metric.name) {
      throw new CubeParseError(`Metric at index ${index} missing "name" field`, filePath);
    }

    if (!metric.description) {
      throw new CubeParseError(`Metric "${metric.name}" missing "description" field`, filePath);
    }

    if (!metric.sql) {
      throw new CubeParseError(`Metric "${metric.name}" missing "sql" field`, filePath);
    }

    if (!metric.type) {
      throw new CubeParseError(`Metric "${metric.name}" missing "type" field`, filePath);
    }

    const validTypes = ['sum', 'count', 'avg', 'percentage', 'ratio', 'min', 'max'];
    if (!validTypes.includes(metric.type)) {
      throw new CubeParseError(`Metric "${metric.name}" has invalid type "${metric.type}". Valid types: ${validTypes.join(', ')}`, filePath);
    }

    return {
      name: metric.name,
      description: metric.description,
      sql: metric.sql,
      type: metric.type,
      category: metric.category,
      unit: metric.unit,
    };
  });
}

/**
 * 解析过滤器定义
 */
function parseFilters(filters: any[], filePath?: string): any[] {
  return filters.map((filter, index) => {
    if (!filter.name) {
      throw new CubeParseError(`Filter at index ${index} missing "name" field`, filePath);
    }

    if (!filter.sql) {
      throw new CubeParseError(`Filter "${filter.name}" missing "sql" field`, filePath);
    }

    if (!filter.description) {
      throw new CubeParseError(`Filter "${filter.name}" missing "description" field`, filePath);
    }

    return {
      name: filter.name,
      sql: filter.sql,
      description: filter.description,
      dimension: filter.dimension,
    };
  });
}

/**
 * 解析 JOIN 定义
 */
function parseJoins(joins: any[], filePath?: string): any[] {
  return joins.map((join, index) => {
    if (!join.from) {
      throw new CubeParseError(`Join at index ${index} missing "from" field`, filePath);
    }

    if (!join.to) {
      throw new CubeParseError(`Join at index ${index} missing "to" field`, filePath);
    }

    if (!join.type) {
      throw new CubeParseError(`Join at index ${index} missing "type" field`, filePath);
    }

    if (!join.condition) {
      throw new CubeParseError(`Join at index ${index} missing "condition" field`, filePath);
    }

    const validTypes = ['inner', 'left', 'right', 'full'];
    if (!validTypes.includes(join.type)) {
      throw new CubeParseError(`Join at index ${index} has invalid type "${join.type}". Valid types: ${validTypes.join(', ')}`, filePath);
    }

    return {
      from: join.from,
      to: join.to,
      type: join.type,
      condition: join.condition,
      description: join.description,
    };
  });
}

/**
 * 验证 Cube 定义
 */
export async function validateCube(cube: Cube): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  // 验证 Cube 名称
  if (!cube.name || cube.name.trim() === '') {
    errors.push('Cube name is required');
  }

  // 验证维度
  if (!cube.dimensions || cube.dimensions.length === 0) {
    errors.push('Cube must have at least one dimension');
  }

  const dimensionNames = new Set<string>();
  for (const dim of cube.dimensions) {
    if (dimensionNames.has(dim.name)) {
      errors.push(`Duplicate dimension name: ${dim.name}`);
    }
    dimensionNames.add(dim.name);

    // 验证维度有列引用
    if (!dim.column && !dim.columns) {
      errors.push(`Dimension "${dim.name}" must have either "column" or "columns" field`);
    }
  }

  // 验证度量
  if (!cube.metrics || cube.metrics.length === 0) {
    errors.push('Cube must have at least one metric');
  }

  const metricNames = new Set<string>();
  for (const metric of cube.metrics) {
    if (metricNames.has(metric.name)) {
      errors.push(`Duplicate metric name: ${metric.name}`);
    }
    metricNames.add(metric.name);

    // 验证 SQL 表达式
    if (!metric.sql || metric.sql.trim() === '') {
      errors.push(`Metric "${metric.name}" must have SQL expression`);
    }
  }

  // 验证过滤器名称
  if (cube.filters) {
    const filterNames = new Set<string>();
    for (const filter of cube.filters) {
      if (filterNames.has(filter.name)) {
        errors.push(`Duplicate filter name: ${filter.name}`);
      }
      filterNames.add(filter.name);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 查找 Cube 中的度量
 */
export function findMetricByName(cubes: Cube[], metricName: string): any | undefined {
  for (const cube of cubes) {
    const metric = cube.metrics.find((m: any) => m.name === metricName);
    if (metric) {
      return { metric, cube };
    }
  }
  return undefined;
}

/**
 * 查找 Cube 中的维度
 */
export function findDimensionByName(cubes: Cube[], dimensionName: string): any | undefined {
  for (const cube of cubes) {
    const dimension = cube.dimensions.find((d: any) => d.name === dimensionName);
    if (dimension) {
      return { dimension, cube };
    }
  }
  return undefined;
}

/**
 * 查找 Cube 中的过滤器
 */
export function findFilterByName(cubes: Cube[], filterName: string): any | undefined {
  for (const cube of cubes) {
    if (!cube.filters) continue;
    const filter = cube.filters.find((f: any) => f.name === filterName);
    if (filter) {
      return { filter, cube };
    }
  }
  return undefined;
}

/**
 * 生成 SQL 从 Cube 度量
 */
export function generateSqlFromMetric(
  metric: any,
  filters?: string[],
  groupBy?: string[]
): string {
  let sql = `SELECT\n`;

  // 处理分组列
  if (groupBy && groupBy.length > 0) {
    sql += `  ${groupBy.join(', ')}\n`;
  } else {
    sql += '  *\n';
  }

  sql += `FROM ${metric.table || 'orders'}\n`;

  // 添加 WHERE 条件
  if (filters && filters.length > 0) {
    sql += `WHERE ${filters.join('\n  AND ')}\n`;
  }

  // 添加 GROUP BY
  if (groupBy && groupBy.length > 0) {
    sql += `GROUP BY ${groupBy.join(', ')}\n`;
  }

  return sql;
}
