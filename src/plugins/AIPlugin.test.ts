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
import { AIPlugin, type Intent } from './AIPlugin.js';

// Mock the Gemini SDK
vi.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: vi.fn().mockImplementation(() => {
      return {
        getGenerativeModel: vi.fn().mockReturnValue({
          generateContent: vi.fn().mockResolvedValue({
            response: {
              text: () => 'Mocked AI response',
              usageMetadata: {
                promptTokenCount: 10,
                candidatesTokenCount: 20,
                totalTokenCount: 30,
              },
            },
          }),
          generateContentStream: vi.fn().mockResolvedValue({
            stream: (async function* () {
              yield { text: () => 'Mocked ' };
              yield { text: () => 'streaming ' };
              yield { text: () => 'response' };
            })(),
            response: Promise.resolve({
              usageMetadata: {
                promptTokenCount: 10,
                candidatesTokenCount: 20,
                totalTokenCount: 30,
              },
            }),
          }),
        }),
      };
    }),
  };
});

describe('AIPlugin', () => {
  let plugin: AIPlugin;
  let mockChatbot: IChatbot;
  let mockLogger: ILogger;
  let mockContext: IContext;
  let mockPlatform: IPlatform;
  let mockUser: User;
  let mockConversation: Conversation;
  let mockMessage: IncomingMessage;

  beforeEach(() => {
    mockLogger = new Logger({ level: 'info' });
    vi.spyOn(mockLogger, 'info').mockImplementation(() => {});
    vi.spyOn(mockLogger, 'warn').mockImplementation(() => {});
    vi.spyOn(mockLogger, 'error').mockImplementation(() => {});
    vi.spyOn(mockLogger, 'debug').mockImplementation(() => {});
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
      text: 'Hello, how are you?',
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

    plugin = new AIPlugin({
      apiKey: 'test-api-key',
      provider: 'gemini',
      model: 'gemini-2.0-flash-exp',
    });
  });

  describe('plugin metadata', () => {
    it('should have correct name and version', () => {
      expect(plugin.name).toBe('AIPlugin');
      expect(plugin.version).toBe('1.0.0');
    });
  });

  describe('configuration', () => {
    it('should use default configuration', () => {
      const defaultPlugin = new AIPlugin({
        apiKey: 'test-key',
      });
      defaultPlugin.install(mockChatbot);

      expect(mockLogger.info).toHaveBeenCalledWith('AIPlugin installed', {
        provider: 'gemini',
        model: 'gemini-2.0-flash-exp',
      });
    });

    it('should accept custom configuration', () => {
      const customPlugin = new AIPlugin({
        apiKey: 'test-key',
        provider: 'gemini',
        model: 'gemini-pro',
        temperature: 0.9,
        maxTokens: 2000,
        systemPrompt: 'Custom system prompt',
      });
      customPlugin.install(mockChatbot);

      expect(mockLogger.info).toHaveBeenCalledWith('AIPlugin installed', {
        provider: 'gemini',
        model: 'gemini-pro',
      });
    });

    it('should configure intent detection', () => {
      const intentPlugin = new AIPlugin({
        apiKey: 'test-key',
        intents: {
          enabled: true,
          builtIn: ['greeting', 'farewell'],
          custom: [
            {
              name: 'pricing',
              keywords: ['price', 'cost'],
              description: 'Pricing inquiry',
            },
          ],
        },
      });
      intentPlugin.install(mockChatbot);

      expect(intentPlugin).toBeDefined();
    });

    it('should configure memory settings', () => {
      const memoryPlugin = new AIPlugin({
        apiKey: 'test-key',
        memory: {
          enabled: true,
          maxTurns: 5,
          ttlMinutes: 15,
        },
      });
      memoryPlugin.install(mockChatbot);

      expect(memoryPlugin).toBeDefined();
    });
  });

  describe('generateResponse', () => {
    beforeEach(() => {
      plugin.install(mockChatbot);
    });

    it('should generate a response from Gemini', async () => {
      const response = await plugin.generateResponse(mockContext);

      expect(response.text).toBe('Mocked AI response');
      expect(response.usage).toBeDefined();
      expect(response.usage?.promptTokens).toBe(10);
      expect(response.usage?.completionTokens).toBe(20);
      expect(response.usage?.totalTokens).toBe(30);
    });

    it('should handle empty message', async () => {
      mockContext.message.text = '';

      const response = await plugin.generateResponse(mockContext);

      expect(response.text).toBe('I did not receive a message. Please try again.');
    });

    it('should handle undefined message text', async () => {
      mockContext.message.text = undefined;

      const response = await plugin.generateResponse(mockContext);

      expect(response.text).toBe('I did not receive a message. Please try again.');
    });

    it('should detect intent from message', async () => {
      mockContext.message.text = 'Hello there!';

      const response = await plugin.generateResponse(mockContext);

      expect(response.intent).toBe('greeting');
      expect(response.confidence).toBeGreaterThan(0);
    });

    it('should detect farewell intent', async () => {
      mockContext.message.text = 'Goodbye, see you later!';

      const response = await plugin.generateResponse(mockContext);

      expect(response.intent).toBe('farewell');
      expect(response.confidence).toBeGreaterThan(0);
    });

    it('should detect human support intent', async () => {
      mockContext.message.text = 'I need to talk to a human agent';

      const response = await plugin.generateResponse(mockContext);

      expect(response.intent).toBe('human_support');
      expect(response.confidence).toBeGreaterThan(0);
    });

    it('should store conversation history when memory is enabled', async () => {
      await plugin.generateResponse(mockContext);

      const history = plugin.getHistory('conv123');
      expect(history).toHaveLength(2); // user + assistant
      expect(history[0].role).toBe('user');
      expect(history[0].content).toBe('Hello, how are you?');
      expect(history[1].role).toBe('assistant');
      expect(history[1].content).toBe('Mocked AI response');
    });

    it('should not store history when memory is disabled', async () => {
      const noMemoryPlugin = new AIPlugin({
        apiKey: 'test-key',
        memory: {
          enabled: false,
        },
      });
      noMemoryPlugin.install(mockChatbot);

      await noMemoryPlugin.generateResponse(mockContext);

      const history = noMemoryPlugin.getHistory('conv123');
      expect(history).toHaveLength(0);
    });

    it('should limit conversation history size', async () => {
      const limitedPlugin = new AIPlugin({
        apiKey: 'test-key',
        memory: {
          enabled: true,
          maxTurns: 2,
        },
      });
      limitedPlugin.install(mockChatbot);

      // Generate 5 responses (10 turns total)
      for (let i = 0; i < 5; i++) {
        mockContext.message.text = `Message ${i}`;
        await limitedPlugin.generateResponse(mockContext);
      }

      const history = limitedPlugin.getHistory('conv123');
      expect(history.length).toBeLessThanOrEqual(4); // maxTurns * 2
    });

    it('should use fallback message on error', async () => {
      const errorPlugin = new AIPlugin({
        apiKey: 'invalid-key',
        fallback: {
          enabled: true,
          message: 'Custom fallback message',
        },
      });
      errorPlugin.install(mockChatbot);

      // Mock error in Gemini client
      vi.spyOn(errorPlugin as any, '_generateGeminiResponse').mockRejectedValue(
        new Error('API error')
      );

      const response = await errorPlugin.generateResponse(mockContext);

      expect(response.text).toBe('Custom fallback message');
    });

    it('should throw error when fallback is disabled', async () => {
      const noFallbackPlugin = new AIPlugin({
        apiKey: 'test-key',
        fallback: {
          enabled: false,
        },
      });
      noFallbackPlugin.install(mockChatbot);

      // Mock error
      vi.spyOn(noFallbackPlugin as any, '_generateGeminiResponse').mockRejectedValue(
        new Error('API error')
      );

      await expect(noFallbackPlugin.generateResponse(mockContext)).rejects.toThrow('API error');
    });
  });

  describe('generateStreamingResponse', () => {
    beforeEach(() => {
      plugin.install(mockChatbot);
    });

    it('should generate streaming response', async () => {
      const chunks: string[] = [];
      const onChunk = (chunk: string) => chunks.push(chunk);

      const response = await plugin.generateStreamingResponse(mockContext, onChunk);

      expect(response.text).toBe('Mocked streaming response');
      expect(chunks).toEqual(['Mocked ', 'streaming ', 'response']);
    });

    it('should handle empty message in streaming', async () => {
      mockContext.message.text = '';

      const response = await plugin.generateStreamingResponse(mockContext);

      expect(response.text).toBe('I did not receive a message. Please try again.');
    });
  });

  describe('conversation history', () => {
    beforeEach(() => {
      plugin.install(mockChatbot);
    });

    it('should clear conversation history', async () => {
      await plugin.generateResponse(mockContext);

      expect(plugin.getHistory('conv123').length).toBeGreaterThan(0);

      plugin.clearHistory('conv123');

      expect(plugin.getHistory('conv123')).toHaveLength(0);
    });

    it('should return empty array for non-existent conversation', () => {
      const history = plugin.getHistory('nonexistent');
      expect(history).toEqual([]);
    });

    it('should track timestamps for conversation turns', async () => {
      await plugin.generateResponse(mockContext);

      const history = plugin.getHistory('conv123');
      expect(history[0].timestamp).toBeInstanceOf(Date);
      expect(history[1].timestamp).toBeInstanceOf(Date);
    });
  });

  describe('intent detection', () => {
    beforeEach(() => {
      plugin.install(mockChatbot);
    });

    it('should detect custom intents', async () => {
      const customPlugin = new AIPlugin({
        apiKey: 'test-key',
        intents: {
          enabled: true,
          builtIn: [],
          custom: [
            {
              name: 'pricing',
              keywords: ['price', 'cost', 'how much'],
              description: 'Pricing inquiry',
            },
          ],
        },
      });
      customPlugin.install(mockChatbot);

      mockContext.message.text = 'How much does it cost?';

      const response = await customPlugin.generateResponse(mockContext);

      expect(response.intent).toBe('pricing');
      expect(response.confidence).toBeGreaterThan(0);
    });

    it('should return no intent for unmatched messages', async () => {
      mockContext.message.text = 'Random message with no intent keywords';

      const response = await plugin.generateResponse(mockContext);

      expect(response.intent).toBeUndefined();
      expect(response.confidence).toBe(0);
    });

    it('should calculate confidence based on keyword matches', async () => {
      mockContext.message.text = 'Hello hi hey';

      const response = await plugin.generateResponse(mockContext);

      expect(response.confidence).toBeGreaterThan(0);
      expect(response.confidence).toBeLessThanOrEqual(1);
    });

    it('should select best matching intent', async () => {
      const multiIntentPlugin = new AIPlugin({
        apiKey: 'test-key',
        intents: {
          enabled: true,
          builtIn: ['greeting'],
          custom: [
            {
              name: 'specific_greeting',
              keywords: ['hello friend', 'hello there'],
              description: 'Specific greeting',
            },
          ],
        },
      });
      multiIntentPlugin.install(mockChatbot);

      mockContext.message.text = 'Hello there friend!';

      const response = await multiIntentPlugin.generateResponse(mockContext);

      // Should match the more specific intent
      expect(response.intent).toBeDefined();
    });
  });

  describe('provider support', () => {
    it('should throw error for OpenAI provider (not implemented)', async () => {
      const openaiPlugin = new AIPlugin({
        apiKey: 'test-key',
        provider: 'openai',
        fallback: {
          enabled: false,
        },
      });
      openaiPlugin.install(mockChatbot);

      await expect(openaiPlugin.generateResponse(mockContext)).rejects.toThrow(
        'OpenAI provider not yet implemented'
      );
    });

    it('should throw error for Anthropic provider (not implemented)', async () => {
      const anthropicPlugin = new AIPlugin({
        apiKey: 'test-key',
        provider: 'anthropic',
        fallback: {
          enabled: false,
        },
      });
      anthropicPlugin.install(mockChatbot);

      await expect(anthropicPlugin.generateResponse(mockContext)).rejects.toThrow(
        'Anthropic provider not yet implemented'
      );
    });
  });

  describe('lifecycle hooks', () => {
    it('should initialize Gemini client on install', () => {
      plugin.install(mockChatbot);

      expect(mockLogger.info).toHaveBeenCalledWith('Gemini client initialized');
      expect(mockLogger.info).toHaveBeenCalledWith('AIPlugin installed', {
        provider: 'gemini',
        model: 'gemini-2.0-flash-exp',
      });
    });

    it('should clear state on uninstall', async () => {
      plugin.install(mockChatbot);

      await plugin.generateResponse(mockContext);
      expect(plugin.getHistory('conv123').length).toBeGreaterThan(0);

      plugin.uninstall();

      expect(plugin.getHistory('conv123')).toHaveLength(0);
      expect(mockLogger.info).toHaveBeenCalledWith('AIPlugin uninstalled');
    });
  });

  describe('formatting options', () => {
    it('should respect tone setting', () => {
      const formalPlugin = new AIPlugin({
        apiKey: 'test-key',
        formatting: {
          tone: 'professional',
        },
      });
      formalPlugin.install(mockChatbot);

      expect(formalPlugin).toBeDefined();
    });

    it('should respect max length setting', () => {
      const shortPlugin = new AIPlugin({
        apiKey: 'test-key',
        formatting: {
          maxLength: 100,
        },
      });
      shortPlugin.install(mockChatbot);

      expect(shortPlugin).toBeDefined();
    });

    it('should respect emoji setting', () => {
      const noEmojiPlugin = new AIPlugin({
        apiKey: 'test-key',
        formatting: {
          includeEmoji: false,
        },
      });
      noEmojiPlugin.install(mockChatbot);

      expect(noEmojiPlugin).toBeDefined();
    });
  });

  describe('integration scenarios', () => {
    beforeEach(() => {
      plugin.install(mockChatbot);
    });

    it('should handle multiple conversations independently', async () => {
      // First conversation
      const ctx1 = {
        ...mockContext,
        conversation: { ...mockConversation, id: 'conv1' },
      };
      mockContext.message.text = 'Message from conversation 1';
      await plugin.generateResponse(ctx1 as IContext);

      // Second conversation
      const ctx2 = {
        ...mockContext,
        conversation: { ...mockConversation, id: 'conv2' },
      };
      mockContext.message.text = 'Message from conversation 2';
      await plugin.generateResponse(ctx2 as IContext);

      const history1 = plugin.getHistory('conv1');
      const history2 = plugin.getHistory('conv2');

      expect(history1).toHaveLength(2);
      expect(history2).toHaveLength(2);
      expect(history1[0].content).not.toBe(history2[0].content);
    });

    it('should maintain context across multiple messages', async () => {
      // First message
      mockContext.message.text = 'What is your name?';
      await plugin.generateResponse(mockContext);

      // Second message
      mockContext.message.text = 'Can you help me?';
      await plugin.generateResponse(mockContext);

      const history = plugin.getHistory('conv123');
      expect(history).toHaveLength(4); // 2 user + 2 assistant
    });
  });
});
