import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Logger } from '../core/Logger.js';
import type {
  Conversation,
  IChatbot,
  IContext,
  ILogger,
  IPlatform,
  IncomingMessage,
  User,
} from '../types/index.js';
import { type Agent, LiveChatPlugin } from './LiveChatPlugin.js';

describe('LiveChatPlugin', () => {
  let plugin: LiveChatPlugin;
  let mockChatbot: IChatbot;
  let mockLogger: ILogger;
  let mockContext: IContext;
  let mockPlatform: IPlatform;
  let mockUser: User;
  let mockConversation: Conversation;
  let mockMessage: IncomingMessage;

  beforeEach(() => {
    plugin = new LiveChatPlugin();

    mockLogger = new Logger({ level: 'info' });
    vi.spyOn(mockLogger, 'info').mockImplementation(() => {});
    vi.spyOn(mockLogger, 'warn').mockImplementation(() => {});
    vi.spyOn(mockLogger, 'error').mockImplementation(() => {});
    vi.spyOn(mockLogger, 'child').mockReturnValue(mockLogger);

    mockChatbot = {
      config: {
        platforms: {},
      },
      platforms: new Map(),
      plugins: new Map(),
      router: {} as any,
      logger: mockLogger,
      use: vi.fn(),
      command: vi.fn(),
      on: vi.fn(),
      text: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      broadcast: vi.fn(),
    };

    mockPlatform = {
      name: 'telegram',
      version: '1.0.0',
      initialize: vi.fn(),
      shutdown: vi.fn(),
      sendMessage: vi.fn().mockResolvedValue({
        success: true,
        messageId: 'msg123',
      }),
      sendBulkMessages: vi.fn(),
    };

    mockUser = {
      id: 'user123',
      platformId: 'tg123',
      platform: 'telegram',
      firstName: 'John',
      lastName: 'Doe',
      username: 'johndoe',
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockConversation = {
      id: 'conv123',
      userId: 'user123',
      platform: 'telegram',
      chatId: 'chat123',
      status: 'active',
      metadata: {},
      startedAt: new Date(),
      lastMessageAt: new Date(),
    };

    mockMessage = {
      id: 'msg123',
      userId: 'user123',
      chatId: 'chat123',
      platform: 'telegram',
      type: 'text',
      text: 'Hello',
      timestamp: new Date(),
      raw: {},
    };

    mockContext = {
      id: 'ctx123',
      platform: mockPlatform,
      user: mockUser,
      conversation: mockConversation,
      message: mockMessage,
      state: {
        get: vi.fn(),
        set: vi.fn(),
        delete: vi.fn(),
        clear: vi.fn(),
      },
      reply: vi.fn().mockResolvedValue({
        success: true,
        messageId: 'reply123',
      }),
      replyWithMedia: vi.fn(),
      replyWithButtons: vi.fn(),
    };
  });

  describe('plugin metadata', () => {
    it('should have correct name and version', () => {
      expect(plugin.name).toBe('LiveChatPlugin');
      expect(plugin.version).toBe('1.0.0');
    });
  });

  describe('configuration', () => {
    it('should use default configuration', () => {
      const defaultPlugin = new LiveChatPlugin();
      defaultPlugin.install(mockChatbot);

      expect(mockLogger.info).toHaveBeenCalledWith('LiveChatPlugin installed', {
        config: {
          autoAssign: true,
          maxConversationsPerAgent: 5,
          agentResponseTimeout: 300,
        },
      });
    });

    it('should accept custom configuration', () => {
      const customPlugin = new LiveChatPlugin({
        autoAssign: false,
        maxConversationsPerAgent: 10,
        agentResponseTimeout: 600,
      });
      customPlugin.install(mockChatbot);

      expect(mockLogger.info).toHaveBeenCalledWith('LiveChatPlugin installed', {
        config: {
          autoAssign: false,
          maxConversationsPerAgent: 10,
          agentResponseTimeout: 600,
        },
      });
    });

    it('should merge partial configuration with defaults', () => {
      const partialPlugin = new LiveChatPlugin({
        maxConversationsPerAgent: 3,
      });
      partialPlugin.install(mockChatbot);

      expect(mockLogger.info).toHaveBeenCalledWith('LiveChatPlugin installed', {
        config: {
          autoAssign: true,
          maxConversationsPerAgent: 3,
          agentResponseTimeout: 300,
        },
      });
    });
  });

  describe('agent management', () => {
    beforeEach(() => {
      plugin.install(mockChatbot);
    });

    describe('addAgent', () => {
      it('should add an agent', () => {
        const agent: Agent = {
          id: 'agent1',
          name: 'John Doe',
          status: 'online',
          maxConversations: 5,
          activeConversations: 0,
        };

        plugin.addAgent(agent);

        expect(plugin.getAgent('agent1')).toEqual(agent);
        expect(mockLogger.info).toHaveBeenCalledWith('Agent added', {
          agentId: 'agent1',
          name: 'John Doe',
        });
      });

      it('should add multiple agents', () => {
        const agent1: Agent = {
          id: 'agent1',
          name: 'John Doe',
          status: 'online',
          maxConversations: 5,
          activeConversations: 0,
        };

        const agent2: Agent = {
          id: 'agent2',
          name: 'Jane Smith',
          email: 'jane@example.com',
          status: 'online',
          maxConversations: 3,
          activeConversations: 0,
        };

        plugin.addAgent(agent1);
        plugin.addAgent(agent2);

        expect(plugin.getAllAgents()).toHaveLength(2);
        expect(plugin.getAgent('agent1')).toEqual(agent1);
        expect(plugin.getAgent('agent2')).toEqual(agent2);
      });

      it('should replace existing agent with same ID', () => {
        const agent1: Agent = {
          id: 'agent1',
          name: 'John Doe',
          status: 'online',
          maxConversations: 5,
          activeConversations: 0,
        };

        const agent2: Agent = {
          id: 'agent1',
          name: 'John Updated',
          status: 'busy',
          maxConversations: 3,
          activeConversations: 1,
        };

        plugin.addAgent(agent1);
        plugin.addAgent(agent2);

        expect(plugin.getAllAgents()).toHaveLength(1);
        expect(plugin.getAgent('agent1')).toEqual(agent2);
      });
    });

    describe('removeAgent', () => {
      it('should remove an agent', () => {
        const agent: Agent = {
          id: 'agent1',
          name: 'John Doe',
          status: 'online',
          maxConversations: 5,
          activeConversations: 0,
        };

        plugin.addAgent(agent);
        plugin.removeAgent('agent1');

        expect(plugin.getAgent('agent1')).toBeUndefined();
        expect(mockLogger.info).toHaveBeenCalledWith('Agent removed', {
          agentId: 'agent1',
        });
      });

      it('should not error when removing non-existent agent', () => {
        expect(() => plugin.removeAgent('nonexistent')).not.toThrow();
      });
    });

    describe('getAgent', () => {
      it('should return agent by ID', () => {
        const agent: Agent = {
          id: 'agent1',
          name: 'John Doe',
          status: 'online',
          maxConversations: 5,
          activeConversations: 0,
        };

        plugin.addAgent(agent);

        expect(plugin.getAgent('agent1')).toEqual(agent);
      });

      it('should return undefined for non-existent agent', () => {
        expect(plugin.getAgent('nonexistent')).toBeUndefined();
      });
    });

    describe('getAllAgents', () => {
      it('should return empty array when no agents', () => {
        expect(plugin.getAllAgents()).toEqual([]);
      });

      it('should return all agents', () => {
        const agent1: Agent = {
          id: 'agent1',
          name: 'John Doe',
          status: 'online',
          maxConversations: 5,
          activeConversations: 0,
        };

        const agent2: Agent = {
          id: 'agent2',
          name: 'Jane Smith',
          status: 'offline',
          maxConversations: 3,
          activeConversations: 0,
        };

        plugin.addAgent(agent1);
        plugin.addAgent(agent2);

        const agents = plugin.getAllAgents();
        expect(agents).toHaveLength(2);
        expect(agents).toContainEqual(agent1);
        expect(agents).toContainEqual(agent2);
      });
    });

    describe('getAvailableAgents', () => {
      it('should return only online agents with capacity', () => {
        const agent1: Agent = {
          id: 'agent1',
          name: 'John Doe',
          status: 'online',
          maxConversations: 5,
          activeConversations: 2,
        };

        const agent2: Agent = {
          id: 'agent2',
          name: 'Jane Smith',
          status: 'offline',
          maxConversations: 5,
          activeConversations: 0,
        };

        const agent3: Agent = {
          id: 'agent3',
          name: 'Bob Johnson',
          status: 'online',
          maxConversations: 3,
          activeConversations: 3,
        };

        const agent4: Agent = {
          id: 'agent4',
          name: 'Alice Williams',
          status: 'busy',
          maxConversations: 5,
          activeConversations: 1,
        };

        plugin.addAgent(agent1);
        plugin.addAgent(agent2);
        plugin.addAgent(agent3);
        plugin.addAgent(agent4);

        const available = plugin.getAvailableAgents();
        expect(available).toHaveLength(1);
        expect(available[0]).toEqual(agent1);
      });

      it('should return empty array when no agents available', () => {
        const agent: Agent = {
          id: 'agent1',
          name: 'John Doe',
          status: 'offline',
          maxConversations: 5,
          activeConversations: 0,
        };

        plugin.addAgent(agent);

        expect(plugin.getAvailableAgents()).toEqual([]);
      });
    });

    describe('updateAgentStatus', () => {
      it('should update agent status', () => {
        const agent: Agent = {
          id: 'agent1',
          name: 'John Doe',
          status: 'online',
          maxConversations: 5,
          activeConversations: 0,
        };

        plugin.addAgent(agent);
        plugin.updateAgentStatus('agent1', 'busy');

        const updated = plugin.getAgent('agent1');
        expect(updated?.status).toBe('busy');
        expect(mockLogger.info).toHaveBeenCalledWith('Agent status updated', {
          agentId: 'agent1',
          status: 'busy',
        });
      });

      it('should not error when updating non-existent agent', () => {
        expect(() => plugin.updateAgentStatus('nonexistent', 'online')).not.toThrow();
      });
    });
  });

  describe('conversation assignment', () => {
    beforeEach(() => {
      plugin.install(mockChatbot);
    });

    describe('requestAgent with auto-assign enabled', () => {
      it('should auto-assign to available agent', async () => {
        const agent: Agent = {
          id: 'agent1',
          name: 'John Doe',
          status: 'online',
          maxConversations: 5,
          activeConversations: 0,
        };

        plugin.addAgent(agent);

        const result = await plugin.requestAgent(mockContext);

        expect(result).toBe(true);
        expect(plugin.isAssigned('conv123')).toBe(true);
        expect(plugin.getAssignedAgent('conv123')).toEqual({
          ...agent,
          activeConversations: 1,
        });
        expect(mockContext.reply).toHaveBeenCalledWith(
          'You have been connected to John Doe. They will assist you shortly.'
        );
      });

      it('should return false if already assigned', async () => {
        const agent: Agent = {
          id: 'agent1',
          name: 'John Doe',
          status: 'online',
          maxConversations: 5,
          activeConversations: 0,
        };

        plugin.addAgent(agent);
        await plugin.requestAgent(mockContext);

        const result = await plugin.requestAgent(mockContext);

        expect(result).toBe(false);
        expect(mockContext.reply).toHaveBeenCalledWith('You are already connected to an agent.');
      });

      it('should add to queue if no agents available', async () => {
        const agent: Agent = {
          id: 'agent1',
          name: 'John Doe',
          status: 'offline',
          maxConversations: 5,
          activeConversations: 0,
        };

        plugin.addAgent(agent);

        const result = await plugin.requestAgent(mockContext);

        expect(result).toBe(false);
        expect(mockContext.reply).toHaveBeenCalledWith(
          'All agents are currently busy. You have been added to the queue. An agent will be with you shortly.'
        );
      });

      it('should select agent with fewest active conversations', async () => {
        const agent1: Agent = {
          id: 'agent1',
          name: 'John Doe',
          status: 'online',
          maxConversations: 5,
          activeConversations: 3,
        };

        const agent2: Agent = {
          id: 'agent2',
          name: 'Jane Smith',
          status: 'online',
          maxConversations: 5,
          activeConversations: 1,
        };

        plugin.addAgent(agent1);
        plugin.addAgent(agent2);

        await plugin.requestAgent(mockContext);

        const assigned = plugin.getAssignedAgent('conv123');
        expect(assigned?.id).toBe('agent2');
      });
    });

    describe('requestAgent with auto-assign disabled', () => {
      it('should add to queue when auto-assign disabled', async () => {
        const customPlugin = new LiveChatPlugin({ autoAssign: false });
        customPlugin.install(mockChatbot);

        const agent: Agent = {
          id: 'agent1',
          name: 'John Doe',
          status: 'online',
          maxConversations: 5,
          activeConversations: 0,
        };

        customPlugin.addAgent(agent);

        const result = await customPlugin.requestAgent(mockContext);

        expect(result).toBe(false);
        expect(mockContext.reply).toHaveBeenCalledWith(
          'All agents are currently busy. You have been added to the queue. An agent will be with you shortly.'
        );
      });
    });

    describe('assignAgent', () => {
      it('should manually assign conversation to agent', async () => {
        const agent: Agent = {
          id: 'agent1',
          name: 'John Doe',
          status: 'online',
          maxConversations: 5,
          activeConversations: 0,
        };

        plugin.addAgent(agent);

        const result = await plugin.assignAgent('conv123', 'agent1', mockContext);

        expect(result).toBe(true);
        expect(plugin.isAssigned('conv123')).toBe(true);
        expect(agent.activeConversations).toBe(1);
        expect(mockContext.reply).toHaveBeenCalledWith(
          'You have been connected to John Doe. They will assist you shortly.'
        );
      });

      it('should assign without context', async () => {
        const agent: Agent = {
          id: 'agent1',
          name: 'John Doe',
          status: 'online',
          maxConversations: 5,
          activeConversations: 0,
        };

        plugin.addAgent(agent);

        const result = await plugin.assignAgent('conv123', 'agent1');

        expect(result).toBe(true);
        expect(plugin.isAssigned('conv123')).toBe(true);
        expect(mockContext.reply).not.toHaveBeenCalled();
      });

      it('should return false for non-existent agent', async () => {
        const result = await plugin.assignAgent('conv123', 'nonexistent', mockContext);

        expect(result).toBe(false);
        expect(plugin.isAssigned('conv123')).toBe(false);
        expect(mockLogger.error).toHaveBeenCalledWith('Agent not found', {
          agentId: 'nonexistent',
        });
      });

      it('should return false for offline agent', async () => {
        const agent: Agent = {
          id: 'agent1',
          name: 'John Doe',
          status: 'offline',
          maxConversations: 5,
          activeConversations: 0,
        };

        plugin.addAgent(agent);

        const result = await plugin.assignAgent('conv123', 'agent1', mockContext);

        expect(result).toBe(false);
        expect(plugin.isAssigned('conv123')).toBe(false);
        expect(mockLogger.warn).toHaveBeenCalledWith('Agent is not online', {
          agentId: 'agent1',
          status: 'offline',
        });
      });

      it('should return false for agent at max capacity', async () => {
        const agent: Agent = {
          id: 'agent1',
          name: 'John Doe',
          status: 'online',
          maxConversations: 2,
          activeConversations: 2,
        };

        plugin.addAgent(agent);

        const result = await plugin.assignAgent('conv123', 'agent1', mockContext);

        expect(result).toBe(false);
        expect(plugin.isAssigned('conv123')).toBe(false);
        expect(mockLogger.warn).toHaveBeenCalledWith('Agent at max capacity', {
          agentId: 'agent1',
        });
      });
    });

    describe('endConversation', () => {
      it('should end conversation and free agent', async () => {
        const agent: Agent = {
          id: 'agent1',
          name: 'John Doe',
          status: 'online',
          maxConversations: 5,
          activeConversations: 0,
        };

        plugin.addAgent(agent);
        await plugin.assignAgent('conv123', 'agent1', mockContext);

        const result = await plugin.endConversation('conv123', mockContext);

        expect(result).toBe(true);
        expect(plugin.isAssigned('conv123')).toBe(false);
        expect(agent.activeConversations).toBe(0);
        expect(mockContext.reply).toHaveBeenCalledWith(
          'Your conversation with the agent has ended. Thank you!'
        );
      });

      it('should end conversation without context', async () => {
        const agent: Agent = {
          id: 'agent1',
          name: 'John Doe',
          status: 'online',
          maxConversations: 5,
          activeConversations: 0,
        };

        plugin.addAgent(agent);
        await plugin.assignAgent('conv123', 'agent1');

        const result = await plugin.endConversation('conv123');

        expect(result).toBe(true);
        expect(plugin.isAssigned('conv123')).toBe(false);
        expect(mockContext.reply).not.toHaveBeenCalled();
      });

      it('should return false for non-assigned conversation', async () => {
        const result = await plugin.endConversation('conv123', mockContext);

        expect(result).toBe(false);
      });

      it('should handle missing agent gracefully', async () => {
        const agent: Agent = {
          id: 'agent1',
          name: 'John Doe',
          status: 'online',
          maxConversations: 5,
          activeConversations: 0,
        };

        plugin.addAgent(agent);
        await plugin.assignAgent('conv123', 'agent1');
        plugin.removeAgent('agent1');

        const result = await plugin.endConversation('conv123', mockContext);

        expect(result).toBe(true);
        expect(plugin.isAssigned('conv123')).toBe(false);
      });

      it('should not allow negative active conversations', async () => {
        const agent: Agent = {
          id: 'agent1',
          name: 'John Doe',
          status: 'online',
          maxConversations: 5,
          activeConversations: 0,
        };

        plugin.addAgent(agent);
        await plugin.assignAgent('conv123', 'agent1');

        // Manually set to 0
        agent.activeConversations = 0;

        await plugin.endConversation('conv123');

        expect(agent.activeConversations).toBe(0);
      });
    });

    describe('getAssignedAgent', () => {
      it('should return assigned agent', async () => {
        const agent: Agent = {
          id: 'agent1',
          name: 'John Doe',
          status: 'online',
          maxConversations: 5,
          activeConversations: 0,
        };

        plugin.addAgent(agent);
        await plugin.assignAgent('conv123', 'agent1');

        const assigned = plugin.getAssignedAgent('conv123');
        expect(assigned?.id).toBe('agent1');
      });

      it('should return undefined for non-assigned conversation', () => {
        expect(plugin.getAssignedAgent('conv123')).toBeUndefined();
      });
    });

    describe('isAssigned', () => {
      it('should return true for assigned conversation', async () => {
        const agent: Agent = {
          id: 'agent1',
          name: 'John Doe',
          status: 'online',
          maxConversations: 5,
          activeConversations: 0,
        };

        plugin.addAgent(agent);
        await plugin.assignAgent('conv123', 'agent1');

        expect(plugin.isAssigned('conv123')).toBe(true);
      });

      it('should return false for non-assigned conversation', () => {
        expect(plugin.isAssigned('conv123')).toBe(false);
      });
    });
  });

  describe('lifecycle hooks', () => {
    it('should log on install', () => {
      plugin.install(mockChatbot);

      expect(mockLogger.info).toHaveBeenCalledWith('LiveChatPlugin installed', {
        config: {
          autoAssign: true,
          maxConversationsPerAgent: 5,
          agentResponseTimeout: 300,
        },
      });
    });

    it('should clear state on uninstall', () => {
      plugin.install(mockChatbot);

      const agent: Agent = {
        id: 'agent1',
        name: 'John Doe',
        status: 'online',
        maxConversations: 5,
        activeConversations: 0,
      };

      plugin.addAgent(agent);
      plugin.uninstall();

      expect(mockLogger.info).toHaveBeenCalledWith('LiveChatPlugin uninstalled');
    });
  });

  describe('integration scenarios', () => {
    beforeEach(() => {
      plugin.install(mockChatbot);
    });

    it('should handle multiple conversations with multiple agents', async () => {
      const agent1: Agent = {
        id: 'agent1',
        name: 'John Doe',
        status: 'online',
        maxConversations: 2,
        activeConversations: 0,
      };

      const agent2: Agent = {
        id: 'agent2',
        name: 'Jane Smith',
        status: 'online',
        maxConversations: 2,
        activeConversations: 0,
      };

      plugin.addAgent(agent1);
      plugin.addAgent(agent2);

      // Assign first conversation
      const ctx1 = {
        ...mockContext,
        conversation: {
          ...mockConversation,
          id: 'conv1',
        },
      };
      await plugin.requestAgent(ctx1 as IContext);

      // Assign second conversation
      const ctx2 = {
        ...mockContext,
        conversation: {
          ...mockConversation,
          id: 'conv2',
        },
      };
      await plugin.requestAgent(ctx2 as IContext);

      // Assign third conversation
      const ctx3 = {
        ...mockContext,
        conversation: {
          ...mockConversation,
          id: 'conv3',
        },
      };
      await plugin.requestAgent(ctx3 as IContext);

      expect(plugin.isAssigned('conv1')).toBe(true);
      expect(plugin.isAssigned('conv2')).toBe(true);
      expect(plugin.isAssigned('conv3')).toBe(true);
      expect(agent1.activeConversations + agent2.activeConversations).toBe(3);
    });

    it('should redistribute load when agent status changes', async () => {
      const agent: Agent = {
        id: 'agent1',
        name: 'John Doe',
        status: 'online',
        maxConversations: 5,
        activeConversations: 2,
      };

      plugin.addAgent(agent);

      // Change status to offline
      plugin.updateAgentStatus('agent1', 'offline');

      // Try to assign new conversation
      const result = await plugin.assignAgent('conv123', 'agent1', mockContext);

      expect(result).toBe(false);
      expect(agent.activeConversations).toBe(2); // Unchanged
    });
  });
});
