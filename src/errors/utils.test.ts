/**
 * 错误处理工具函数单元测试
 */

import { describe, it, expect, jest } from '@jest/globals';
import {
  wrapError,
  withRetry,
  ErrorAggregator,
  safeExecute,
  isErrorType,
  formatErrorForLog
} from './utils';
import {
  SQLZenError,
  DatabaseError,
  DatabaseConnectionError,
  DatabaseQueryError,
  SchemaParseError,
  APIRequestError
} from './index';

describe('wrapError', () => {
  it('应该直接返回 SQLZenError 实例', () => {
    const original = new DatabaseConnectionError('连接失败');
    const wrapped = wrapError(original);

    expect(wrapped).toBe(original);
  });

  it('应该将普通 Error 转换为 SQLZenError', () => {
    const original = new Error('普通错误');
    const wrapped = wrapError(original);

    expect(wrapped).toBeInstanceOf(SQLZenError);
    expect(wrapped.cause).toBe(original);
  });

  it('应该根据错误消息推断类型 - 连接错误', () => {
    const original = new Error('ECONNREFUSED');
    const wrapped = wrapError(original);

    expect(wrapped).toBeInstanceOf(DatabaseConnectionError);
  });

  it('应该根据错误消息推断类型 - SQL 错误', () => {
    const original = new Error('SQL syntax error');
    const wrapped = wrapError(original);

    expect(wrapped).toBeInstanceOf(DatabaseQueryError);
  });

  it('应该根据错误消息推断类型 - 解析错误', () => {
    const original = new Error('YAML parse error');
    const wrapped = wrapError(original);

    expect(wrapped).toBeInstanceOf(SchemaParseError);
  });

  it('应该使用默认错误类', () => {
    const original = new Error('未知错误');
    const wrapped = wrapError(original, APIRequestError);

    expect(wrapped).toBeInstanceOf(APIRequestError);
  });
});

describe('withRetry', () => {
  it('应该在成功时直接返回结果', async () => {
    const fn = jest.fn(() => Promise.resolve('success'));

    const result = await withRetry(fn);

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('应该在失败后重试', async () => {
    let attempts = 0;
    const fn = jest.fn(() => {
      attempts++;
      if (attempts < 3) {
        return Promise.reject(new Error('失败'));
      }
      return Promise.resolve('success');
    });

    const result = await withRetry(fn, { maxRetries: 3, delay: 10 });

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('应该在达到最大重试次数后抛出错误', async () => {
    const fn = jest.fn(() => Promise.reject(new Error('始终失败')));

    await expect(withRetry(fn, { maxRetries: 2, delay: 10 })).rejects.toThrow('始终失败');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('应该调用 onRetry 回调', async () => {
    let attempts = 0;
    const fn = jest.fn(() => {
      attempts++;
      if (attempts < 2) {
        return Promise.reject(new Error('失败'));
      }
      return Promise.resolve('success');
    });

    const onRetry = jest.fn();

    await withRetry(fn, { maxRetries: 3, delay: 10, onRetry });

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('应该根据 shouldRetry 决定是否重试', async () => {
    const fn = jest.fn(() => Promise.reject(new DatabaseConnectionError('连接失败')));
    const shouldRetry = jest.fn(() => false);

    await expect(withRetry(fn, { maxRetries: 3, delay: 10, shouldRetry })).rejects.toThrow();
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('ErrorAggregator', () => {
  it('应该收集多个错误', () => {
    const aggregator = new ErrorAggregator();

    aggregator.add(new DatabaseConnectionError('错误1'));
    aggregator.add(new DatabaseQueryError('错误2'));

    expect(aggregator.hasErrors()).toBe(true);
    expect(aggregator.count()).toBe(2);
  });

  it('应该将字符串转换为错误', () => {
    const aggregator = new ErrorAggregator();

    aggregator.add('字符串错误');

    expect(aggregator.hasErrors()).toBe(true);
    expect(aggregator.getErrors()[0]).toBeInstanceOf(SQLZenError);
  });

  it('应该格式化所有错误', () => {
    const aggregator = new ErrorAggregator();

    aggregator.add(new DatabaseConnectionError('错误1'));
    aggregator.add(new DatabaseQueryError('错误2'));

    const formatted = aggregator.format();

    expect(formatted).toContain('发现 2 个错误');
    expect(formatted).toContain('[1]');
    expect(formatted).toContain('[2]');
  });

  it('应该在有错误时抛出', () => {
    const aggregator = new ErrorAggregator();

    aggregator.add(new DatabaseConnectionError('错误1'));

    expect(() => aggregator.throwIfErrors()).toThrow();
  });

  it('应该在没有错误时不抛出', () => {
    const aggregator = new ErrorAggregator();

    expect(() => aggregator.throwIfErrors()).not.toThrow();
  });

  it('应该清空错误', () => {
    const aggregator = new ErrorAggregator();

    aggregator.add(new DatabaseConnectionError('错误1'));
    aggregator.clear();

    expect(aggregator.hasErrors()).toBe(false);
    expect(aggregator.count()).toBe(0);
  });
});

describe('safeExecute', () => {
  it('应该在成功时返回数据', async () => {
    const result = await safeExecute(() => Promise.resolve('success'));

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('success');
    }
  });

  it('应该在失败时返回错误', async () => {
    const result = await safeExecute(() => Promise.reject(new Error('失败')));

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeInstanceOf(SQLZenError);
    }
  });
});

describe('isErrorType', () => {
  it('应该正确识别错误类型', () => {
    const error = new DatabaseConnectionError('连接失败');

    expect(isErrorType(error, DatabaseConnectionError)).toBe(true);
    expect(isErrorType(error, DatabaseError)).toBe(true);
    // SQLZenError is abstract, so we use instanceof directly
    expect(error instanceof SQLZenError).toBe(true);
    expect(isErrorType(error, SchemaParseError)).toBe(false);
  });
});

describe('formatErrorForLog', () => {
  it('应该格式化 SQLZenError', () => {
    const error = new DatabaseConnectionError('连接失败');
    const formatted = formatErrorForLog(error);

    expect(formatted).toContain('DATABASE_CONNECTION_ERROR');
    expect(formatted).toContain('连接失败');
  });

  it('应该格式化普通 Error', () => {
    const error = new Error('普通错误');
    const formatted = formatErrorForLog(error);

    expect(formatted).toContain('普通错误');
    expect(formatted).toContain('Error');
  });

  it('应该处理非 Error 值', () => {
    const formatted = formatErrorForLog('字符串错误');

    expect(formatted).toBe('字符串错误');
  });
});
