import { describe, it, expect } from '@jest/globals';
import {
  generateRequestId,
  createRequestContext,
  getCurrentContext,
  runWithContext,
  runWithContextAsync,
  getCurrentRequestId,
  getElapsedTime
} from './context.js';

describe('Request Context', () => {
  describe('generateRequestId', () => {
    it('should generate unique request IDs', () => {
      const id1 = generateRequestId();
      const id2 = generateRequestId();

      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^req-[a-z0-9]+-[a-f0-9]+$/);
    });
  });

  describe('createRequestContext', () => {
    it('should create context with default values', () => {
      const context = createRequestContext();

      expect(context.requestId).toBeDefined();
      expect(context.startTime).toBeDefined();
      expect(context.startTime).toBeLessThanOrEqual(Date.now());
    });

    it('should create context with custom values', () => {
      const context = createRequestContext({
        requestId: 'custom-id',
        operation: 'test-operation',
        userId: 'user-123'
      });

      expect(context.requestId).toBe('custom-id');
      expect(context.operation).toBe('test-operation');
      expect(context.userId).toBe('user-123');
    });
  });

  describe('runWithContext', () => {
    it('should run function with context', () => {
      const context = createRequestContext({ requestId: 'test-req' });

      const result = runWithContext(context, () => {
        const current = getCurrentContext();
        return current?.requestId;
      });

      expect(result).toBe('test-req');
    });

    it('should return undefined outside context', () => {
      const context = getCurrentContext();
      expect(context).toBeUndefined();
    });
  });

  describe('runWithContextAsync', () => {
    it('should run async function with context', async () => {
      const context = createRequestContext({ requestId: 'async-req' });

      const result = await runWithContextAsync(context, async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        const current = getCurrentContext();
        return current?.requestId;
      });

      expect(result).toBe('async-req');
    });
  });

  describe('getCurrentRequestId', () => {
    it('should return request ID when in context', () => {
      const context = createRequestContext({ requestId: 'req-id-test' });

      runWithContext(context, () => {
        const requestId = getCurrentRequestId();
        expect(requestId).toBe('req-id-test');
      });
    });

    it('should return undefined when not in context', () => {
      const requestId = getCurrentRequestId();
      expect(requestId).toBeUndefined();
    });
  });

  describe('getElapsedTime', () => {
    it('should return elapsed time when in context', () => {
      const context = createRequestContext();

      runWithContext(context, () => {
        // Wait a bit
        const start = Date.now();
        while (Date.now() - start < 10) {
          // busy wait
        }

        const elapsed = getElapsedTime();
        expect(elapsed).toBeDefined();
        expect(elapsed).toBeGreaterThanOrEqual(0);
      });
    });

    it('should return undefined when not in context', () => {
      const elapsed = getElapsedTime();
      expect(elapsed).toBeUndefined();
    });
  });
});
