/**
 * PostgreSQL DatabaseConnector 单元测试
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { DatabaseConnector } from './postgres';
import { Client } from 'pg';

// Mock pg
jest.mock('pg');

describe('PostgreSQL DatabaseConnector', () => {
  let connector: DatabaseConnector;
  let mockClient: any;
  let MockClient: any;

  beforeEach(() => {
    mockClient = {
      connect: jest.fn(() => Promise.resolve()),
      query: jest.fn(),
      end: jest.fn(() => Promise.resolve()),
    };

    MockClient = Client as any;
    MockClient.mockImplementation(() => mockClient);

    jest.clearAllMocks();
  });

  describe('构造函数', () => {
    it('应该创建连接器实例', () => {
      connector = new DatabaseConnector();
      expect(connector).toBeInstanceOf(DatabaseConnector);
      expect(connector.isConnected()).toBe(false);
    });
  });

  describe('connect', () => {
    it('应该使用提供的配置连接', async () => {
      connector = new DatabaseConnector();

      await connector.connect({
        host: 'localhost',
        port: 5432,
        database: 'test',
        user: 'postgres',
        password: 'password',
      });

      expect(MockClient).toHaveBeenCalledWith({
        host: 'localhost',
        port: 5432,
        database: 'test',
        user: 'postgres',
        password: 'password',
        ssl: false,
      });
      expect(mockClient.connect).toHaveBeenCalled();
      expect(connector.isConnected()).toBe(true);
    });

    it('应该使用默认值', async () => {
      connector = new DatabaseConnector();

      await connector.connect({ database: 'test' });

      expect(MockClient).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'localhost',
          port: 5432,
          database: 'test',
        })
      );
    });

    it('应该支持 SSL 连接', async () => {
      connector = new DatabaseConnector();

      await connector.connect({
        database: 'test',
        ssl: true,
      });

      expect(MockClient).toHaveBeenCalledWith(
        expect.objectContaining({
          ssl: true,
        })
      );
    });
  });

  describe('disconnect', () => {
    it('应该关闭连接', async () => {
      connector = new DatabaseConnector();
      await connector.connect({ database: 'test' });

      await connector.disconnect();

      expect(mockClient.end).toHaveBeenCalled();
      expect(connector.isConnected()).toBe(false);
    });

    it('应该在未连接时安全调用', async () => {
      connector = new DatabaseConnector();

      await expect(connector.disconnect()).resolves.not.toThrow();
    });
  });

  describe('executeQuery', () => {
    beforeEach(async () => {
      connector = new DatabaseConnector();
      await connector.connect({ database: 'test' });
    });

    it('应该执行查询并返回结果', async () => {
      const mockRows = [{ id: 1, name: 'test' }];
      mockClient.query.mockResolvedValueOnce({ rows: mockRows });

      const result = await connector.executeQuery('SELECT * FROM users');

      expect(mockClient.query).toHaveBeenCalledWith('SELECT * FROM users LIMIT 100');
      expect(result).toEqual(mockRows);
    });

    it('应该使用自定义 limit', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      await connector.executeQuery('SELECT * FROM users', 50);

      expect(mockClient.query).toHaveBeenCalledWith('SELECT * FROM users LIMIT 50');
    });

    it('应该在 limit 为 0 时不添加 LIMIT', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      await connector.executeQuery('SELECT * FROM users', 0);

      expect(mockClient.query).toHaveBeenCalledWith('SELECT * FROM users');
    });

    it('应该在未连接时抛出错误', async () => {
      const disconnectedConnector = new DatabaseConnector();

      await expect(disconnectedConnector.executeQuery('SELECT 1')).rejects.toThrow(
        '数据库未连接'
      );
    });

    it('应该处理查询错误', async () => {
      mockClient.query.mockRejectedValueOnce(new Error('SQL syntax error'));

      await expect(connector.executeQuery('INVALID SQL')).rejects.toThrow(
        '查询执行失败: SQL syntax error'
      );
    });
  });

  describe('isConnected', () => {
    it('应该在未连接时返回 false', () => {
      connector = new DatabaseConnector();
      expect(connector.isConnected()).toBe(false);
    });

    it('应该在连接后返回 true', async () => {
      connector = new DatabaseConnector();
      await connector.connect({ database: 'test' });
      expect(connector.isConnected()).toBe(true);
    });

    it('应该在断开连接后返回 false', async () => {
      connector = new DatabaseConnector();
      await connector.connect({ database: 'test' });
      await connector.disconnect();
      expect(connector.isConnected()).toBe(false);
    });
  });
});
