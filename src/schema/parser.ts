import yaml from 'js-yaml';
import { promises as fs } from 'fs';
import { join } from 'path';
import { SchemaTable, SchemaConfig, Cube } from '../types/index.js';
import { parseCubesDirectory, validateCube } from './cube-parser.js';
import { SchemaParseError, SchemaValidationError } from '../errors/index.js';
import { getLogger, type Logger } from '../logging/index.js';
import { getSchemaCache } from '../performance/index.js';

export class SchemaParser {
  private schemaDir: string;
  private logger: Logger;
  private cache = getSchemaCache();

  constructor(schemaDir: string = 'schema') {
    this.schemaDir = schemaDir;
    this.logger = getLogger().child({ module: 'schema-parser' });
  }

  async loadSchema(options: { includeCubes?: boolean } = {}): Promise<SchemaConfig> {
    // 1. 检查缓存
    const cacheKey = `${this.schemaDir}:${options.includeCubes || false}`;
    const cached = this.cache.getSchema(cacheKey);
    if (cached) {
      this.logger.debug('Schema cache hit', { key: cacheKey });
      return cached;
    }

    const tables: SchemaTable[] = [];
    const relationships: any[] = [];
    const cubes: Cube[] = [];

    try {
      // 加载 Schema 层
      const tablesDir = join(this.schemaDir, 'tables');
      const files = await fs.readdir(tablesDir);

      for (const file of files) {
        if (file.endsWith('.yaml')) {
          const filePath = join(tablesDir, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const data = yaml.load(content) as any;
          tables.push(data.table);
        }
      }

      // 加载关系定义
      const joinsDir = join(this.schemaDir, 'joins');
      if (await fs.access(joinsDir).then(() => true).catch(() => false)) {
        const files = await fs.readdir(joinsDir);
        for (const file of files) {
          if (file.endsWith('.yaml')) {
            const filePath = join(joinsDir, file);
            const content = await fs.readFile(filePath, 'utf-8');
            const data = yaml.load(content) as any;
            if (data.relationship) {
              relationships.push(data.relationship);
            } else if (data.relationships) {
              relationships.push(...data.relationships);
            }
          }
        }
      }

      // 加载 Cube 层（如果请求）
      if (options.includeCubes) {
        const cubesDir = join(this.schemaDir, 'cubes');
        if (await fs.access(cubesDir).then(() => true).catch(() => false)) {
          cubes.push(...await parseCubesDirectory(cubesDir));
        }
      }

      const schema: SchemaConfig = {
        tables,
        relationships: relationships.length > 0 ? relationships : undefined,
        cubes: cubes.length > 0 ? cubes : undefined,
      };

      // 2. 存入缓存
      this.cache.setSchema(cacheKey, schema);

      return schema;
    } catch (error) {
      if (error instanceof SchemaParseError) {
        throw error;
      }
      throw new SchemaParseError(
        `加载 Schema 失败: ${error instanceof Error ? error.message : String(error)}`,
        {
          filePath: this.schemaDir,
          cause: error instanceof Error ? error : undefined
        }
      );
    }
  }

  async loadCubes(): Promise<Cube[]> {
    // 1. 检查缓存
    const cacheKey = `${this.schemaDir}:cubes`;
    const cached = this.cache.getCubes(cacheKey);
    if (cached) {
      this.logger.debug('Cubes cache hit', { key: cacheKey });
      return cached;
    }

    // 2. 加载 Cubes
    const cubesDir = join(this.schemaDir, 'cubes');
    if (await fs.access(cubesDir).then(() => true).catch(() => false)) {
      const cubes = await parseCubesDirectory(cubesDir);

      // 3. 存入缓存并构建索引
      this.cache.setCubes(cacheKey, cubes);

      return cubes;
    }
    return [];
  }

  async validateSchema(options: { includeCubes?: boolean } = {}): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      // 验证 Schema 层
      const schema = await this.loadSchema();

      for (const table of schema.tables) {
        if (!table.name || !table.columns || table.columns.length === 0) {
          errors.push(`Invalid table definition: ${table.name}`);
          continue;
        }

        const columnNames = new Set(table.columns.map(c => c.name));
        if (columnNames.size !== table.columns.length) {
          errors.push(`Duplicate column names in table: ${table.name}`);
        }
      }

      // 验证 Cube 层（如果存在）
      if (options.includeCubes) {
        const cubes = await this.loadCubes();
        for (const cube of cubes) {
          const validation = await validateCube(cube);
          if (!validation.valid) {
            errors.push(`Cube "${cube.name}": ${validation.errors.join(', ')}`);
          }
        }
      }

      return {
        valid: errors.length === 0,
        errors,
      };
    } catch (error) {
      if (error instanceof SchemaValidationError) {
        throw error;
      }
      this.logger.error('Schema validation failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      return {
        valid: false,
        errors: [`验证失败: ${error instanceof Error ? error.message : String(error)}`],
      };
    }
  }

  async findTable(tableName: string): Promise<SchemaTable | undefined> {
    const schema = await this.loadSchema();
    return schema.tables.find(t => t.name === tableName);
  }

  async findMetric(metricName: string): Promise<{ metric: any; cube: Cube } | undefined> {
    // 先尝试从索引查找（O(1)）
    const cached = this.cache.findMetric(metricName);
    if (cached) {
      this.logger.debug('Metric found in index', { metric: metricName });
      return cached;
    }

    // 如果索引未命中，加载 Cubes（会构建索引）
    await this.loadCubes();

    // 再次尝试从索引查找
    const result = this.cache.findMetric(metricName);
    if (result) {
      this.logger.debug('Metric found after loading', { metric: metricName });
    }
    return result;
  }

  async findDimension(dimensionName: string): Promise<{ dimension: any; cube: Cube } | undefined> {
    // 先尝试从索引查找（O(1)）
    const cached = this.cache.findDimension(dimensionName);
    if (cached) {
      this.logger.debug('Dimension found in index', { dimension: dimensionName });
      return cached;
    }

    // 如果索引未命中，加载 Cubes（会构建索引）
    await this.loadCubes();

    // 再次尝试从索引查找
    const result = this.cache.findDimension(dimensionName);
    if (result) {
      this.logger.debug('Dimension found after loading', { dimension: dimensionName });
    }
    return result;
  }

  async findFilter(filterName: string): Promise<{ filter: any; cube: Cube } | undefined> {
    // 先尝试从索引查找（O(1)）
    const cached = this.cache.findFilter(filterName);
    if (cached) {
      this.logger.debug('Filter found in index', { filter: filterName });
      return cached;
    }

    // 如果索引未命中，加载 Cubes（会构建索引）
    await this.loadCubes();

    // 再次尝试从索引查找
    const result = this.cache.findFilter(filterName);
    if (result) {
      this.logger.debug('Filter found after loading', { filter: filterName });
    }
    return result;
  }
}
