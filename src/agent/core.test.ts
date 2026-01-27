/**
 * SQLZenAgent 单元测试
 *
 * 测试 Agent 的核心功能
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { SQLZenAgent } from './core';

describe('SQLZenAgent', () => {
  let agent: SQLZenAgent;
  let mockAnthropicClient: any;
  let mockDbConnection: any;
  let mockMysqlModule: any;

  beforeEach(() => {
    // 设置测试环境变量
    process.env.ANTHROPIC_API_KEY = 'test-api-key';

    // 创建 mock 对象
    mockAnthropicClient = {
      messages: {
        create: jest.fn(),
      },
    };

    mockDbConnection = {
      query: jest.fn(),
      end: jest.fn(),
    };

    mockMysqlModule = {
      createConnection: jest.fn(() => Promise.resolve(mockDbConnection)) as any,
    };

    // 使用依赖注入创建 agent
    agent = new SQLZenAgent(
      { model: 'claude-3-5-sonnet-20241022' },
      {
        anthropicClient: mockAnthropicClient as any,
        mysqlModule: mockMysqlModule as any,
      }
    );
  });

  afterEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
    jest.clearAllMocks();
  });

  describe('初始化', () => {
    it('应该成功初始化 Agent', () => {
      expect(agent).toBeInstanceOf(SQLZenAgent);
    });

    it('应该从环境变量读取 API Key（无依赖注入）', () => {
      process.env.ANTHROPIC_API_KEY = 'env-api-key';
      expect(() => {
        new SQLZenAgent();
      }).not.toThrow();
    });

    it('应该支持自定义模型', () => {
      const customAgent = new SQLZenAgent(
        { model: 'claude-3-opus-20240229' },
        { anthropicClient: mockAnthropicClient as any }
      );
      expect(customAgent).toBeInstanceOf(SQLZenAgent);
    });

    it('应该支持自定义 baseURL', () => {
      const customAgent = new SQLZenAgent(
        { baseURL: 'https://custom-api.com' },
        { anthropicClient: mockAnthropicClient as any }
      );
      expect(customAgent).toBeInstanceOf(SQLZenAgent);
    });

    it('应该在缺少 API Key 时抛出错误（无依赖注入）', () => {
      delete process.env.ANTHROPIC_API_KEY;
      expect(() => {
        new SQLZenAgent();
      }).toThrow('ANTHROPIC_API_KEY 环境变量未设置');
    });

    it('应该支持通过依赖注入提供 Anthropic 客户端', () => {
      const injectedAgent = new SQLZenAgent(
        {},
        { anthropicClient: mockAnthropicClient as any }
      );
      expect(injectedAgent).toBeInstanceOf(SQLZenAgent);
    });
  });

  describe('数据库连接', () => {
    it('应该成功连接到数据库', async () => {
      await agent.initialize({
        host: 'localhost',
        port: 3306,
        database: 'test',
        user: 'root',
        password: '',
      });

      expect(mockMysqlModule.createConnection).toHaveBeenCalledWith({
        host: 'localhost',
        port: 3306,
        database: 'test',
        user: 'root',
        password: '',
      });
    });

    it('应该使用默认端口', async () => {
      await agent.initialize({
        database: 'test',
        user: 'root',
      });

      expect(mockMysqlModule.createConnection).toHaveBeenCalledWith({
        host: 'localhost',
        port: 3306,
        database: 'test',
        user: 'root',
        password: '',
      });
    });

    it('应该能够断开数据库连接', async () => {
      await agent.initialize({
        database: 'test',
        user: 'root',
      });

      await agent.cleanup();
      expect(mockDbConnection.end).toHaveBeenCalled();
    });

    it('应该支持通过依赖注入提供数据库连接', async () => {
      const injectedAgent = new SQLZenAgent(
        {},
        {
          anthropicClient: mockAnthropicClient as any,
          dbConnection: mockDbConnection,
        }
      );

      // 初始化时不应该创建新连接
      await injectedAgent.initialize({ database: 'test' });
      expect(mockMysqlModule.createConnection).not.toHaveBeenCalled();
    });
  });

  describe('processQuery', () => {
    beforeEach(() => {
      mockAnthropicClient.messages.create.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: '总共有 100 个用户',
          },
        ],
      });
    });

    it('应该成功执行简单查询', async () => {
      const result = await agent.processQuery('有多少用户？');
      expect(result).toBe('总共有 100 个用户');
      expect(mockAnthropicClient.messages.create).toHaveBeenCalledWith({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        system: expect.any(String),
        messages: [
          {
            role: 'user',
            content: '有多少用户？',
          },
        ],
      });
    });

    it('应该处理空响应', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue({
        content: [],
      });

      const result = await agent.processQuery('有多少用户？');
      expect(result).toBe('');
    });

    it('应该处理非文本内容块', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue({
        content: [
          {
            type: 'image',
            source: {},
          },
        ],
      });

      const result = await agent.processQuery('有多少用户？');
      expect(result).toBe('');
    });

    it('应该传递正确的 system prompt', async () => {
      await agent.processQuery('有多少用户？');
      const callArgs = mockAnthropicClient.messages.create.mock.calls[0][0];
      expect(callArgs.system).toContain('SQL-Zen');
      expect(callArgs.system).toContain('dual-layer semantic architecture');
    });

    it('应该处理 API 错误', async () => {
      mockAnthropicClient.messages.create.mockRejectedValue(
        new Error('API Error: Rate limit exceeded')
      );

      await expect(agent.processQuery('有多少用户？')).rejects.toThrow(
        'API Error: Rate limit exceeded'
      );
    });
  });

  describe('processQueryWithTools', () => {
    beforeEach(async () => {
      mockDbConnection.query.mockResolvedValue([[]]);
      // 初始化数据库连接
      await agent.initialize({ database: 'test', user: 'root' });
    });

    it('应该处理需要工具调用的查询', async () => {
      mockAnthropicClient.messages.create
        .mockResolvedValueOnce({
          stop_reason: 'tool_use',
          content: [
            {
              type: 'tool_use',
              id: 'tool_1',
              name: 'execute_sql',
              input: {
                sql: 'SELECT COUNT(*) FROM users',
                limit: 100,
              },
            },
          ],
        })
        .mockResolvedValueOnce({
          stop_reason: 'end_turn',
          content: [
            {
              type: 'text',
              text: '总共有 100 个用户',
            },
          ],
        });

      const result = await agent.processQueryWithTools('有多少用户？', { useCache: false });
      expect(result).toBe('总共有 100 个用户');
      expect(mockAnthropicClient.messages.create).toHaveBeenCalledTimes(2);
    });

    it('应该处理无工具调用的响应', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue({
        stop_reason: 'end_turn',
        content: [
          {
            type: 'text',
            text: '根据我的理解，这是一个简单的统计问题',
          },
        ],
      });

      const result = await agent.processQueryWithTools('你好', { useCache: false });
      expect(result).toBe('根据我的理解，这是一个简单的统计问题');
      expect(mockAnthropicClient.messages.create).toHaveBeenCalledTimes(1);
    });

    it('应该在未连接数据库时抛出错误', async () => {
      // 创建一个没有数据库连接的新 agent（禁用缓存）
      const agentWithoutDb = new SQLZenAgent(
        { cache: { enabled: false } },
        { anthropicClient: mockAnthropicClient as any }
      );

      mockAnthropicClient.messages.create.mockResolvedValue({
        stop_reason: 'tool_use',
        content: [
          {
            type: 'tool_use',
            id: 'tool_1',
            name: 'execute_sql',
            input: {
              sql: 'SELECT COUNT(*) FROM users',
              limit: 100,
            },
          },
        ],
      });

      await expect(
        agentWithoutDb.processQueryWithTools('有多少用户？')
      ).rejects.toThrow('数据库未连接');
    });

    it('应该正确执行 SQL 查询', async () => {
      const mockRows = [{ count: 100 }];
      mockDbConnection.query.mockResolvedValue([mockRows]);

      mockAnthropicClient.messages.create
        .mockResolvedValueOnce({
          stop_reason: 'tool_use',
          content: [
            {
              type: 'tool_use',
              id: 'tool_1',
              name: 'execute_sql',
              input: {
                sql: 'SELECT COUNT(*) as count FROM users',
                limit: 100,
              },
            },
          ],
        })
        .mockResolvedValueOnce({
          stop_reason: 'end_turn',
          content: [
            {
              type: 'text',
              text: '查询成功',
            },
          ],
        });

      // 使用 useCache: false 来避免缓存命中
      await agent.processQueryWithTools('有多少用户？', { useCache: false });

      expect(mockDbConnection.query).toHaveBeenCalledWith(
        'SELECT COUNT(*) as count FROM users LIMIT 100'
      );
    });
  });

  describe('错误处理', () => {
    it('应该处理 API 调用失败', async () => {
      mockAnthropicClient.messages.create.mockRejectedValue(
        new Error('Network error')
      );

      await expect(
        agent.processQuery('有多少用户？')
      ).rejects.toThrow('Network error');
    });

    it('应该处理无效的响应格式', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue({
        content: 'invalid format',
      });

      const result = await agent.processQuery('有多少用户？');
      expect(result).toBe('');
    });

    it('应该处理数据库查询错误', async () => {
      await agent.initialize({ database: 'test', user: 'root' });

      mockDbConnection.query.mockRejectedValue(
        new Error('SQL syntax error')
      );

      mockAnthropicClient.messages.create
        .mockResolvedValueOnce({
          stop_reason: 'tool_use',
          content: [
            {
              type: 'tool_use',
              id: 'tool_1',
              name: 'execute_sql',
              input: {
                sql: 'INVALID SQL',
                limit: 100,
              },
            },
          ],
        })
        .mockResolvedValueOnce({
          stop_reason: 'end_turn',
          content: [
            {
              type: 'text',
              text: '查询失败',
            },
          ],
        });

      // 不应该抛出错误，而是返回错误信息给 AI
      const result = await agent.processQueryWithTools('执行无效查询');
      expect(result).toBe('查询失败');
    });
  });
});
