import { Client } from 'pg';

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

  async connect(config: DatabaseConfig): Promise<void> {
    this.client = new Client({
      host: config.host || 'localhost',
      port: config.port || 5432,
      database: config.database,
      user: config.user || process.env.USER,
      password: config.password || process.env.PGPASSWORD,
      ssl: config.ssl || false
    });

    await this.client.connect();
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.end();
      this.client = null;
    }
  }

  async executeQuery(sql: string, limit: number = 100): Promise<any[]> {
    if (!this.client) {
      throw new Error('Database not connected');
    }

    try {
      const query = limit > 0 ? `${sql} LIMIT ${limit}` : sql;
      const result = await this.client.query(query);
      return result.rows;
    } catch (error) {
      throw new Error(`Query execution failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  isConnected(): boolean {
    return this.client !== null;
  }
}
