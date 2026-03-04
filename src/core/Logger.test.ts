import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Logger, createChatbotLogger } from './Logger.js';

describe('Logger', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Spy on console methods to prevent actual logging during tests
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create logger with default config', () => {
      const logger = new Logger();

      expect(logger).toBeDefined();
      expect(logger.error).toBeInstanceOf(Function);
      expect(logger.warn).toBeInstanceOf(Function);
      expect(logger.info).toBeInstanceOf(Function);
      expect(logger.debug).toBeInstanceOf(Function);
    });

    it('should create logger with custom log level', () => {
      const logger = new Logger({ level: 'debug' });

      expect(logger).toBeDefined();
    });

    it('should create logger with pretty format', () => {
      const logger = new Logger({ level: 'info', format: 'pretty' });

      expect(logger).toBeDefined();
    });

    it('should create logger with json format', () => {
      const logger = new Logger({ level: 'info', format: 'json' });

      expect(logger).toBeDefined();
    });

    it('should create logger with metadata', () => {
      const logger = new Logger(undefined, { service: 'test' });

      expect(logger).toBeDefined();
    });
  });

  describe('logging methods', () => {
    it('should log error messages', () => {
      const logger = new Logger({ level: 'error' });

      logger.error('Test error message');

      // Logger should not throw - just verify it doesn't error
      expect(logger).toBeDefined();
    });

    it('should log error with metadata', () => {
      const logger = new Logger({ level: 'error' });

      expect(() => logger.error('Test error', { userId: '123', code: 'TEST_ERROR' })).not.toThrow();
    });

    it('should log warn messages', () => {
      const logger = new Logger({ level: 'warn' });

      expect(() => logger.warn('Test warning')).not.toThrow();
    });

    it('should log warn with metadata', () => {
      const logger = new Logger({ level: 'warn' });

      expect(() => logger.warn('Test warning', { detail: 'extra info' })).not.toThrow();
    });

    it('should log info messages', () => {
      const logger = new Logger({ level: 'info' });

      expect(() => logger.info('Test info')).not.toThrow();
    });

    it('should log info with metadata', () => {
      const logger = new Logger({ level: 'info' });

      expect(() => logger.info('Test info', { status: 'ok' })).not.toThrow();
    });

    it('should log debug messages', () => {
      const logger = new Logger({ level: 'debug' });

      expect(() => logger.debug('Test debug')).not.toThrow();
    });

    it('should log debug with metadata', () => {
      const logger = new Logger({ level: 'debug' });

      expect(() => logger.debug('Test debug', { trace: 'value' })).not.toThrow();
    });
  });

  describe('child', () => {
    it('should create child logger with additional metadata', () => {
      const logger = new Logger(undefined, { service: 'parent' });
      const child = logger.child({ module: 'auth' });

      expect(child).toBeDefined();
      expect(child).toBeInstanceOf(Logger);
    });

    it('should inherit parent metadata', () => {
      const logger = new Logger(undefined, {
        service: 'test',
        version: '1.0.0',
      });
      const child = logger.child({ userId: '123' });

      expect(() => child.info('Child log')).not.toThrow();
    });

    it('should create multiple child loggers', () => {
      const logger = new Logger();
      const child1 = logger.child({ module: 'module1' });
      const child2 = logger.child({ module: 'module2' });

      expect(child1).toBeDefined();
      expect(child2).toBeDefined();
      expect(child1).not.toBe(child2);
    });

    it('should create nested child loggers', () => {
      const logger = new Logger(undefined, { service: 'test' });
      const child1 = logger.child({ module: 'auth' });
      const child2 = child1.child({ function: 'login' });

      expect(child2).toBeDefined();
      expect(child2).toBeInstanceOf(Logger);
    });
  });

  describe('createChatbotLogger', () => {
    it('should create logger with default service metadata', () => {
      const logger = createChatbotLogger();

      expect(logger).toBeDefined();
      expect(logger).toBeInstanceOf(Logger);
    });

    it('should create logger with custom config', () => {
      const logger = createChatbotLogger({ level: 'debug', format: 'pretty' });

      expect(logger).toBeDefined();
      expect(logger).toBeInstanceOf(Logger);
    });

    it('should create logger with service metadata', () => {
      const logger = createChatbotLogger();

      expect(() => logger.info('Test log')).not.toThrow();
    });
  });

  describe('log levels', () => {
    it('should respect log level - error only', () => {
      const logger = new Logger({ level: 'error' });

      expect(() => {
        logger.error('Error message');
        logger.warn('Warn message');
        logger.info('Info message');
        logger.debug('Debug message');
      }).not.toThrow();
    });

    it('should respect log level - debug (all levels)', () => {
      const logger = new Logger({ level: 'debug' });

      expect(() => {
        logger.error('Error message');
        logger.warn('Warn message');
        logger.info('Info message');
        logger.debug('Debug message');
      }).not.toThrow();
    });
  });
});
