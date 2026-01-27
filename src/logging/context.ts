/**
 * 请求上下文模块
 * 使用 AsyncLocalStorage 实现请求追踪
 */

import { AsyncLocalStorage } from 'async_hooks';
import { randomBytes } from 'crypto';

export interface RequestContext {
  requestId: string;
  startTime: number;
  operation?: string;
  userId?: string;
}

// 全局 AsyncLocalStorage 实例
const asyncLocalStorage = new AsyncLocalStorage<RequestContext>();

/**
 * 生成唯一的请求 ID
 */
export function generateRequestId(): string {
  const timestamp = Date.now().toString(36);
  const random = randomBytes(4).toString('hex');
  return `req-${timestamp}-${random}`;
}

/**
 * 创建新的请求上下文
 */
export function createRequestContext(options: Partial<RequestContext> = {}): RequestContext {
  return {
    requestId: options.requestId || generateRequestId(),
    startTime: options.startTime || Date.now(),
    operation: options.operation,
    userId: options.userId
  };
}

/**
 * 获取当前请求上下文
 */
export function getCurrentContext(): RequestContext | undefined {
  return asyncLocalStorage.getStore();
}

/**
 * 在指定上下文中运行函数
 */
export function runWithContext<T>(context: RequestContext, fn: () => T): T {
  return asyncLocalStorage.run(context, fn);
}

/**
 * 在指定上下文中运行异步函数
 */
export async function runWithContextAsync<T>(
  context: RequestContext,
  fn: () => Promise<T>
): Promise<T> {
  return asyncLocalStorage.run(context, fn);
}

/**
 * 获取当前请求 ID（如果存在）
 */
export function getCurrentRequestId(): string | undefined {
  return getCurrentContext()?.requestId;
}

/**
 * 获取当前请求的耗时（毫秒）
 */
export function getElapsedTime(): number | undefined {
  const context = getCurrentContext();
  if (context) {
    return Date.now() - context.startTime;
  }
  return undefined;
}
