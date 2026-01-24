import yaml from 'js-yaml';
import { promises as fs } from 'fs';
import { join } from 'path';
import { SchemaTable, SchemaConfig } from '../types/index.js';

export class SchemaParser {
  private schemaDir: string;

  constructor(schemaDir: string = 'schema') {
    this.schemaDir = schemaDir;
  }

  async loadSchema(): Promise<SchemaConfig> {
    const tables: SchemaTable[] = [];
    const relationships: any[] = [];

    try {
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

      const joinsDir = join(this.schemaDir, 'joins');
      if (await fs.access(joinsDir).then(() => true).catch(() => false)) {
        const joinsFile = join(joinsDir, 'relationships.yaml');
        const content = await fs.readFile(joinsFile, 'utf-8');
        const data = yaml.load(content);
        relationships.push(...(data.relationships || []));
      }

      return {
        tables,
        relationships: relationships.length > 0 ? relationships : undefined
      };
    } catch (error) {
      throw new Error(`Failed to load schema: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async validateSchema(): Promise<boolean> {
    try {
      const schema = await this.loadSchema();

      for (const table of schema.tables) {
        if (!table.name || !table.columns || table.columns.length === 0) {
          console.warn(`Invalid table definition: ${table.name}`);
          return false;
        }

        const columnNames = new Set(table.columns.map(c => c.name));
        if (columnNames.size !== table.columns.length) {
          console.warn(`Duplicate column names in table: ${table.name}`);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error(`Schema validation failed: ${error}`);
      return false;
    }
  }
}
