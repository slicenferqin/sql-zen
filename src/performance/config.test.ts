/**
 * 性能配置单元测试
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { loadPerformanceConfig, DEFAULT_PERFORMANCE_CONFIG } from './config';

describe('PerformanceConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('DEFAULT_PERFORMANCE_CONFIG', () => {
    it('应该有正确的默认查询配置', () => {
      expect(DEFAULT_PERFORMANCE_CONFIG.query.maxRows).toBe(10000);
      expect(DEFAULT_PERFORMANCE_CONFIG.query.defaultLimit).toBe(100);
      expect(DEFAULT_PERFORMANCE_CONFIG.query.timeout).toBe(30000);
    });

    it('应该有正确的默认连接池配置', () => {
      expect(DEFAULT_PERFORMANCE_CONFIG.connectionPool.minConnections).toBe(2);
      expect(DEFAULT_PERFORMANCE_CONFIG.connectionPool.maxConnections).toBe(10);
      expect(DEFAULT_PERFORMANCE_CONFIG.connectionPool.acquireTimeout).toBe(10000);
      expect(DEFAULT_PERFORMANCE_CONFIG.connectionPool.idleTimeout).toBe(60000);
    });

    it('应该有正确的默认 API 配置', () => {
      expect(DEFAULT_PERFORMANCE_CONFIG.api.maxRetries).toBe(3);
      expect(DEFAULT_PERFORMANCE_CONFIG.api.baseDelay).toBe(1000);
      expect(DEFAULT_PERFORMANCE_CONFIG.api.maxDelay).toBe(10000);
      expect(DEFAULT_PERFORMANCE_CONFIG.api.timeout).toBe(60000);
    });

    it('应该有正确的默认消息历史配置', () => {
      expect(DEFAULT_PERFORMANCE_CONFIG.messageHistory.maxMessages).toBe(20);
      expect(DEFAULT_PERFORMANCE_CONFIG.messageHistory.preserveSystemMessage).toBe(true);
    });

    it('应该有正确的默认 Schema 缓存配置', () => {
      expect(DEFAULT_PERFORMANCE_CONFIG.schemaCache.enabled).toBe(true);
      expect(DEFAULT_PERFORMANCE_CONFIG.schemaCache.ttl).toBe(60000);
      expect(DEFAULT_PERFORMANCE_CONFIG.schemaCache.maxSize).toBe(100);
    });
  });

  describe('loadPerformanceConfig', () => {
    it('应该返回默认配置（无环境变量）', () => {
      const config = loadPerformanceConfig();
      expect(config).toEqual(DEFAULT_PERFORMANCE_CONFIG);
    });

    it('应该从环境变量加载查询配置', () => {
      process.env.QUERY_MAX_ROWS = '5000';
      process.env.QUERY_DEFAULT_LIMIT = '50';
      process.env.QUERY_TIMEOUT = '15000';

      const config = loadPerformanceConfig();

      expect(config.query.maxRows).toBe(5000);
      expect(config.query.defaultLimit).toBe(50);
      expect(config.query.timeout).toBe(15000);
    });

    it('应该从环境变量加载连接池配置', () => {
      process.env.DB_POOL_MIN = '5';
      process.env.DB_POOL_MAX = '20';

      const config = loadPerformanceConfig();

      expect(config.connectionPool.minConnections).toBe(5);
      expect(config.connectionPool.maxConnections).toBe(20);
    });

    it('应该从环境变量加载 API 配置', () => {
      process.env.API_MAX_RETRIES = '5';
      process.env.API_TIMEOUT = '120000';

      const config = loadPerformanceConfig();

      expect(config.api.maxRetries).toBe(5);
      expect(config.api.timeout).toBe(120000);
    });

    it('应该从环境变量加载消息历史配置', () => {
      process.env.MAX_MESSAGES = '50';

      const config = loadPerformanceConfig();

      expect(config.messageHistory.maxMessages).toBe(50);
    });

    it('应该从环境变量加载 Schema 缓存配置', () => {
      process.env.SCHEMA_CACHE_ENABLED = 'false';
      process.env.SCHEMA_CACHE_TTL = '120000';

      const config = loadPerformanceConfig();

      expect(config.schemaCache.enabled).toBe(false);
      expect(config.schemaCache.ttl).toBe(120000);
    });

    it('应该正确解析 SCHEMA_CACHE_ENABLED=true', () => {
      process.env.SCHEMA_CACHE_ENABLED = 'true';

      const config = loadPerformanceConfig();

      expect(config.schemaCache.enabled).toBe(true);
    });
  });
});
