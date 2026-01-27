/**
 * 错误处理基础类单元测试
 */

import { describe, it, expect } from '@jest/globals';
import {
  SQLZenError,
  DatabaseConnectionError,
  DatabaseQueryError,
  DatabaseNotConnectedError,
  SchemaParseError,
  CubeParseError,
  APIKeyMissingError,
  APIRequestError,
  BashExecutionError,
  CommandNotAllowedError,
  RequiredFieldError,
  InvalidValueError
} from './index';

describe('SQLZenError 基础类', () => {
  it('应该创建带有默认值的错误', () => {
    class TestError extends SQLZenError {
      constructor(message: string) {
        super(message, { code: 'TEST_ERROR' });
      }
    }

    const error = new TestError('测试错误');

    expect(error.message).toBe('测试错误');
    expect(error.code).toBe('TEST_ERROR');
    expect(error.recoverable).toBe(false);
    expect(error.timestamp).toBeInstanceOf(Date);
  });

  it('应该支持所有选项', () => {
    class TestError extends SQLZenError {
      constructor() {
        super('测试错误', {
          code: 'TEST_ERROR',
          context: { key: 'value' },
          cause: new Error('原因'),
          suggestions: ['建议1', '建议2'],
          recoverable: true
        });
      }
    }

    const error = new TestError();

    expect(error.context).toEqual({ key: 'value' });
    expect(error.cause?.message).toBe('原因');
    expect(error.suggestions).toEqual(['建议1', '建议2']);
    expect(error.recoverable).toBe(true);
  });

  it('format() 应该返回格式化的错误信息', () => {
    class TestError extends SQLZenError {
      constructor() {
        super('测试错误', {
          code: 'TEST_ERROR',
          context: { key: 'value' },
          suggestions: ['建议1']
        });
      }
    }

    const error = new TestError();
    const formatted = error.format();

    expect(formatted).toContain('错误: 测试错误');
    expect(formatted).toContain('错误码: TEST_ERROR');
    expect(formatted).toContain('上下文:');
    expect(formatted).toContain('建议:');
  });

  it('toJSON() 应该返回 JSON 对象', () => {
    class TestError extends SQLZenError {
      constructor() {
        super('测试错误', { code: 'TEST_ERROR' });
      }
    }

    const error = new TestError();
    const json = error.toJSON();

    expect(json.name).toBe('TestError');
    expect(json.code).toBe('TEST_ERROR');
    expect(json.message).toBe('测试错误');
    expect(json.timestamp).toBeDefined();
  });
});

describe('DatabaseError 类', () => {
  describe('DatabaseConnectionError', () => {
    it('应该创建连接错误', () => {
      const error = new DatabaseConnectionError('无法连接');

      expect(error.code).toBe('DATABASE_CONNECTION_ERROR');
      expect(error.recoverable).toBe(true);
      expect(error.suggestions).toBeDefined();
      expect(error.suggestions!.length).toBeGreaterThan(0);
    });

    it('应该包含上下文信息', () => {
      const error = new DatabaseConnectionError('无法连接', {
        context: { host: 'localhost', port: 3306 }
      });

      expect(error.context?.host).toBe('localhost');
      expect(error.context?.port).toBe(3306);
    });
  });

  describe('DatabaseQueryError', () => {
    it('应该创建查询错误', () => {
      const error = new DatabaseQueryError('查询失败', {
        sql: 'SELECT * FROM users'
      });

      expect(error.code).toBe('DATABASE_QUERY_ERROR');
      expect(error.sql).toBe('SELECT * FROM users');
      expect(error.context?.sql).toBe('SELECT * FROM users');
    });
  });

  describe('DatabaseNotConnectedError', () => {
    it('应该创建未连接错误', () => {
      const error = new DatabaseNotConnectedError();

      expect(error.code).toBe('DATABASE_NOT_CONNECTED');
      expect(error.message).toBe('数据库未连接');
      expect(error.recoverable).toBe(true);
    });
  });
});

