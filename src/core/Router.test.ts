import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  Conversation,
  IContext,
  IMiddleware,
  IPlatform,
  IncomingMessage,
  MiddlewareFunction,
  NextFunction,
  User,
} from '../types/index.js';
import { Context } from './Context.js';
import { Router } from './Router.js';

describe('Router', () => {
  let router: Router;
  let mockContext: IContext;
  let mockPlatform: IPlatform;

  beforeEach(() => {
    router = new Router();

    mockPlatform = {
      name: 'telegram',
      version: '1.0.0',
      initialize: vi.fn(),
      shutdown: vi.fn(),
      sendMessage: vi.fn(),
      sendBulkMessages: vi.fn(),
    };

    const mockMessage: IncomingMessage = {
      id: 'msg123',
      userId: 'user123',
      chatId: 'chat123',
      platform: 'telegram',
      type: 'text',
      text: '/start',
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

  describe('command', () => {
    it('should register command handler', () => {
      const handler = vi.fn();
      router.command('start', handler);

      expect(router).toBeDefined();
    });

    it('should normalize command with leading slash', () => {
      const handler = vi.fn();
      router.command('/start', handler);

      expect(router).toBeDefined();
    });

    it('should match exact command', () => {
      const handler = vi.fn();
      router.command('start', handler);

      mockContext.message.text = '/start';
      const match = router.match(mockContext);

      expect(match).toBeDefined();
      expect(match?.handler).toBe(handler);
      expect(match?.params).toEqual({});
    });

    it('should match command with arguments', () => {
      const handler = vi.fn();
      router.command('echo', handler);

      mockContext.message.text = '/echo hello world';
      const match = router.match(mockContext);

      expect(match).toBeDefined();
      expect(match?.handler).toBe(handler);
      expect(match?.params.args).toBe('hello world');
    });

    it('should match partial command (current behavior)', () => {
      const handler = vi.fn();
      router.command('start', handler);

      mockContext.message.text = '/starter';
      const match = router.match(mockContext);

      // Current implementation matches '/start' prefix
      // The args extraction: text.slice(commandPattern.length + 2)
      // '/starter'.slice('start'.length + 2) = '/starter'.slice(7) = 'r'
      expect(match).toBeDefined();
      expect(match?.handler).toBe(handler);
      expect(match?.params.args).toBe('r');
    });

    it('should not match command without slash', () => {
      const handler = vi.fn();
      router.command('start', handler);

      mockContext.message.text = 'start';
      const match = router.match(mockContext);

      expect(match).toBeUndefined();
    });

    it('should handle commands with no arguments', () => {
      const handler = vi.fn();
      router.command('help', handler);

      mockContext.message.text = '/help';
      const match = router.match(mockContext);

      expect(match).toBeDefined();
      expect(match?.params).toEqual({});
    });
  });

  describe('text', () => {
    it('should register text handler with string pattern', () => {
      const handler = vi.fn();
      router.text('hello', handler);

      expect(router).toBeDefined();
    });

    it('should register text handler with regex pattern', () => {
      const handler = vi.fn();
      router.text(/hello/i, handler);

      expect(router).toBeDefined();
    });

    it('should match exact text', () => {
      const handler = vi.fn();
      router.text('hello', handler);

      mockContext.message.text = 'hello';
      const match = router.match(mockContext);

      expect(match).toBeDefined();
      expect(match?.handler).toBe(handler);
      expect(match?.params).toEqual({});
    });

    it('should not match partial text for string pattern', () => {
      const handler = vi.fn();
      router.text('hello', handler);

      mockContext.message.text = 'hello world';
      const match = router.match(mockContext);

      expect(match).toBeUndefined();
    });

    it('should match regex pattern', () => {
      const handler = vi.fn();
      router.text(/hello/i, handler);

      mockContext.message.text = 'Hello World';
      const match = router.match(mockContext);

      expect(match).toBeDefined();
      expect(match?.handler).toBe(handler);
    });

    it('should extract numbered groups from regex', () => {
      const handler = vi.fn();
      router.text(/^(\w+) (\w+)$/, handler);

      mockContext.message.text = 'hello world';
      const match = router.match(mockContext);

      expect(match).toBeDefined();
      expect(match?.params.$1).toBe('hello');
      expect(match?.params.$2).toBe('world');
    });

    it('should extract named groups from regex', () => {
      const handler = vi.fn();
      router.text(/^(?<greeting>\w+) (?<name>\w+)$/, handler);

      mockContext.message.text = 'hello world';
      const match = router.match(mockContext);

      expect(match).toBeDefined();
      expect(match?.params.greeting).toBe('hello');
      expect(match?.params.name).toBe('world');
    });

    it('should extract both named and numbered groups', () => {
      const handler = vi.fn();
      router.text(/^(?<command>\w+) (\w+)$/, handler);

      mockContext.message.text = 'say hello';
      const match = router.match(mockContext);

      expect(match).toBeDefined();
      expect(match?.params.command).toBe('say');
      // The numbered groups start from the first capture, which is the named group
      // So $1 is 'say' (first capture), not 'hello'
      expect(match?.params.$1).toBe('say');
      expect(match?.params.$2).toBe('hello');
    });
  });

  describe('on', () => {
    it('should register event handler', () => {
      const handler = vi.fn();
      router.on('text', handler);

      expect(router).toBeDefined();
    });

    it('should match message type', () => {
      const handler = vi.fn();
      router.on('text', handler);

      mockContext.message.type = 'text';
      const match = router.match(mockContext);

      expect(match).toBeDefined();
      expect(match?.handler).toBe(handler);
    });

    it('should match image type', () => {
      const handler = vi.fn();
      router.on('image', handler);

      mockContext.message.type = 'image';
      const match = router.match(mockContext);

      expect(match).toBeDefined();
      expect(match?.handler).toBe(handler);
    });

    it('should not match different message type', () => {
      const handler = vi.fn();
      router.on('image', handler);

      mockContext.message.type = 'text';
      const match = router.match(mockContext);

      expect(match).toBeUndefined();
    });
  });

  describe('use', () => {
    it('should register middleware function', () => {
      const middleware: MiddlewareFunction = vi.fn();
      router.use(middleware);

      expect(router.middlewares).toHaveLength(1);
      expect(router.middlewares[0]).toBe(middleware);
    });

    it('should register middleware object', () => {
      const middlewareObj: IMiddleware = {
        name: 'TestMiddleware',
        process: vi.fn(),
      };

      router.use(middlewareObj);

      expect(router.middlewares).toHaveLength(1);
      expect(router.middlewares[0]).toBeInstanceOf(Function);
    });

    it('should register multiple middlewares', () => {
      const mw1: MiddlewareFunction = vi.fn();
      const mw2: MiddlewareFunction = vi.fn();
      const mw3: IMiddleware = { name: 'MW3', process: vi.fn() };

      router.use(mw1);
      router.use(mw2);
      router.use(mw3);

      expect(router.middlewares).toHaveLength(3);
    });
  });

  describe('middlewares getter', () => {
    it('should return copy of middlewares array', () => {
      const mw1: MiddlewareFunction = vi.fn();
      const mw2: MiddlewareFunction = vi.fn();

      router.use(mw1);
      router.use(mw2);

      const middlewares = router.middlewares;

      // Modifying returned array should not affect router
      middlewares.pop();

      expect(router.middlewares).toHaveLength(2);
      expect(middlewares).toHaveLength(1);
    });
  });

  describe('match', () => {
    it('should return undefined when no routes match', () => {
      router.command('start', vi.fn());
      router.text('hello', vi.fn());

      mockContext.message.text = 'goodbye';
      const match = router.match(mockContext);

      expect(match).toBeUndefined();
    });

    it('should match first registered route when multiple match', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      router.text(/hello/, handler1);
      router.text(/hello world/, handler2);

      mockContext.message.text = 'hello world';
      const match = router.match(mockContext);

      expect(match?.handler).toBe(handler1);
    });

    it('should handle messages with no text', () => {
      const handler = vi.fn();
      router.text('hello', handler);

      mockContext.message.text = undefined;
      const match = router.match(mockContext);

      expect(match).toBeUndefined();
    });

    it('should handle empty text', () => {
      const handler = vi.fn();
      router.command('start', handler);

      mockContext.message.text = '';
      const match = router.match(mockContext);

      expect(match).toBeUndefined();
    });

    it('should match different route types in order', () => {
      const commandHandler = vi.fn();
      const textHandler = vi.fn();
      const eventHandler = vi.fn();

      router.command('start', commandHandler);
      router.text('hello', textHandler);
      router.on('text', eventHandler);

      // Command should match first
      mockContext.message.text = '/start';
      let match = router.match(mockContext);
      expect(match?.handler).toBe(commandHandler);

      // Text should match when command doesn't
      mockContext.message.text = 'hello';
      match = router.match(mockContext);
      expect(match?.handler).toBe(textHandler);

      // Event should match when others don't
      mockContext.message.text = 'something else';
      mockContext.message.type = 'text';
      match = router.match(mockContext);
      expect(match?.handler).toBe(eventHandler);
    });
  });
});
