/**
 * MySQL DatabaseConnector 单元测试
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { DatabaseConnector } from './mysql';
import mysql from 'mysql2/promise';

// Mock mysql2/promise
jest.mock('mysql2/promise');

describe('MySQL DatabaseConnector', () => {
  let connector: DatabaseConnector;
  let mockConnection: any;
  let mockPool: any;
  let mockMysql: any;

  beforeEach(() => {
    mockConnection = {
      execute: jest.fn(),
      end: jest.fn(),
    };

    mockPool = {
      execute: jest.fn(),
      end: jest.fn(),
    };

    mockMysql = mysql as any;
    (mockMysql.createConnection as any) = jest.fn(() => Promise.resolve(mockConnection));
    (mockMysql.createPool as any) = jest.fn(() => mockPool);

    jest.clearAllMocks();
  });

  describe('构造函数', () => {
    it('应该使用提供的配置创建连接器', () => {
      connector = new DatabaseConnector({
        host: 'localhost',
        port: 3306,
        database: 'test',
        user: 'root',
        password: 'password',
      });

      expect(connector).toBeInstanceOf(DatabaseConnector);
      expect(connector.isConnected()).toBe(false);
    });

    it('应该只需要 database 参数', () => {
      connector = new DatabaseConnector({ database: 'test' });
      expect(connector).toBeInstanceOf(DatabaseConnector);
    });
  });

  describe('connect', () => {
    it('应该创建单个连接（无连接池）', async () => {
      connector = new DatabaseConnector({
        database: 'test',
        host: 'localhost',
        port: 3306,
        user: 'root',
        password: 'password',
      });

      await connector.connect();

      expect(mockMysql.createConnection).toHaveBeenCalledWith({
        host: 'localhost',
        port: 3306,
        user: 'root',
        password: 'password',
        database: 'test',
        ssl: undefined,
      });
      expect(connector.isConnected()).toBe(true);
    });

    it('应该使用默认值', async () => {
      connector = new DatabaseConnector({ database: 'test' });

      await connector.connect();

      expect(mockMysql.createConnection).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'localhost',
          port: 3306,
          database: 'test',
        })
      );
    });

    it('应该创建连接池（当 connectionLimit > 1）', async () => {
      connector = new DatabaseConnector({
        database: 'test',
        connectionLimit: 10,
      });

      await connector.connect();

      expect(mockMysql.createPool).toHaveBeenCalledWith(
        expect.objectContaining({
          database: 'test',
          waitForConnections: true,
          queueLimit: 0,
        })
      );
      expect(connector.isConnected()).toBe(true);
    });

    it('应该支持 SSL 连接', async () => {
      connector = new DatabaseConnector({
        database: 'test',
        ssl: true,
      });

      await connector.connect();

      expect(mockMysql.createConnection).toHaveBeenCalledWith(
        expect.objectContaining({
          ssl: { rejectUnauthorized: false },
        })
      );
    });
  });

  describe('disconnect', () => {
    it('应该关闭单个连接', async () => {
      connector = new DatabaseConnector({ database: 'test' });
      await connector.connect();

      await connector.disconnect();

      expect(mockConnection.end).toHaveBeenCalled();
      expect(connector.isConnected()).toBe(false);
    });

    it('应该关闭连接池', async () => {
      connector = new DatabaseConnector({
        database: 'test',
        connectionLimit: 10,
      });
      await connector.connect();

      await connector.disconnect();

      expect(mockPool.end).toHaveBeenCalled();
      expect(connector.isConnected()).toBe(false);
    });

    it('应该在未连接时安全调用', async () => {
      connector = new DatabaseConnector({ database: 'test' });

      await expect(connector.disconnect()).resolves.not.toThrow();
    });
  });

  describe('executeQuery', () => {
    beforeEach(async () => {
      connector = new DatabaseConnector({ database: 'test' });
      await connector.connect();
    });

    it('应该执行查询并返回结果', async () => {
      const mockRows = [{ id: 1, name: 'test' }];
      mockConnection.execute.mockResolvedValueOnce([mockRows]);

      const result = await connector.executeQuery('SELECT * FROM users');

      expect(mockConnection.execute).toHaveBeenCalledWith('SELECT * FROM users LIMIT 100');
      expect(result).toEqual(mockRows);
    });

    it('应该使用自定义 limit', async () => {
      const mockRows = [{ id: 1 }];
      mockConnection.execute.mockResolvedValueOnce([mockRows]);

      await connector.executeQuery('SELECT * FROM users', 50);

      expect(mockConnection.execute).toHaveBeenCalledWith('SELECT * FROM users LIMIT 50');
    });

    it('应该在 limit 为 0 时不添加 LIMIT', async () => {
      const mockRows = [{ id: 1 }];
      mockConnection.execute.mockResolvedValueOnce([mockRows]);

      await connector.executeQuery('SELECT * FROM users', 0);

      expect(mockConnection.execute).toHaveBeenCalledWith('SELECT * FROM users');
    });

    it('应该在未连接时抛出错误', async () => {
      const disconnectedConnector = new DatabaseConnector({ database: 'test' });

      await expect(disconnectedConnector.executeQuery('SELECT 1')).rejects.toThrow(
        'Database not connected'
      );
    });

    it('应该处理查询错误', async () => {
      mockConnection.execute.mockRejectedValueOnce(new Error('SQL syntax error'));

      await expect(connector.executeQuery('INVALID SQL')).rejects.toThrow(
        'Query execution failed: SQL syntax error'
      );
    });

    it('应该处理非数组结果', async () => {
      mockConnection.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const result = await connector.executeQuery('UPDATE users SET name = "test"');

      expect(result).toEqual([]);
    });

    it('应该使用连接池执行查询', async () => {
      const poolConnector = new DatabaseConnector({
        database: 'test',
        connectionLimit: 10,
      });
      await poolConnector.connect();

      const mockRows = [{ id: 1 }];
      mockPool.execute.mockResolvedValueOnce([mockRows]);

      const result = await poolConnector.executeQuery('SELECT * FROM users');

      expect(mockPool.execute).toHaveBeenCalled();
      expect(result).toEqual(mockRows);
    });
  });

  describe('isConnected', () => {
    it('应该在未连接时返回 false', () => {
      connector = new DatabaseConnector({ database: 'test' });
      expect(connector.isConnected()).toBe(false);
    });

    it('应该在连接后返回 true', async () => {
      connector = new DatabaseConnector({ database: 'test' });
      await connector.connect();
      expect(connector.isConnected()).toBe(true);
    });

    it('应该在断开连接后返回 false', async () => {
      connector = new DatabaseConnector({ database: 'test' });
      await connector.connect();
      await connector.disconnect();
      expect(connector.isConnected()).toBe(false);
    });
  });
});
