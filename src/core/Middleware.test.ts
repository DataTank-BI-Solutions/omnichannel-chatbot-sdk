import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  Conversation,
  IContext,
  IPlatform,
  IncomingMessage,
  MiddlewareFunction,
  NextFunction,
  User,
} from '../types/index.js';
import { Context } from './Context.js';
import {
  ErrorHandlingMiddleware,
  LoggingMiddleware,
  Middleware,
  RateLimitMiddleware,
  compose,
} from './Middleware.js';

describe('Middleware', () => {
  let mockContext: IContext;
  let mockPlatform: IPlatform;

  beforeEach(() => {
    mockPlatform = {
      name: 'telegram',
      version: '1.0.0',
      initialize: vi.fn(),
      shutdown: vi.fn(),
      sendMessage: vi.fn().mockResolvedValue({ success: true }),
      sendBulkMessages: vi.fn(),
    };

    const mockMessage: IncomingMessage = {
      id: 'msg123',
      userId: 'user123',
      chatId: 'chat123',
      platform: 'telegram',
      type: 'text',
      text: 'test message',
      timestamp: new Date(),
      raw: {},
    };

    const mockUser: User = {
      id: 'user123',
      platformId: 'tg123',
      platform: 'telegram',
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockConversation: Conversation = {
      id: 'conv123',
      userId: 'user123',
      platform: 'telegram',
      chatId: 'chat123',
      status: 'active',
      metadata: {},
      startedAt: new Date(),
      lastMessageAt: new Date(),
    };

    mockContext = new Context(mockMessage, mockPlatform, mockUser, mockConversation);
  });

  describe('compose', () => {
    it('should compose multiple middlewares', async () => {
      const calls: number[] = [];

      const mw1: MiddlewareFunction = async (ctx, next) => {
        calls.push(1);
        await next();
        calls.push(4);
      };

      const mw2: MiddlewareFunction = async (ctx, next) => {
        calls.push(2);
        await next();
        calls.push(3);
      };

      const composed = compose([mw1, mw2]);
      await composed(mockContext, async () => {});

      expect(calls).toEqual([1, 2, 3, 4]);
    });

    it('should call final next function', async () => {
      const mw: MiddlewareFunction = async (ctx, next) => {
        await next();
      };

      const finalNext = vi.fn();
      const composed = compose([mw]);
      await composed(mockContext, finalNext);

      expect(finalNext).toHaveBeenCalledOnce();
    });

    it('should handle empty middleware array', async () => {
      const finalNext = vi.fn();
      const composed = compose([]);
      await composed(mockContext, finalNext);

      expect(finalNext).toHaveBeenCalledOnce();
    });

    it('should throw error if next() called multiple times', async () => {
      const mw: MiddlewareFunction = async (ctx, next) => {
        await next();
        await next(); // Second call should throw
      };

      const composed = compose([mw]);

      await expect(composed(mockContext, async () => {})).rejects.toThrow(
        'next() called multiple times'
      );
    });

    it('should pass context through middleware chain', async () => {
      const mw1: MiddlewareFunction = async (ctx, next) => {
        ctx.state.set('mw1', 'executed');
        await next();
      };

      const mw2: MiddlewareFunction = async (ctx, next) => {
        ctx.state.set('mw2', 'executed');
        await next();
      };

      const composed = compose([mw1, mw2]);
      await composed(mockContext, async () => {});

      expect(mockContext.state.get('mw1')).toBe('executed');
      expect(mockContext.state.get('mw2')).toBe('executed');
    });

    it('should stop execution if next() not called', async () => {
      const mw1: MiddlewareFunction = async (ctx, next) => {
        // Don't call next
      };

      const mw2 = vi.fn();

      const composed = compose([mw1, mw2]);
      await composed(mockContext, async () => {});

      expect(mw2).not.toHaveBeenCalled();
    });

    it('should handle async operations', async () => {
      const mw: MiddlewareFunction = async (ctx, next) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        await next();
      };

      const composed = compose([mw]);
      await expect(composed(mockContext, async () => {})).resolves.not.toThrow();
    });

    it('should propagate errors from middleware', async () => {
      const error = new Error('Middleware error');
      const mw: MiddlewareFunction = async () => {
        throw error;
      };

      const composed = compose([mw]);

      await expect(composed(mockContext, async () => {})).rejects.toThrow('Middleware error');
    });
  });

  describe('LoggingMiddleware', () => {
    let consoleLogSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    });

    it('should have correct name', () => {
      const middleware = new LoggingMiddleware();
      expect(middleware.name).toBe('LoggingMiddleware');
    });

    it('should log incoming message', async () => {
      const middleware = new LoggingMiddleware();
      const next = vi.fn();

      await middleware.process(mockContext, next);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Incoming message from tg123')
      );
      expect(next).toHaveBeenCalled();
    });

    it('should log processing time', async () => {
      const middleware = new LoggingMiddleware();
      const next = vi.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      await middleware.process(mockContext, next);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Processed in'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('ms'));
    });

    it('should call next middleware', async () => {
      const middleware = new LoggingMiddleware();
      const next = vi.fn();

      await middleware.process(mockContext, next);

      expect(next).toHaveBeenCalledOnce();
    });
  });

  describe('ErrorHandlingMiddleware', () => {
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    it('should have correct name', () => {
      const middleware = new ErrorHandlingMiddleware();
      expect(middleware.name).toBe('ErrorHandlingMiddleware');
    });

    it('should catch and handle errors', async () => {
      const middleware = new ErrorHandlingMiddleware();
      const error = new Error('Test error');
      const next = vi.fn().mockRejectedValue(error);

      await middleware.process(mockContext, next);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Unhandled error:', error);
      expect(mockPlatform.sendMessage).toHaveBeenCalledWith('tg123', {
        type: 'text',
        text: 'An error occurred. Please try again.',
      });
    });

    it('should use custom error handler if provided', async () => {
      const customHandler = vi.fn();
      const middleware = new ErrorHandlingMiddleware(customHandler);
      const error = new Error('Test error');
      const next = vi.fn().mockRejectedValue(error);

      await middleware.process(mockContext, next);

      expect(customHandler).toHaveBeenCalledWith(mockContext, error);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should call next when no error occurs', async () => {
      const middleware = new ErrorHandlingMiddleware();
      const next = vi.fn();

      await middleware.process(mockContext, next);

      expect(next).toHaveBeenCalledOnce();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should handle non-Error objects', async () => {
      const middleware = new ErrorHandlingMiddleware();
      const next = vi.fn().mockRejectedValue('string error');

      await middleware.process(mockContext, next);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Unhandled error:', 'string error');
    });
  });

  describe('RateLimitMiddleware', () => {
    it('should have correct name', () => {
      const middleware = new RateLimitMiddleware();
      expect(middleware.name).toBe('RateLimitMiddleware');
    });

    it('should use default limit of 10 requests per minute', async () => {
      const middleware = new RateLimitMiddleware();
      const next = vi.fn();

      // First 10 requests should pass
      for (let i = 0; i < 10; i++) {
        await middleware.process(mockContext, next);
      }

      expect(next).toHaveBeenCalledTimes(10);
      expect(mockPlatform.sendMessage).not.toHaveBeenCalled();

      // 11th request should be rate limited
      await middleware.process(mockContext, next);

      expect(next).toHaveBeenCalledTimes(10); // Still 10
      expect(mockPlatform.sendMessage).toHaveBeenCalledWith('tg123', {
        type: 'text',
        text: 'Too many requests. Please slow down.',
      });
    });

    it('should respect custom limit', async () => {
      const middleware = new RateLimitMiddleware({ limit: 3 });
      const next = vi.fn();

      // First 3 requests should pass
      for (let i = 0; i < 3; i++) {
        await middleware.process(mockContext, next);
      }

      expect(next).toHaveBeenCalledTimes(3);

      // 4th request should be rate limited
      await middleware.process(mockContext, next);

      expect(next).toHaveBeenCalledTimes(3);
      expect(mockPlatform.sendMessage).toHaveBeenCalled();
    });

    it('should respect custom window', async () => {
      const middleware = new RateLimitMiddleware({ limit: 2, windowMs: 100 });
      const next = vi.fn();

      // First 2 requests
      await middleware.process(mockContext, next);
      await middleware.process(mockContext, next);

      expect(next).toHaveBeenCalledTimes(2);

      // 3rd request should be rate limited
      await middleware.process(mockContext, next);
      expect(next).toHaveBeenCalledTimes(2);

      // Wait for window to expire
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Should allow requests again
      await middleware.process(mockContext, next);
      expect(next).toHaveBeenCalledTimes(3);
    });

    it('should track requests per user', async () => {
      const middleware = new RateLimitMiddleware({ limit: 2 });
      const next = vi.fn();

      // User 1: 2 requests
      await middleware.process(mockContext, next);
      await middleware.process(mockContext, next);

      // Create context for different user
      const user2: User = {
        id: 'user456',
        platformId: 'tg456',
        platform: 'telegram',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockMessage2: IncomingMessage = {
        id: 'msg456',
        userId: 'user456',
        chatId: 'chat456',
        platform: 'telegram',
        type: 'text',
        text: 'test',
        timestamp: new Date(),
        raw: {},
      };

      const mockConversation2: Conversation = {
        id: 'conv456',
        userId: 'user456',
        platform: 'telegram',
        chatId: 'chat456',
        status: 'active',
        metadata: {},
        startedAt: new Date(),
        lastMessageAt: new Date(),
      };

      const context2 = new Context(mockMessage2, mockPlatform, user2, mockConversation2);

      // User 2: 2 requests should pass (separate limit)
      await middleware.process(context2, next);
      await middleware.process(context2, next);

      expect(next).toHaveBeenCalledTimes(4); // 2 for each user
    });

    it('should remove old timestamps from window', async () => {
      const middleware = new RateLimitMiddleware({ limit: 2, windowMs: 50 });
      const next = vi.fn();

      // First request
      await middleware.process(mockContext, next);

      // Wait for timestamp to age
      await new Promise((resolve) => setTimeout(resolve, 60));

      // Next 2 requests should both pass (first timestamp expired)
      await middleware.process(mockContext, next);
      await middleware.process(mockContext, next);

      expect(next).toHaveBeenCalledTimes(3);
    });
  });
});
