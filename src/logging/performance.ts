/**
 * 性能监控模块
 * 记录查询时间、API 延迟、缓存性能等指标
 */

export interface PerformanceMetrics {
  queryExecutionTimes: number[];
  apiRequestTimes: number[];
  cacheHits: number;
  cacheMisses: number;
  totalQueries: number;
  startTime: number;
}

export interface PerformanceSummary {
  avgQueryTime: number;
  maxQueryTime: number;
  minQueryTime: number;
  avgApiTime: number;
  maxApiTime: number;
  minApiTime: number;
  cacheHitRate: number;
  totalQueries: number;
  totalCacheHits: number;
  totalCacheMisses: number;
  uptime: number;
}

/**
 * 性能监控器
 */
export class PerformanceMonitor {
  private metrics: PerformanceMetrics;
  private maxSamples: number;

  constructor(maxSamples: number = 1000) {
    this.maxSamples = maxSamples;
    this.metrics = this.createEmptyMetrics();
  }

  private createEmptyMetrics(): PerformanceMetrics {
    return {
      queryExecutionTimes: [],
      apiRequestTimes: [],
      cacheHits: 0,
      cacheMisses: 0,
      totalQueries: 0,
      startTime: Date.now()
    };
  }

  /**
   * 记录查询执行时间
   */
  recordQueryTime(duration: number): void {
    this.metrics.queryExecutionTimes.push(duration);
    this.metrics.totalQueries++;

    // 限制样本数量
    if (this.metrics.queryExecutionTimes.length > this.maxSamples) {
      this.metrics.queryExecutionTimes.shift();
    }
  }

  /**
   * 记录 API 请求时间
   */
  recordApiTime(duration: number): void {
    this.metrics.apiRequestTimes.push(duration);

    // 限制样本数量
    if (this.metrics.apiRequestTimes.length > this.maxSamples) {
      this.metrics.apiRequestTimes.shift();
    }
  }

  /**
   * 记录缓存命中
   */
  recordCacheHit(): void {
    this.metrics.cacheHits++;
  }

  /**
   * 记录缓存未命中
   */
  recordCacheMiss(): void {
    this.metrics.cacheMisses++;
  }

  /**
   * 获取原始指标数据
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * 获取性能摘要
   */
  getSummary(): PerformanceSummary {
    const queryTimes = this.metrics.queryExecutionTimes;
    const apiTimes = this.metrics.apiRequestTimes;
    const totalCacheRequests = this.metrics.cacheHits + this.metrics.cacheMisses;

    return {
      avgQueryTime: this.calculateAverage(queryTimes),
      maxQueryTime: queryTimes.length > 0 ? Math.max(...queryTimes) : 0,
      minQueryTime: queryTimes.length > 0 ? Math.min(...queryTimes) : 0,
      avgApiTime: this.calculateAverage(apiTimes),
      maxApiTime: apiTimes.length > 0 ? Math.max(...apiTimes) : 0,
      minApiTime: apiTimes.length > 0 ? Math.min(...apiTimes) : 0,
      cacheHitRate: totalCacheRequests > 0
        ? (this.metrics.cacheHits / totalCacheRequests) * 100
        : 0,
      totalQueries: this.metrics.totalQueries,
      totalCacheHits: this.metrics.cacheHits,
      totalCacheMisses: this.metrics.cacheMisses,
      uptime: Date.now() - this.metrics.startTime
    };
  }

  /**
   * 格式化性能摘要为可读字符串
   */
  formatSummary(): string {
    const summary = this.getSummary();
    const uptimeSeconds = Math.floor(summary.uptime / 1000);
    const uptimeMinutes = Math.floor(uptimeSeconds / 60);
    const uptimeHours = Math.floor(uptimeMinutes / 60);

    let uptimeStr: string;
    if (uptimeHours > 0) {
      uptimeStr = `${uptimeHours}h ${uptimeMinutes % 60}m`;
    } else if (uptimeMinutes > 0) {
      uptimeStr = `${uptimeMinutes}m ${uptimeSeconds % 60}s`;
    } else {
      uptimeStr = `${uptimeSeconds}s`;
    }

    const lines = [
      '=== Performance Statistics ===',
      '',
      'Query Execution:',
      `  Total Queries: ${summary.totalQueries}`,
      `  Avg Time: ${summary.avgQueryTime.toFixed(2)}ms`,
      `  Min Time: ${summary.minQueryTime.toFixed(2)}ms`,
      `  Max Time: ${summary.maxQueryTime.toFixed(2)}ms`,
      '',
      'API Requests:',
      `  Avg Time: ${summary.avgApiTime.toFixed(2)}ms`,
      `  Min Time: ${summary.minApiTime.toFixed(2)}ms`,
      `  Max Time: ${summary.maxApiTime.toFixed(2)}ms`,
      '',
      'Cache:',
      `  Hit Rate: ${summary.cacheHitRate.toFixed(1)}%`,
      `  Hits: ${summary.totalCacheHits}`,
      `  Misses: ${summary.totalCacheMisses}`,
      '',
      `Uptime: ${uptimeStr}`,
      '=============================='
    ];

    return lines.join('\n');
  }

  /**
   * 重置所有指标
   */
  reset(): void {
    this.metrics = this.createEmptyMetrics();
  }

  /**
   * 创建计时器
   */
  startTimer(): () => number {
    const start = Date.now();
    return () => Date.now() - start;
  }

  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    const sum = values.reduce((a, b) => a + b, 0);
    return sum / values.length;
  }
}

// 全局性能监控器实例
let globalMonitor: PerformanceMonitor | null = null;

/**
 * 获取全局性能监控器
 */
export function getPerformanceMonitor(): PerformanceMonitor {
  if (!globalMonitor) {
    globalMonitor = new PerformanceMonitor();
  }
  return globalMonitor;
}

/**
 * 重置全局性能监控器
 */
export function resetPerformanceMonitor(): void {
  if (globalMonitor) {
    globalMonitor.reset();
  }
}
