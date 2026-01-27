import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  createLogger,
  getLogger,
  setLogLevel,
  configureLogger,
  resetLogger,
  type Logger
} from './logger.js';

describe('Logger', () => {
  beforeEach(() => {
    resetLogger();
  });

  afterEach(() => {
    resetLogger();
  });

  describe('createLogger', () => {
    it('should create a logger instance', () => {
      const logger = createLogger();
      expect(logger).toBeDefined();
      expect(typeof logger.debug).toBe('function');
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.child).toBe('function');
      expect(typeof logger.startTimer).toBe('function');
    });

    it('should create logger with custom level', () => {
      const logger = createLogger({ level: 'debug' });
      expect(logger).toBeDefined();
    });

    it('should create logger with name', () => {
      const logger = createLogger({ name: 'test-logger' });
      expect(logger).toBeDefined();
    });
  });

  describe('getLogger', () => {
    it('should return the same logger instance', () => {
      const logger1 = getLogger();
      const logger2 = getLogger();
      expect(logger1).toBe(logger2);
    });
  });

  describe('setLogLevel', () => {
    it('should set log level', () => {
      setLogLevel('debug');
      const logger = getLogger();
      expect(logger).toBeDefined();
    });

    it('should throw error for invalid log level', () => {
      expect(() => setLogLevel('invalid' as any)).toThrow('Invalid log level');
    });
  });

  describe('configureLogger', () => {
    it('should configure logger with options', () => {
      configureLogger({ level: 'warn', pretty: false });
      const logger = getLogger();
      expect(logger).toBeDefined();
    });

    it('should configure logger with JSON logs', () => {
      configureLogger({ jsonLogs: true });
      const logger = getLogger();
      expect(logger).toBeDefined();
    });
  });

  describe('Logger methods', () => {
    let logger: Logger;

    beforeEach(() => {
      logger = createLogger({ level: 'debug' });
    });

    it('should log debug messages', () => {
      expect(() => logger.debug('test debug message')).not.toThrow();
    });

    it('should log info messages', () => {
      expect(() => logger.info('test info message')).not.toThrow();
    });

    it('should log warn messages', () => {
      expect(() => logger.warn('test warn message')).not.toThrow();
    });

    it('should log error messages', () => {
      expect(() => logger.error('test error message')).not.toThrow();
    });

    it('should log with context', () => {
      expect(() => logger.info('test message', { requestId: 'req-123', duration: 100 })).not.toThrow();
    });

    it('should create child logger', () => {
      const childLogger = logger.child({ module: 'test-module' });
      expect(childLogger).toBeDefined();
      expect(() => childLogger.info('child logger message')).not.toThrow();
    });

    it('should start timer and return duration', () => {
      const timer = logger.startTimer();
      expect(typeof timer).toBe('function');

      // Wait a bit
      const start = Date.now();
      while (Date.now() - start < 10) {
        // busy wait
      }

      const duration = timer();
      expect(typeof duration).toBe('number');
      expect(duration).toBeGreaterThanOrEqual(0);
    });
  });
});
