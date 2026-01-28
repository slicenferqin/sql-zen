/**
 * 重试机制单元测试
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { withRetry, withTimeout, withRetryAndTimeout } from './retry';

describe('Retry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('withRetry', () => {
    it('应该在成功时直接返回结果', async () => {
      const fn = jest.fn<() => Promise<string>>().mockResolvedValue('success');

      const result = await withRetry(fn);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('应该在失败后重试', async () => {
      const fn = jest.fn<() => Promise<string>>()
        .mockRejectedValueOnce(new Error('network error'))
        .mockResolvedValueOnce('success');

      const result = await withRetry(fn, { maxRetries: 3, baseDelay: 10 });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('应该在达到最大重试次数后抛出错误', async () => {
      const fn = jest.fn<() => Promise<string>>().mockRejectedValue(new Error('network error'));

      await expect(withRetry(fn, { maxRetries: 2, baseDelay: 10 }))
        .rejects.toThrow('network error');

      expect(fn).toHaveBeenCalledTimes(3); // 初始 + 2 次重试
    });

    it('应该根据 shouldRetry 决定是否重试', async () => {
      const fn = jest.fn<() => Promise<string>>().mockRejectedValue(new Error('fatal error'));
      const shouldRetry = jest.fn(() => false);

      await expect(withRetry(fn, { maxRetries: 3, shouldRetry }))
        .rejects.toThrow('fatal error');

      expect(fn).toHaveBeenCalledTimes(1);
      expect(shouldRetry).toHaveBeenCalledTimes(1);
    });

    it('应该对网络错误进行重试', async () => {
      const fn = jest.fn<() => Promise<string>>()
        .mockRejectedValueOnce(new Error('network timeout'))
        .mockResolvedValueOnce('success');

      const result = await withRetry(fn, { maxRetries: 3, baseDelay: 10 });

      expect(result).toBe('success');
    });

    it('应该对 5xx 错误进行重试', async () => {
      const fn = jest.fn<() => Promise<string>>()
        .mockRejectedValueOnce(new Error('503 Service Unavailable'))
        .mockResolvedValueOnce('success');

      const result = await withRetry(fn, { maxRetries: 3, baseDelay: 10 });

      expect(result).toBe('success');
    });
  });

  describe('withTimeout', () => {
    it('应该在超时前返回结果', async () => {
      const promise = Promise.resolve('success');

      const result = await withTimeout(promise, 1000);

      expect(result).toBe('success');
    });

    it('应该在超时后抛出错误', async () => {
      const promise = new Promise((resolve) => setTimeout(() => resolve('success'), 100));

      await expect(withTimeout(promise, 10))
        .rejects.toThrow('Operation timed out');
    });

    it('应该使用自定义超时消息', async () => {
      const promise = new Promise((resolve) => setTimeout(() => resolve('success'), 100));

      await expect(withTimeout(promise, 10, 'Custom timeout message'))
        .rejects.toThrow('Custom timeout message');
    });
  });

  describe('withRetryAndTimeout', () => {
    it('应该结合重试和超时', async () => {
      const fn = jest.fn<() => Promise<string>>()
        .mockRejectedValueOnce(new Error('network error'))
        .mockResolvedValueOnce('success');

      const result = await withRetryAndTimeout(fn, {
        maxRetries: 3,
        baseDelay: 10,
        timeout: 1000
      });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('应该在超时后重试（当超时消息包含 timeout）', async () => {
      let callCount = 0;
      const fn = jest.fn<() => Promise<string>>(() => {
        callCount++;
        if (callCount === 1) {
          // 第一次调用超时
          return new Promise((resolve) => setTimeout(() => resolve('slow'), 200));
        }
        // 第二次调用快速返回
        return Promise.resolve('fast');
      });

      const result = await withRetryAndTimeout(fn, {
        maxRetries: 3,
        baseDelay: 10,
        timeout: 50,
        timeoutMessage: 'Operation timeout' // 包含 'timeout' 关键字以触发重试
      });

      expect(result).toBe('fast');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('应该在没有超时时只使用重试', async () => {
      const fn = jest.fn<() => Promise<string>>()
        .mockRejectedValueOnce(new Error('network error'))
        .mockResolvedValueOnce('success');

      const result = await withRetryAndTimeout(fn, {
        maxRetries: 3,
        baseDelay: 10
      });

      expect(result).toBe('success');
    });
  });
});
