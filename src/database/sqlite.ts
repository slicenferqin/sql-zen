import Database from 'better-sqlite3';

export class DatabaseConnector {
  private db: Database.Database | null = null;
  private dbPath: string;

  constructor(dbPath: string) {
    this.dbPath = dbPath;
  }

  async connect(): Promise<void> {
    this.db = new Database(this.dbPath);
  }

  async disconnect(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
    }
  }

  async executeQuery(sql: string, limit: number = 100): Promise<any[]> {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    try {
      const query = limit > 0 ? `${sql} LIMIT ${limit}` : sql;
      const stmt = this.db.prepare(query);
      const rows = stmt.all();
      return rows;
    } catch (error) {
      throw new Error(`Query execution failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  isConnected(): boolean {
    return this.db !== null;
  }
}
