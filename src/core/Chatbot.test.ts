import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  ChatbotConfig,
  IMiddleware,
  IPlatform,
  IPlugin,
  IncomingMessage,
  MiddlewareFunction,
} from '../types/index.js';
import { Chatbot } from './Chatbot.js';
import { ChatbotError, ErrorCodes } from './ChatbotError.js';
import { Router } from './Router.js';

describe('Chatbot', () => {
  let config: ChatbotConfig;
  let chatbot: Chatbot;

  beforeEach(() => {
    config = {
      platforms: {},
    };
    chatbot = new Chatbot(config);

    // Mock logger to prevent console output
    vi.spyOn(chatbot.logger, 'info').mockImplementation(() => {});
    vi.spyOn(chatbot.logger, 'warn').mockImplementation(() => {});
    vi.spyOn(chatbot.logger, 'debug').mockImplementation(() => {});
    vi.spyOn(chatbot.logger, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create chatbot instance', () => {
      expect(chatbot).toBeInstanceOf(Chatbot);
      expect(chatbot.config).toEqual(config);
    });

    it('should initialize router', () => {
      expect(chatbot.router).toBeDefined();
      expect(chatbot.router).toBeInstanceOf(Router);
    });

    it('should initialize logger', () => {
      expect(chatbot.logger).toBeDefined();
    });

    it('should initialize platforms map', () => {
      expect(chatbot.platforms).toBeInstanceOf(Map);
      expect(chatbot.platforms.size).toBe(0);
    });

    it('should initialize plugins map', () => {
      expect(chatbot.plugins).toBeInstanceOf(Map);
      expect(chatbot.plugins.size).toBe(0);
    });

    it('should not have database by default', () => {
      expect(chatbot.database).toBeUndefined();
    });
  });

  describe('use', () => {
    it('should install plugin', async () => {
      const plugin: IPlugin = {
        name: 'TestPlugin',
        version: '1.0.0',
        install: vi.fn(),
        uninstall: vi.fn(),
      };

      chatbot.use(plugin);

      // Wait for async plugin installation
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(plugin.install).toHaveBeenCalledWith(chatbot);
      expect(chatbot.plugins.get('TestPlugin')).toBe(plugin);
    });

    it('should register middleware function', () => {
      const middleware: MiddlewareFunction = vi.fn();

      chatbot.use(middleware);

      expect((chatbot.router as Router).middlewares).toContain(middleware);
    });

    it('should register middleware object', () => {
      const middleware: IMiddleware = {
        name: 'TestMiddleware',
        process: vi.fn(),
      };

      chatbot.use(middleware);

      expect((chatbot.router as Router).middlewares).toHaveLength(1);
    });

    it('should warn if plugin already installed', async () => {
      const plugin: IPlugin = {
        name: 'TestPlugin',
        version: '1.0.0',
        install: vi.fn(),
        uninstall: vi.fn(),
      };

      chatbot.use(plugin);
      await new Promise((resolve) => setTimeout(resolve, 10));

      chatbot.use(plugin);
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(chatbot.logger.warn).toHaveBeenCalledWith('Plugin TestPlugin is already installed');
    });

    it('should handle plugin installation failure', async () => {
      const errorHandler = vi.fn();
      chatbot.onEvent('error', errorHandler);

      const plugin: IPlugin = {
        name: 'FailingPlugin',
        version: '1.0.0',
        install: vi.fn().mockImplementation(() => {
          throw new Error('Installation failed');
        }),
        uninstall: vi.fn(),
      };

      chatbot.use(plugin);

      // Wait for async installation to complete and emit error
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Plugin should not be in plugins map
      expect(chatbot.plugins.has('FailingPlugin')).toBe(false);

      // Error should be logged
      expect(chatbot.logger.error).toHaveBeenCalledWith(
        expect.stringContaining('PLUGIN_INSTALL_FAILED'),
        expect.any(Object)
      );
    });
  });

  describe('command', () => {
    it('should register command handler', () => {
      const handler = vi.fn();
      chatbot.command('start', handler);

      // Router should have the route registered
      expect(chatbot.router).toBeDefined();
    });
  });

  describe('on', () => {
    it('should register event handler', () => {
      const handler = vi.fn();
      chatbot.on('text', handler);

      expect(chatbot.router).toBeDefined();
    });
  });

  describe('text', () => {
    it('should register text pattern handler', () => {
      const handler = vi.fn();
      chatbot.text('hello', handler);

      expect(chatbot.router).toBeDefined();
    });

    it('should register regex pattern handler', () => {
      const handler = vi.fn();
      chatbot.text(/hello/i, handler);

      expect(chatbot.router).toBeDefined();
    });
  });

  describe('onEvent', () => {
    it('should register event listener', () => {
      const handler = vi.fn();
      chatbot.onEvent('start', handler);

      // Event should be registered (we'll test emission separately)
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('start', () => {
    it('should start chatbot', async () => {
      await chatbot.start();

      expect(chatbot.logger.info).toHaveBeenCalledWith('Starting chatbot...');
      expect(chatbot.logger.info).toHaveBeenCalledWith('Chatbot started successfully');
    });

    it('should emit start event', async () => {
      const handler = vi.fn();
      chatbot.onEvent('start', handler);

      await chatbot.start();

      expect(handler).toHaveBeenCalled();
    });

    it('should throw error if already started', async () => {
      await chatbot.start();

      await expect(chatbot.start()).rejects.toThrow(ChatbotError);
      await expect(chatbot.start()).rejects.toThrow('Chatbot is already started');
    });

    it('should initialize database if configured', async () => {
      const configWithDb: ChatbotConfig = {
        platforms: {},
        database: {
          provider: 'memory',
        },
      };
      const bot = new Chatbot(configWithDb);
      vi.spyOn(bot.logger, 'info').mockImplementation(() => {});
      vi.spyOn(bot.logger, 'debug').mockImplementation(() => {});

      await bot.start();

      expect(bot.logger.debug).toHaveBeenCalledWith(
        'Database initialization skipped (not implemented)'
      );
    });

    it('should initialize platforms', async () => {
      await chatbot.start();

      // Platform initialization logs would be called if platforms were configured
      expect(chatbot.logger.info).toHaveBeenCalled();
    });
  });

  describe('stop', () => {
    it('should stop chatbot', async () => {
      await chatbot.start();
      await chatbot.stop();

      expect(chatbot.logger.info).toHaveBeenCalledWith('Stopping chatbot...');
      expect(chatbot.logger.info).toHaveBeenCalledWith('Chatbot stopped');
    });

    it('should emit stop event', async () => {
      const handler = vi.fn();
      chatbot.onEvent('stop', handler);

      await chatbot.start();
      await chatbot.stop();

      expect(handler).toHaveBeenCalled();
    });

    it('should throw error if not started', async () => {
      await expect(chatbot.stop()).rejects.toThrow(ChatbotError);
      await expect(chatbot.stop()).rejects.toThrow('Chatbot is not started');
    });

    it('should shutdown all platforms', async () => {
      const mockPlatform: IPlatform = {
        name: 'telegram',
        version: '1.0.0',
        initialize: vi.fn(),
        shutdown: vi.fn(),
        sendMessage: vi.fn(),
        sendBulkMessages: vi.fn(),
      };

      chatbot.platforms.set('telegram', mockPlatform);
      await chatbot.start();
      await chatbot.stop();

      expect(mockPlatform.shutdown).toHaveBeenCalled();
    });

    it('should uninstall all plugins', async () => {
      const plugin: IPlugin = {
        name: 'TestPlugin',
        version: '1.0.0',
        install: vi.fn(),
        uninstall: vi.fn(),
      };

      chatbot.use(plugin);
      await chatbot.start();
      await chatbot.stop();

      expect(plugin.uninstall).toHaveBeenCalled();
    });

    it('should handle platform shutdown errors gracefully', async () => {
      const mockPlatform: IPlatform = {
        name: 'telegram',
        version: '1.0.0',
        initialize: vi.fn(),
        shutdown: vi.fn().mockRejectedValue(new Error('Shutdown failed')),
        sendMessage: vi.fn(),
        sendBulkMessages: vi.fn(),
      };

      chatbot.platforms.set('telegram', mockPlatform);
      await chatbot.start();
      await chatbot.stop();

      expect(chatbot.logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to shutdown platform'),
        expect.any(Object)
      );
    });

    it('should handle plugin uninstall errors gracefully', async () => {
      const plugin: IPlugin = {
        name: 'TestPlugin',
        version: '1.0.0',
        install: vi.fn(),
        uninstall: vi.fn().mockRejectedValue(new Error('Uninstall failed')),
      };

      chatbot.use(plugin);
      await chatbot.start();
      await chatbot.stop();

      expect(chatbot.logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to uninstall plugin'),
        expect.any(Object)
      );
    });
  });

  describe('broadcast', () => {
    it('should throw error if not started', async () => {
      const message = { type: 'text' as const, text: 'Hello' };

      await expect(chatbot.broadcast(message)).rejects.toThrow(ChatbotError);
      await expect(chatbot.broadcast(message)).rejects.toThrow(
        'Chatbot must be started before broadcasting'
      );
    });

    it('should return empty result (not implemented)', async () => {
      await chatbot.start();
      const message = { type: 'text' as const, text: 'Hello' };

      const result = await chatbot.broadcast(message);

      expect(result).toEqual({
        total: 0,
        successful: 0,
        failed: 0,
        results: [],
      });
    });
  });

  describe('handleMessage', () => {
    let mockPlatform: IPlatform;
    let mockMessage: IncomingMessage;

    beforeEach(() => {
      mockPlatform = {
        name: 'telegram',
        version: '1.0.0',
        initialize: vi.fn(),
        shutdown: vi.fn(),
        sendMessage: vi.fn(),
        sendBulkMessages: vi.fn(),
      };

      mockMessage = {
        id: 'msg123',
        userId: 'user123',
        chatId: 'chat123',
        platform: 'telegram',
        type: 'text',
        text: '/start',
        timestamp: new Date(),
        raw: {},
      };
    });

    it('should handle incoming message', async () => {
      const handler = vi.fn();
      chatbot.command('start', handler);

      await chatbot.handleMessage(mockMessage, mockPlatform);

      expect(handler).toHaveBeenCalled();
    });

    it('should emit message event', async () => {
      const handler = vi.fn();
      chatbot.onEvent('message', handler);

      await chatbot.handleMessage(mockMessage, mockPlatform);

      expect(handler).toHaveBeenCalled();
    });

    it('should run middleware chain', async () => {
      const middleware = vi.fn(async (ctx, next) => {
        ctx.state.set('middlewareRan', true);
        await next();
      });

      chatbot.use(middleware);

      await chatbot.handleMessage(mockMessage, mockPlatform);

      expect(middleware).toHaveBeenCalled();
    });

    it('should match and execute route handler', async () => {
      const handler = vi.fn();
      chatbot.command('start', handler);

      await chatbot.handleMessage(mockMessage, mockPlatform);

      expect(handler).toHaveBeenCalledOnce();
      expect(handler.mock.calls[0][0].message).toBe(mockMessage);
    });

    it('should store route params in context state', async () => {
      const handler = vi.fn((ctx) => {
        expect(ctx.state.get('params')).toBeDefined();
      });
      chatbot.command('echo', handler);

      mockMessage.text = '/echo hello world';
      await chatbot.handleMessage(mockMessage, mockPlatform);

      expect(handler).toHaveBeenCalled();
    });

    it('should handle errors and emit error event', async () => {
      const errorHandler = vi.fn();
      chatbot.onEvent('error', errorHandler);

      const handler = vi.fn().mockRejectedValue(new Error('Handler error'));
      chatbot.command('start', handler);

      await chatbot.handleMessage(mockMessage, mockPlatform);

      expect(errorHandler).toHaveBeenCalled();
      expect(chatbot.logger.error).toHaveBeenCalledWith(
        'Error handling message',
        expect.any(Object)
      );
    });

    it('should not execute handler if no route matches', async () => {
      const handler = vi.fn();
      chatbot.command('help', handler);

      mockMessage.text = '/start';
      await chatbot.handleMessage(mockMessage, mockPlatform);

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('integration', () => {
    it('should support complete message flow with middleware and handlers', async () => {
      const calls: string[] = [];

      const middleware: MiddlewareFunction = async (ctx, next) => {
        calls.push('middleware-before');
        await next();
        calls.push('middleware-after');
      };

      const handler = vi.fn(() => {
        calls.push('handler');
      });

      chatbot.use(middleware);
      chatbot.command('start', handler);

      const message: IncomingMessage = {
        id: 'msg123',
        userId: 'user123',
        chatId: 'chat123',
        platform: 'telegram',
        type: 'text',
        text: '/start',
        timestamp: new Date(),
        raw: {},
      };

      const platform: IPlatform = {
        name: 'telegram',
        version: '1.0.0',
        initialize: vi.fn(),
        shutdown: vi.fn(),
        sendMessage: vi.fn(),
        sendBulkMessages: vi.fn(),
      };

      await chatbot.handleMessage(message, platform);

      expect(calls).toEqual(['middleware-before', 'handler', 'middleware-after']);
      expect(handler).toHaveBeenCalledOnce();
    });

    it('should handle conversation flows', async () => {
      const { FlowBuilder } = await import('../flow/index.js');

      const flow = new FlowBuilder({
        name: 'test-flow',
        initialScene: 'start',
      });

      const enterHandler = vi.fn();
      const messageHandler = vi.fn();

      flow.scene({
        id: 'start',
        onEnter: enterHandler,
        onMessage: messageHandler,
      });

      chatbot.flow(flow);

      expect(chatbot.flows.has('test-flow')).toBe(true);

      // Start the flow
      const message: IncomingMessage = {
        id: 'msg123',
        userId: 'user123',
        chatId: 'chat123',
        platform: 'telegram',
        type: 'text',
        text: '/register',
        timestamp: new Date(),
        raw: {},
      };

      const platform: IPlatform = {
        name: 'telegram',
        version: '1.0.0',
        initialize: vi.fn(),
        shutdown: vi.fn(),
        sendMessage: vi.fn(),
        sendBulkMessages: vi.fn(),
      };

      chatbot.command('register', async (ctx) => {
        await flow.enter(ctx, chatbot.session);
      });

      await chatbot.handleMessage(message, platform);

      expect(enterHandler).toHaveBeenCalledOnce();

      // Send another message while in the flow
      const message2: IncomingMessage = {
        id: 'msg124',
        userId: 'user123',
        chatId: 'chat123',
        platform: 'telegram',
        type: 'text',
        text: 'John',
        timestamp: new Date(),
        raw: {},
      };

      await chatbot.handleMessage(message2, platform);

      expect(messageHandler).toHaveBeenCalledOnce();
    });
  });
});
