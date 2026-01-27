import mysql from 'mysql2/promise';
import {
  DatabaseConnectionError,
  DatabaseQueryError,
  DatabaseNotConnectedError
} from '../errors/index.js';
import { getLogger, type Logger } from '../logging/index.js';

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
  private logger: Logger;

  constructor(config: DatabaseConfig) {
    this.config = config;
    this.logger = getLogger().child({ module: 'mysql' });
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

    this.logger.debug('Connecting to MySQL', {
      host: connectionConfig.host,
      port: connectionConfig.port,
      database: connectionConfig.database
    });

    try {
      if (this.config.connectionLimit && this.config.connectionLimit > 1) {
        this.pool = mysql.createPool({
          ...connectionConfig,
          waitForConnections: true,
          queueLimit: 0
        });
        this.logger.info('MySQL pool created', { connectionLimit: this.config.connectionLimit });
      } else {
        this.connection = await mysql.createConnection(connectionConfig);
        this.logger.info('MySQL connected');
      }
    } catch (error) {
      this.logger.error('MySQL connection failed', {
        error: error instanceof Error ? error.message : String(error),
        host: connectionConfig.host,
        database: connectionConfig.database
      });
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
      this.logger.debug('MySQL connection closed');
    }
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.logger.debug('MySQL pool closed');
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
      this.logger.debug('Executing query', { sql: query.substring(0, 200) });
      const [rows] = await conn.execute(query);
      const rowCount = Array.isArray(rows) ? rows.length : 0;
      this.logger.debug('Query executed', { rowCount });
      return Array.isArray(rows) ? rows : [];
    } catch (error) {
      this.logger.error('Query failed', {
        sql: sql.substring(0, 200),
        error: error instanceof Error ? error.message : String(error)
      });
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
