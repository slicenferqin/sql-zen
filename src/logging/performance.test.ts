import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  PerformanceMonitor,
  getPerformanceMonitor,
  resetPerformanceMonitor
} from './performance.js';

describe('PerformanceMonitor', () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    monitor = new PerformanceMonitor();
  });

  describe('recordQueryTime', () => {
    it('should record query execution time', () => {
      monitor.recordQueryTime(100);
      monitor.recordQueryTime(200);

      const metrics = monitor.getMetrics();
      expect(metrics.queryExecutionTimes).toEqual([100, 200]);
      expect(metrics.totalQueries).toBe(2);
    });

    it('should limit samples to maxSamples', () => {
      const smallMonitor = new PerformanceMonitor(3);
      smallMonitor.recordQueryTime(100);
      smallMonitor.recordQueryTime(200);
      smallMonitor.recordQueryTime(300);
      smallMonitor.recordQueryTime(400);

      const metrics = smallMonitor.getMetrics();
      expect(metrics.queryExecutionTimes).toEqual([200, 300, 400]);
      expect(metrics.totalQueries).toBe(4);
    });
  });

  describe('recordApiTime', () => {
    it('should record API request time', () => {
      monitor.recordApiTime(500);
      monitor.recordApiTime(600);

      const metrics = monitor.getMetrics();
      expect(metrics.apiRequestTimes).toEqual([500, 600]);
    });
  });

  describe('recordCacheHit/Miss', () => {
    it('should record cache hits', () => {
      monitor.recordCacheHit();
      monitor.recordCacheHit();

      const metrics = monitor.getMetrics();
      expect(metrics.cacheHits).toBe(2);
    });

    it('should record cache misses', () => {
      monitor.recordCacheMiss();
      monitor.recordCacheMiss();
      monitor.recordCacheMiss();

      const metrics = monitor.getMetrics();
      expect(metrics.cacheMisses).toBe(3);
    });
  });

  describe('getSummary', () => {
    it('should calculate correct averages', () => {
      monitor.recordQueryTime(100);
      monitor.recordQueryTime(200);
      monitor.recordQueryTime(300);

      const summary = monitor.getSummary();
      expect(summary.avgQueryTime).toBe(200);
      expect(summary.minQueryTime).toBe(100);
      expect(summary.maxQueryTime).toBe(300);
    });

    it('should calculate cache hit rate', () => {
      monitor.recordCacheHit();
      monitor.recordCacheHit();
      monitor.recordCacheMiss();
      monitor.recordCacheMiss();

      const summary = monitor.getSummary();
      expect(summary.cacheHitRate).toBe(50);
    });

    it('should handle empty metrics', () => {
      const summary = monitor.getSummary();
      expect(summary.avgQueryTime).toBe(0);
      expect(summary.minQueryTime).toBe(0);
      expect(summary.maxQueryTime).toBe(0);
      expect(summary.cacheHitRate).toBe(0);
    });
  });

  describe('formatSummary', () => {
    it('should return formatted string', () => {
      monitor.recordQueryTime(100);
      monitor.recordApiTime(500);
      monitor.recordCacheHit();

      const formatted = monitor.formatSummary();
      expect(typeof formatted).toBe('string');
      expect(formatted).toContain('Performance Statistics');
      expect(formatted).toContain('Query Execution');
      expect(formatted).toContain('API Requests');
      expect(formatted).toContain('Cache');
    });
  });

  describe('reset', () => {
    it('should reset all metrics', () => {
      monitor.recordQueryTime(100);
      monitor.recordApiTime(500);
      monitor.recordCacheHit();

      monitor.reset();

      const metrics = monitor.getMetrics();
      expect(metrics.queryExecutionTimes).toEqual([]);
      expect(metrics.apiRequestTimes).toEqual([]);
      expect(metrics.cacheHits).toBe(0);
      expect(metrics.cacheMisses).toBe(0);
      expect(metrics.totalQueries).toBe(0);
    });
  });

  describe('startTimer', () => {
    it('should return a function that returns elapsed time', () => {
      const timer = monitor.startTimer();
      expect(typeof timer).toBe('function');

      // Wait a bit
      const start = Date.now();
      while (Date.now() - start < 10) {
        // busy wait
      }

      const elapsed = timer();
      expect(typeof elapsed).toBe('number');
      expect(elapsed).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('Global PerformanceMonitor', () => {
  beforeEach(() => {
    resetPerformanceMonitor();
  });

  it('should return the same instance', () => {
    const monitor1 = getPerformanceMonitor();
    const monitor2 = getPerformanceMonitor();
    expect(monitor1).toBe(monitor2);
  });

  it('should reset global monitor', () => {
    const monitor = getPerformanceMonitor();
    monitor.recordQueryTime(100);

    resetPerformanceMonitor();

    const metrics = monitor.getMetrics();
    expect(metrics.queryExecutionTimes).toEqual([]);
  });
});
