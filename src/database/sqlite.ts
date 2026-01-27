import Database from 'better-sqlite3';
import {
  DatabaseConnectionError,
  DatabaseQueryError,
  DatabaseNotConnectedError
} from '../errors/index.js';

export class DatabaseConnector {
  private db: Database.Database | null = null;
  private dbPath: string;

  constructor(dbPath: string) {
    this.dbPath = dbPath;
  }

  async connect(): Promise<void> {
    try {
      this.db = new Database(this.dbPath);
    } catch (error) {
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
      const stmt = this.db.prepare(query);
      const rows = stmt.all();
      return rows;
    } catch (error) {
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
