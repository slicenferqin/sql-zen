/**
 * SQLite DatabaseConnector 单元测试
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { DatabaseConnector } from './sqlite';
import Database from 'better-sqlite3';

// Mock better-sqlite3
jest.mock('better-sqlite3');

describe('SQLite DatabaseConnector', () => {
  let connector: DatabaseConnector;
  let mockDb: any;
  let MockDatabase: any;

  beforeEach(() => {
    mockDb = {
      prepare: jest.fn(),
      close: jest.fn(() => Promise.resolve()),
    };

    MockDatabase = Database as any;
    MockDatabase.mockImplementation(() => mockDb);

    jest.clearAllMocks();
  });

  describe('构造函数', () => {
    it('应该使用提供的数据库路径创建连接器', () => {
      connector = new DatabaseConnector('/path/to/db.sqlite');
      expect(connector).toBeInstanceOf(DatabaseConnector);
      expect(connector.isConnected()).toBe(false);
    });

    it('应该支持内存数据库', () => {
      connector = new DatabaseConnector(':memory:');
      expect(connector).toBeInstanceOf(DatabaseConnector);
    });
  });

  describe('connect', () => {
    it('应该创建数据库连接', async () => {
      connector = new DatabaseConnector('/path/to/db.sqlite');

      await connector.connect();

      expect(MockDatabase).toHaveBeenCalledWith('/path/to/db.sqlite');
      expect(connector.isConnected()).toBe(true);
    });
  });

  describe('disconnect', () => {
    it('应该关闭数据库连接', async () => {
      connector = new DatabaseConnector('/path/to/db.sqlite');
      await connector.connect();

      await connector.disconnect();

      expect(mockDb.close).toHaveBeenCalled();
      expect(connector.isConnected()).toBe(false);
    });

    it('应该在未连接时安全调用', async () => {
      connector = new DatabaseConnector('/path/to/db.sqlite');

      await expect(connector.disconnect()).resolves.not.toThrow();
    });
  });

  describe('executeQuery', () => {
    let mockStmt: any;

    beforeEach(async () => {
      mockStmt = {
        all: jest.fn(),
      };

      mockDb.prepare.mockReturnValue(mockStmt);

      connector = new DatabaseConnector('/path/to/db.sqlite');
      await connector.connect();
    });

    it('应该执行查询并返回结果', async () => {
      const mockRows = [{ id: 1, name: 'test' }];
      mockStmt.all.mockReturnValueOnce(mockRows);

      const result = await connector.executeQuery('SELECT * FROM users');

      expect(mockDb.prepare).toHaveBeenCalledWith('SELECT * FROM users LIMIT 100');
      expect(mockStmt.all).toHaveBeenCalled();
      expect(result).toEqual(mockRows);
    });

    it('应该使用自定义 limit', async () => {
      mockStmt.all.mockReturnValueOnce([]);

      await connector.executeQuery('SELECT * FROM users', 50);

      expect(mockDb.prepare).toHaveBeenCalledWith('SELECT * FROM users LIMIT 50');
    });

    it('应该在 limit 为 0 时不添加 LIMIT', async () => {
      mockStmt.all.mockReturnValueOnce([]);

      await connector.executeQuery('SELECT * FROM users', 0);

      expect(mockDb.prepare).toHaveBeenCalledWith('SELECT * FROM users');
    });

    it('应该在未连接时抛出错误', async () => {
      const disconnectedConnector = new DatabaseConnector('/path/to/db.sqlite');

      await expect(disconnectedConnector.executeQuery('SELECT 1')).rejects.toThrow(
        'Database not connected'
      );
    });

    it('应该处理查询错误', async () => {
      mockDb.prepare.mockImplementation(() => {
        throw new Error('SQL syntax error');
      });

      await expect(connector.executeQuery('INVALID SQL')).rejects.toThrow(
        'Query execution failed: SQL syntax error'
      );
    });
  });

  describe('isConnected', () => {
    it('应该在未连接时返回 false', () => {
      connector = new DatabaseConnector('/path/to/db.sqlite');
      expect(connector.isConnected()).toBe(false);
    });

    it('应该在连接后返回 true', async () => {
      connector = new DatabaseConnector('/path/to/db.sqlite');
      await connector.connect();
      expect(connector.isConnected()).toBe(true);
    });

    it('应该在断开连接后返回 false', async () => {
      connector = new DatabaseConnector('/path/to/db.sqlite');
      await connector.connect();
      await connector.disconnect();
      expect(connector.isConnected()).toBe(false);
    });
  });
});
