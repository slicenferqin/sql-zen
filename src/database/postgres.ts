import { Client } from 'pg';
import {
  DatabaseConnectionError,
  DatabaseQueryError,
  DatabaseNotConnectedError
} from '../errors/index.js';

export interface DatabaseConfig {
  host?: string;
  port?: number;
  database: string;
  user?: string;
  password?: string;
  ssl?: boolean;
}

export class DatabaseConnector {
  private client: Client | null = null;
  private config: DatabaseConfig | null = null;

  async connect(config: DatabaseConfig): Promise<void> {
    this.config = config;

    try {
      this.client = new Client({
        host: config.host || 'localhost',
        port: config.port || 5432,
        database: config.database,
        user: config.user || process.env.USER,
        password: config.password || process.env.PGPASSWORD,
        ssl: config.ssl || false
      });

      await this.client.connect();
    } catch (error) {
      this.client = null;
      throw new DatabaseConnectionError(
        `无法连接到 PostgreSQL 数据库: ${error instanceof Error ? error.message : String(error)}`,
        {
          cause: error instanceof Error ? error : undefined,
          context: {
            host: config.host || 'localhost',
            port: config.port || 5432,
            database: config.database,
            user: config.user || process.env.USER
          }
        }
      );
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.end();
      this.client = null;
    }
  }

  async executeQuery(sql: string, limit: number = 100): Promise<any[]> {
    if (!this.client) {
      throw new DatabaseNotConnectedError({
        context: { database: this.config?.database }
      });
    }

    try {
      const query = limit > 0 ? `${sql} LIMIT ${limit}` : sql;
      const result = await this.client.query(query);
      return result.rows;
    } catch (error) {
      throw new DatabaseQueryError(
        `查询执行失败: ${error instanceof Error ? error.message : String(error)}`,
        {
          sql,
          cause: error instanceof Error ? error : undefined,
          context: { database: this.config?.database }
        }
      );
    }
  }

  isConnected(): boolean {
    return this.client !== null;
  }
}
