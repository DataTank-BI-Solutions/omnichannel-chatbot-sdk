import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Context } from '../core/Context.js';
import { SessionManager } from '../session/SessionManager.js';
import type { Conversation, IContext, IPlatform, IncomingMessage, User } from '../types/index.js';
import { FlowBuilder } from './FlowBuilder.js';

describe('FlowBuilder', () => {
  let flow: FlowBuilder;
  let sessionManager: SessionManager;
  let mockContext: IContext;
  let mockPlatform: IPlatform;

  beforeEach(() => {
    flow = new FlowBuilder({
      name: 'test-flow',
      initialScene: 'start',
      defaultSceneTTL: 3600,
    });

    sessionManager = new SessionManager({ ttl: 3600 });

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

  describe('constructor', () => {
    it('should create flow with config', () => {
      expect(flow.name).toBe('test-flow');
      expect(flow.initialScene).toBe('start');
      expect(flow.defaultSceneTTL).toBe(3600);
    });
  });

  describe('scene', () => {
    it('should register a scene', () => {
      flow.scene({
        id: 'welcome',
        onEnter: async (ctx) => {
          await ctx.reply('Welcome!');
        },
      });

      expect(flow.hasScene('welcome')).toBe(true);
      expect(flow.getScene('welcome')).toBeDefined();
    });

    it('should return flow instance for chaining', () => {
      const result = flow.scene({ id: 'scene1' });

      expect(result).toBe(flow);
    });

    it('should register multiple scenes', () => {
      flow.scene({ id: 'scene1' }).scene({ id: 'scene2' }).scene({ id: 'scene3' });

      expect(flow.scenes).toHaveLength(3);
      expect(flow.hasScene('scene1')).toBe(true);
      expect(flow.hasScene('scene2')).toBe(true);
      expect(flow.hasScene('scene3')).toBe(true);
    });

    it('should apply default TTL to scenes', () => {
      flow.scene({ id: 'test' });

      const scene = flow.getScene('test');

      expect(scene?.ttl).toBe(3600);
    });

    it('should override default TTL with scene-specific TTL', () => {
      flow.scene({ id: 'test', ttl: 1800 });

      const scene = flow.getScene('test');

      expect(scene?.ttl).toBe(1800);
    });
  });

  describe('getScene and hasScene', () => {
    beforeEach(() => {
      flow.scene({ id: 'test-scene' });
    });

    it('should return scene when it exists', () => {
      const scene = flow.getScene('test-scene');

      expect(scene).toBeDefined();
      expect(scene?.id).toBe('test-scene');
    });

    it('should return undefined for non-existent scene', () => {
      const scene = flow.getScene('nonexistent');

      expect(scene).toBeUndefined();
    });

    it('should return true when scene exists', () => {
      expect(flow.hasScene('test-scene')).toBe(true);
    });

    it('should return false when scene does not exist', () => {
      expect(flow.hasScene('nonexistent')).toBe(false);
    });
  });

  describe('enter', () => {
    it('should enter initial scene', async () => {
      const onEnter = vi.fn();

      flow.scene({
        id: 'start',
        onEnter,
      });

      await flow.enter(mockContext, sessionManager);

      expect(onEnter).toHaveBeenCalled();
    });

    it('should throw error if no initial scene defined', async () => {
      const flowWithoutInitial = new FlowBuilder({ name: 'test' });

      await expect(flowWithoutInitial.enter(mockContext, sessionManager)).rejects.toThrow(
        'Flow "test" has no initial scene defined'
      );
    });
  });

  describe('handleMessage', () => {
    it('should call scene message handler', async () => {
      const onMessage = vi.fn();

      flow.scene({
        id: 'start',
        onMessage,
      });

      await flow.enter(mockContext, sessionManager);
      await flow.handleMessage(mockContext, sessionManager);

      expect(onMessage).toHaveBeenCalled();
    });

    it('should not handle message if no active scene', async () => {
      const onMessage = vi.fn();

      flow.scene({
        id: 'start',
        onMessage,
      });

      await flow.handleMessage(mockContext, sessionManager);

      expect(onMessage).not.toHaveBeenCalled();
    });

    it('should clear scene if scene not found', async () => {
      // Manually set a non-existent scene
      await sessionManager.set('user123', 'telegram', 'flow:test-flow:scene', {
        sceneId: 'nonexistent',
        enteredAt: new Date(),
        data: {},
      });

      await flow.handleMessage(mockContext, sessionManager);

      const hasSession = await sessionManager.storage.has('telegram:user123');
      expect(hasSession).toBe(true); // Session exists but scene should be cleared
    });
  });

  describe('scene navigation', () => {
    it('should navigate between scenes', async () => {
      const scene1Enter = vi.fn();
      const scene2Enter = vi.fn();

      // Create a new flow with initialScene set
      const navFlow = new FlowBuilder({
        name: 'nav-flow',
        initialScene: 'scene1',
      });
      navFlow
        .scene({
          id: 'scene1',
          onEnter: scene1Enter,
          onMessage: async (ctx) => {
            await ctx.enterScene('scene2');
          },
        })
        .scene({
          id: 'scene2',
          onEnter: scene2Enter,
        });

      await navFlow.enter(mockContext, sessionManager);

      expect(scene1Enter).toHaveBeenCalled();
      expect(scene2Enter).not.toHaveBeenCalled();

      await navFlow.handleMessage(mockContext, sessionManager);

      expect(scene2Enter).toHaveBeenCalled();
    });

    it('should call leave handler when leaving scene', async () => {
      const scene1Leave = vi.fn();

      const leaveFlow = new FlowBuilder({
        name: 'leave-flow',
        initialScene: 'scene1',
      });
      leaveFlow
        .scene({
          id: 'scene1',
          onLeave: scene1Leave,
          onMessage: async (ctx) => {
            await ctx.enterScene('scene2');
          },
        })
        .scene({
          id: 'scene2',
        });

      await leaveFlow.enter(mockContext, sessionManager);
      await leaveFlow.handleMessage(mockContext, sessionManager);

      expect(scene1Leave).toHaveBeenCalled();
    });

    it('should clear scene when leaving flow', async () => {
      flow.scene({
        id: 'start',
        onMessage: async (ctx) => {
          await ctx.leaveScene();
        },
      });

      await flow.enter(mockContext, sessionManager);

      const beforeLeave = await sessionManager.get('user123', 'telegram', 'flow:test-flow:scene');
      expect(beforeLeave).toBeDefined();

      await flow.handleMessage(mockContext, sessionManager);

      const afterLeave = await sessionManager.get('user123', 'telegram', 'flow:test-flow:scene');
      expect(afterLeave).toBeUndefined();
    });
  });

  describe('flow state', () => {
    it('should store and retrieve flow state', async () => {
      flow.scene({
        id: 'start',
        onMessage: async (ctx) => {
          ctx.flowState.set('name', 'John');
          ctx.flowState.set('age', 30);
        },
      });

      await flow.enter(mockContext, sessionManager);
      await flow.handleMessage(mockContext, sessionManager);

      const state = await sessionManager.get('user123', 'telegram', 'flow:test-flow:state');
      expect(state).toEqual({ name: 'John', age: 30 });
    });

    it('should persist flow state across messages', async () => {
      let retrievedName: string | undefined;

      const stateFlow = new FlowBuilder({
        name: 'state-flow',
        initialScene: 'scene1',
      });
      stateFlow
        .scene({
          id: 'scene1',
          onMessage: async (ctx) => {
            ctx.flowState.set('name', 'John');
            await ctx.enterScene('scene2');
          },
        })
        .scene({
          id: 'scene2',
          onMessage: async (ctx) => {
            retrievedName = ctx.flowState.get<string>('name');
          },
        });

      await stateFlow.enter(mockContext, sessionManager);
      await stateFlow.handleMessage(mockContext, sessionManager);
      await stateFlow.handleMessage(mockContext, sessionManager);

      expect(retrievedName).toBe('John');
    });
  });
});
