import Database from 'better-sqlite3';
import {
  DatabaseConnectionError,
  DatabaseQueryError,
  DatabaseNotConnectedError
} from '../errors/index.js';
import { getLogger, type Logger } from '../logging/index.js';

export class DatabaseConnector {
  private db: Database.Database | null = null;
  private dbPath: string;
  private logger: Logger;

  constructor(dbPath: string) {
    this.dbPath = dbPath;
    this.logger = getLogger().child({ module: 'sqlite' });
  }

  async connect(): Promise<void> {
    this.logger.debug('Opening SQLite database', { path: this.dbPath });

    try {
      this.db = new Database(this.dbPath);
      this.logger.info('SQLite database opened');
    } catch (error) {
      this.logger.error('SQLite connection failed', {
        error: error instanceof Error ? error.message : String(error),
        path: this.dbPath
      });
      throw new DatabaseConnectionError(
        `无法打开 SQLite 数据库: ${error instanceof Error ? error.message : String(error)}`,
        {
          cause: error instanceof Error ? error : undefined,
          context: { dbPath: this.dbPath }
        }
      );
    }
  }

  async disconnect(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
      this.logger.debug('SQLite database closed');
    }
  }

  async executeQuery(sql: string, limit: number = 100): Promise<any[]> {
    if (!this.db) {
      throw new DatabaseNotConnectedError({
        context: { dbPath: this.dbPath }
      });
    }

    try {
      const query = limit > 0 ? `${sql} LIMIT ${limit}` : sql;
      this.logger.debug('Executing query', { sql: query.substring(0, 200) });
      const stmt = this.db.prepare(query);
      const rows = stmt.all();
      this.logger.debug('Query executed', { rowCount: rows.length });
      return rows;
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
          context: { dbPath: this.dbPath }
        }
      );
    }
  }

  isConnected(): boolean {
    return this.db !== null;
  }
}