describe('SchemaError 类', () => {
  describe('SchemaParseError', () => {
    it('应该创建解析错误', () => {
      const error = new SchemaParseError('解析失败', {
        filePath: '/path/to/file.yaml',
        line: 10
      });

      expect(error.code).toBe('SCHEMA_PARSE_ERROR');
      expect(error.filePath).toBe('/path/to/file.yaml');
      expect(error.line).toBe(10);
    });

    it('format() 应该包含文件路径', () => {
      const error = new SchemaParseError('解析失败', {
        filePath: '/path/to/file.yaml',
        line: 10
      });

      const formatted = error.format();
      expect(formatted).toContain('文件: /path/to/file.yaml:10');
    });
  });

  describe('CubeParseError', () => {
    it('应该创建 Cube 解析错误', () => {
      const error = new CubeParseError('Cube 解析失败', {
        filePath: '/path/to/cube.yaml'
      });

      expect(error.code).toBe('CUBE_PARSE_ERROR');
      expect(error.filePath).toBe('/path/to/cube.yaml');
    });
  });
});

describe('APIError 类', () => {
  describe('APIKeyMissingError', () => {
    it('应该创建 API 密钥缺失错误', () => {
      const error = new APIKeyMissingError();

      expect(error.code).toBe('API_KEY_MISSING');
      expect(error.message).toContain('ANTHROPIC_API_KEY');
      expect(error.suggestions).toBeDefined();
    });
  });

  describe('APIRequestError', () => {
    it('应该创建 API 请求错误', () => {
      const error = new APIRequestError('请求失败', {
        statusCode: 500,
        endpoint: '/v1/messages'
      });

      expect(error.code).toBe('API_REQUEST_ERROR');
      expect(error.statusCode).toBe(500);
      expect(error.endpoint).toBe('/v1/messages');
    });

    it('format() 应该包含状态码', () => {
      const error = new APIRequestError('请求失败', {
        statusCode: 500
      });

      const formatted = error.format();
      expect(formatted).toContain('状态码: 500');
    });
  });
});

describe('ToolError 类', () => {
  describe('BashExecutionError', () => {
    it('应该创建 Bash 执行错误', () => {
      const error = new BashExecutionError('命令执行失败', {
        command: 'ls -la',
        exitCode: 1,
        stderr: 'Permission denied'
      });

      expect(error.code).toBe('BASH_EXECUTION_ERROR');
      expect(error.command).toBe('ls -la');
      expect(error.exitCode).toBe(1);
      expect(error.stderr).toBe('Permission denied');
    });

    it('format() 应该包含命令信息', () => {
      const error = new BashExecutionError('命令执行失败', {
        command: 'ls -la',
        exitCode: 1
      });

      const formatted = error.format();
      expect(formatted).toContain('命令: ls -la');
      expect(formatted).toContain('退出码: 1');
    });
  });

  describe('CommandNotAllowedError', () => {
    it('应该创建命令不允许错误', () => {
      const error = new CommandNotAllowedError('rm', ['ls', 'cat', 'grep']);

      expect(error.code).toBe('COMMAND_NOT_ALLOWED');
      expect(error.command).toBe('rm');
      expect(error.allowedCommands).toEqual(['ls', 'cat', 'grep']);
      expect(error.message).toContain("'rm'");
    });
  });
});

describe('ValidationError 类', () => {
  describe('RequiredFieldError', () => {
    it('应该创建必填字段错误', () => {
      const error = new RequiredFieldError('name');

      expect(error.code).toBe('REQUIRED_FIELD_MISSING');
      expect(error.field).toBe('name');
      expect(error.message).toContain("'name'");
    });
  });

  describe('InvalidValueError', () => {
    it('应该创建无效值错误', () => {
      const error = new InvalidValueError('type', 'invalid', {
        allowedValues: ['sum', 'count', 'avg']
      });

      expect(error.code).toBe('INVALID_VALUE');
      expect(error.field).toBe('type');
      expect(error.value).toBe('invalid');
      expect(error.allowedValues).toEqual(['sum', 'count', 'avg']);
    });

    it('应该支持期望类型', () => {
      const error = new InvalidValueError('count', 'abc', {
        expectedType: 'number'
      });

      expect(error.expectedType).toBe('number');
      expect(error.message).toContain('number');
    });
  });
});
