import mysql from 'mysql2/promise';
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
  connectionLimit?: number;
}

export class DatabaseConnector {
  private connection: mysql.Connection | null = null;
  private pool: mysql.Pool | null = null;
  private config: DatabaseConfig;

  constructor(config: DatabaseConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    const connectionConfig: mysql.ConnectionOptions = {
      host: this.config.host || 'localhost',
      port: this.config.port || 3306,
      user: this.config.user || process.env.MYSQL_USER,
      password: this.config.password || process.env.MYSQL_PASSWORD,
      database: this.config.database,
      ssl: this.config.ssl ? { rejectUnauthorized: false } : undefined
    };

    try {
      if (this.config.connectionLimit && this.config.connectionLimit > 1) {
        this.pool = mysql.createPool({
          ...connectionConfig,
          waitForConnections: true,
          queueLimit: 0
        });
      } else {
        this.connection = await mysql.createConnection(connectionConfig);
      }
    } catch (error) {
      throw new DatabaseConnectionError(
        `无法连接到 MySQL 数据库: ${error instanceof Error ? error.message : String(error)}`,
        {
          cause: error instanceof Error ? error : undefined,
          context: {
            host: connectionConfig.host,
            port: connectionConfig.port,
            database: connectionConfig.database,
            user: connectionConfig.user
          }
        }
      );
    }
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.end();
      this.connection = null;
    }
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }

  async executeQuery(sql: string, limit: number = 100): Promise<any[]> {
    const hasPool = this.pool !== null;
    const conn = hasPool ? this.pool : this.connection;

    if (!conn) {
      throw new DatabaseNotConnectedError({
        context: { database: this.config.database }
      });
    }

    try {
      const query = limit > 0 ? `${sql} LIMIT ${limit}` : sql;
      const [rows] = await conn.execute(query);
      return Array.isArray(rows) ? rows : [];
    } catch (error) {
      throw new DatabaseQueryError(
        `查询执行失败: ${error instanceof Error ? error.message : String(error)}`,
        {
          sql,
          cause: error instanceof Error ? error : undefined,
          context: { database: this.config.database }
        }
      );
    }
  }

  isConnected(): boolean {
    return this.connection !== null || this.pool !== null;
  }
}
