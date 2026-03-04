import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Logger } from '../core/Logger.js';
import type {
  BulkMessage,
  ILogger,
  MessageResult,
  OutgoingMessage,
  PlatformType,
} from '../types/index.js';
import { BasePlatform } from './BasePlatform.js';

// Concrete implementation for testing
class TestPlatform extends BasePlatform {
  public readonly name: PlatformType = 'telegram';
  public readonly version = '1.0.0';
  public initializeCalled = false;
  public shutdownCalled = false;
  public messagesSent: Array<{ userId: string; message: OutgoingMessage }> = [];

  protected async onInitialize(): Promise<void> {
    this.initializeCalled = true;
  }

  protected async onShutdown(): Promise<void> {
    this.shutdownCalled = true;
  }

  async sendMessage(userId: string, message: OutgoingMessage): Promise<MessageResult> {
    this.messagesSent.push({ userId, message });
    return {
      success: true,
      messageId: `msg-${this.messagesSent.length}`,
    };
  }
}

// Failing platform for error testing
class FailingPlatform extends TestPlatform {
  async sendMessage(userId: string, message: OutgoingMessage): Promise<MessageResult> {
    throw new Error('Send failed');
  }
}

describe('BasePlatform', () => {
  let platform: TestPlatform;
  let logger: ILogger;

  beforeEach(() => {
    platform = new TestPlatform();
    logger = new Logger({ level: 'info' });
    vi.spyOn(logger, 'info').mockImplementation(() => {});
    vi.spyOn(logger, 'warn').mockImplementation(() => {});
    vi.spyOn(logger, 'debug').mockImplementation(() => {});
    vi.spyOn(logger, 'child').mockReturnValue(logger);
  });

  describe('properties', () => {
    it('should have name and version', () => {
      expect(platform.name).toBe('telegram');
      expect(platform.version).toBe('1.0.0');
    });

    it('should start uninitialized', () => {
      expect(platform.isInitialized).toBe(false);
    });
  });

  describe('setLogger', () => {
    it('should set logger with child logger', () => {
      platform.setLogger(logger);

      expect(logger.child).toHaveBeenCalledWith({ platform: 'telegram' });
    });
  });

  describe('initialize', () => {
    it('should initialize platform', async () => {
      platform.setLogger(logger);

      await platform.initialize();

      expect(platform.isInitialized).toBe(true);
      expect(platform.initializeCalled).toBe(true);
    });

    it('should log initialization', async () => {
      platform.setLogger(logger);

      await platform.initialize();

      expect(logger.info).toHaveBeenCalledWith('Initializing telegram platform');
      expect(logger.info).toHaveBeenCalledWith('telegram platform initialized');
    });

    it('should not reinitialize if already initialized', async () => {
      platform.setLogger(logger);

      await platform.initialize();
      await platform.initialize();

      expect(logger.warn).toHaveBeenCalledWith('Platform already initialized');
      expect(platform.initializeCalled).toBe(true);
    });

    it('should work without logger', async () => {
      await platform.initialize();

      expect(platform.isInitialized).toBe(true);
      expect(platform.initializeCalled).toBe(true);
    });
  });

  describe('shutdown', () => {
    it('should shutdown platform', async () => {
      platform.setLogger(logger);
      await platform.initialize();

      await platform.shutdown();

      expect(platform.isInitialized).toBe(false);
      expect(platform.shutdownCalled).toBe(true);
    });

    it('should log shutdown', async () => {
      platform.setLogger(logger);
      await platform.initialize();

      await platform.shutdown();

      expect(logger.info).toHaveBeenCalledWith('Shutting down telegram platform');
      expect(logger.info).toHaveBeenCalledWith('telegram platform shut down');
    });

    it('should not shutdown if not initialized', async () => {
      platform.setLogger(logger);

      await platform.shutdown();

      expect(platform.shutdownCalled).toBe(false);
    });

    it('should work without logger', async () => {
      await platform.initialize();
      await platform.shutdown();

      expect(platform.isInitialized).toBe(false);
      expect(platform.shutdownCalled).toBe(true);
    });
  });

  describe('sendBulkMessages', () => {
    beforeEach(async () => {
      await platform.initialize();
    });

    it('should send multiple messages', async () => {
      const messages: BulkMessage[] = [
        { userId: 'user1', message: { type: 'text', text: 'Message 1' } },
        { userId: 'user2', message: { type: 'text', text: 'Message 2' } },
        { userId: 'user3', message: { type: 'text', text: 'Message 3' } },
      ];

      const result = await platform.sendBulkMessages(messages);

      expect(result.total).toBe(3);
      expect(result.successful).toBe(3);
      expect(result.failed).toBe(0);
      expect(result.results).toHaveLength(3);
      expect(platform.messagesSent).toHaveLength(3);
    });

    it('should return individual results', async () => {
      const messages: BulkMessage[] = [
        { userId: 'user1', message: { type: 'text', text: 'Message 1' } },
        { userId: 'user2', message: { type: 'text', text: 'Message 2' } },
      ];

      const result = await platform.sendBulkMessages(messages);

      expect(result.results[0]).toEqual({
        success: true,
        messageId: 'msg-1',
      });
      expect(result.results[1]).toEqual({
        success: true,
        messageId: 'msg-2',
      });
    });

    it('should handle send failures', async () => {
      const failingPlatform = new FailingPlatform();
      await failingPlatform.initialize();

      const messages: BulkMessage[] = [
        { userId: 'user1', message: { type: 'text', text: 'Message 1' } },
        { userId: 'user2', message: { type: 'text', text: 'Message 2' } },
      ];

      const result = await failingPlatform.sendBulkMessages(messages);

      expect(result.total).toBe(2);
      expect(result.successful).toBe(0);
      expect(result.failed).toBe(2);
      expect(result.results[0].success).toBe(false);
      expect(result.results[0].error).toBeInstanceOf(Error);
      expect(result.results[0].error?.message).toBe('Send failed');
    });

    it('should handle mixed success and failure', async () => {
      let callCount = 0;
      const mixedPlatform = new TestPlatform();
      mixedPlatform.sendMessage = vi.fn().mockImplementation(async () => {
        callCount++;
        if (callCount === 2) {
          throw new Error('Second message failed');
        }
        return { success: true, messageId: `msg-${callCount}` };
      });

      await mixedPlatform.initialize();

      const messages: BulkMessage[] = [
        { userId: 'user1', message: { type: 'text', text: 'Message 1' } },
        { userId: 'user2', message: { type: 'text', text: 'Message 2' } },
        { userId: 'user3', message: { type: 'text', text: 'Message 3' } },
      ];

      const result = await mixedPlatform.sendBulkMessages(messages);

      expect(result.total).toBe(3);
      expect(result.successful).toBe(2);
      expect(result.failed).toBe(1);
    });

    it('should handle result with success=false', async () => {
      const platformWithFalseResult = new TestPlatform();
      platformWithFalseResult.sendMessage = vi.fn().mockResolvedValue({
        success: false,
        error: new Error('Platform error'),
      });

      await platformWithFalseResult.initialize();

      const messages: BulkMessage[] = [
        { userId: 'user1', message: { type: 'text', text: 'Message 1' } },
      ];

      const result = await platformWithFalseResult.sendBulkMessages(messages);

      expect(result.successful).toBe(0);
      expect(result.failed).toBe(1);
    });

    it('should rate limit messages (30 per second)', async () => {
      const messages: BulkMessage[] = Array.from({ length: 3 }, (_, i) => ({
        userId: `user${i}`,
        message: { type: 'text', text: `Message ${i}` },
      }));

      const startTime = Date.now();
      await platform.sendBulkMessages(messages);
      const duration = Date.now() - startTime;

      // 3 messages with 33ms delay between = ~66ms minimum
      // Allow some tolerance for execution time
      expect(duration).toBeGreaterThanOrEqual(60);
    });

    it('should handle empty message array', async () => {
      const result = await platform.sendBulkMessages([]);

      expect(result.total).toBe(0);
      expect(result.successful).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.results).toHaveLength(0);
    });

    it('should handle non-Error thrown values', async () => {
      const platformThrowingString = new TestPlatform();
      platformThrowingString.sendMessage = vi.fn().mockRejectedValue('String error');

      await platformThrowingString.initialize();

      const messages: BulkMessage[] = [
        { userId: 'user1', message: { type: 'text', text: 'Message 1' } },
      ];

      const result = await platformThrowingString.sendBulkMessages(messages);

      expect(result.failed).toBe(1);
      expect(result.results[0].success).toBe(false);
      expect(result.results[0].error?.message).toBe('String error');
    });
  });

  describe('_delay', () => {
    it('should delay execution', async () => {
      const startTime = Date.now();
      // biome-ignore lint/complexity/useLiteralKeys: accessing protected method for testing
      await platform['_delay'](50);
      const duration = Date.now() - startTime;

      expect(duration).toBeGreaterThanOrEqual(45); // Allow small tolerance
    });
  });
});
