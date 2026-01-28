/**
 * API 重试工具
 * 实现指数退避重试机制
 */

import { getLogger } from '../logging/index.js';

export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  shouldRetry?: (error: Error) => boolean;
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  shouldRetry: (error: Error) => {
    // 默认重试网络错误和 5xx 错误
    const message = error.message.toLowerCase();
    return (
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('econnreset') ||
      message.includes('econnrefused') ||
      message.includes('500') ||
      message.includes('502') ||
      message.includes('503') ||
      message.includes('504')
    );
  }
};

/**
 * 延迟指定毫秒数
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 计算指数退避延迟
 */
function calculateDelay(attempt: number, baseDelay: number, maxDelay: number): number {
  // 指数退避 + 随机抖动
  const exponentialDelay = baseDelay * Math.pow(2, attempt);
  const jitter = Math.random() * 0.3 * exponentialDelay; // 30% 抖动
  return Math.min(exponentialDelay + jitter, maxDelay);
}

/**
 * 带重试的异步函数执行
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const logger = getLogger().child({ module: 'retry' });
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // 检查是否应该重试
      if (attempt >= opts.maxRetries || !opts.shouldRetry(lastError)) {
        logger.error('Operation failed after retries', {
          attempt: attempt + 1,
          maxRetries: opts.maxRetries,
          error: lastError.message
        });
        throw lastError;
      }

      // 计算延迟并等待
      const delay = calculateDelay(attempt, opts.baseDelay, opts.maxDelay);
      logger.warn('Operation failed, retrying', {
        attempt: attempt + 1,
        maxRetries: opts.maxRetries,
        delay,
        error: lastError.message
      });

      await sleep(delay);
    }
  }

  // 不应该到达这里，但为了类型安全
  throw lastError || new Error('Retry failed');
}

/**
 * 带超时的 Promise
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeout: number,
  timeoutMessage: string = 'Operation timed out'
): Promise<T> {
  let timeoutId: NodeJS.Timeout;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, timeout);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId!);
    return result;
  } catch (error) {
    clearTimeout(timeoutId!);
    throw error;
  }
}

/**
 * 带重试和超时的异步函数执行
 */
export async function withRetryAndTimeout<T>(
  fn: () => Promise<T>,
  options: RetryOptions & { timeout?: number; timeoutMessage?: string } = {}
): Promise<T> {
  const { timeout, timeoutMessage, ...retryOptions } = options;

  const wrappedFn = timeout
    ? () => withTimeout(fn(), timeout, timeoutMessage)
    : fn;

  return withRetry(wrappedFn, retryOptions);
}
