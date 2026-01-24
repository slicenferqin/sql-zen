import yaml from 'js-yaml';
import { promises as fs } from 'fs';
import { join } from 'path';
import { SchemaTable, SchemaConfig, Cube } from '../types/index.js';
import { parseCubesDirectory, validateCube } from './cube-parser.js';

export class SchemaParser {
  private schemaDir: string;

  constructor(schemaDir: string = 'schema') {
    this.schemaDir = schemaDir;
  }

  async loadSchema(options: { includeCubes?: boolean } = {}): Promise<SchemaConfig> {
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
          const data = yaml.load(content);
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
            const data = yaml.load(content);
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

      return {
        tables,
        relationships: relationships.length > 0 ? relationships : undefined,
        cubes: cubes.length > 0 ? cubes : undefined,
      };
    } catch (error) {
      throw new Error(`Failed to load schema: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async loadCubes(): Promise<Cube[]> {
    const cubesDir = join(this.schemaDir, 'cubes');
    if (await fs.access(cubesDir).then(() => true).catch(() => false)) {
      return await parseCubesDirectory(cubesDir);
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
      console.error(`Schema validation failed: ${error}`);
      return {
        valid: false,
        errors: [`Validation failed: ${error instanceof Error ? error.message : String(error)}`],
      };
    }
  }

  async findTable(tableName: string): Promise<SchemaTable | undefined> {
    const schema = await this.loadSchema();
    return schema.tables.find(t => t.name === tableName);
  }

  async findMetric(metricName: string): Promise<{ metric: any; cube: Cube } | undefined> {
    const cubes = await this.loadCubes();
    for (const cube of cubes) {
      const metric = cube.metrics.find((m: any) => m.name === metricName);
      if (metric) {
        return { metric, cube };
      }
    }
    return undefined;
  }

  async findDimension(dimensionName: string): Promise<{ dimension: any; cube: Cube } | undefined> {
    const cubes = await this.loadCubes();
    for (const cube of cubes) {
      const dimension = cube.dimensions.find((d: any) => d.name === dimensionName);
      if (dimension) {
        return { dimension, cube };
      }
    }
    return undefined;
  }

  async findFilter(filterName: string): Promise<{ filter: any; cube: Cube } | undefined> {
    const cubes = await this.loadCubes();
    for (const cube of cubes) {
      if (!cube.filters) continue;
      const filter = cube.filters.find((f: any) => f.name === filterName);
      if (filter) {
        return { filter, cube };
      }
    }
    return undefined;
  }
}
