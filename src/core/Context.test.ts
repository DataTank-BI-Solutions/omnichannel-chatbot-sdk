import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  Conversation,
  IPlatform,
  IncomingMessage,
  MediaAttachment,
  MessageButton,
  MessageResult,
  OutgoingMessage,
  User,
} from '../types/index.js';
import { Context } from './Context.js';

describe('Context', () => {
  let mockPlatform: IPlatform;
  let mockUser: User;
  let mockConversation: Conversation;
  let mockMessage: IncomingMessage;

  beforeEach(() => {
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
  });

  describe('constructor', () => {
    it('should create context with required properties', () => {
      const ctx = new Context(mockMessage, mockPlatform, mockUser, mockConversation);

      expect(ctx.id).toBeDefined();
      expect(ctx.id).toMatch(/^[a-zA-Z0-9_-]+$/); // nanoid format
      expect(ctx.message).toBe(mockMessage);
      expect(ctx.platform).toBe(mockPlatform);
      expect(ctx.user).toBe(mockUser);
      expect(ctx.conversation).toBe(mockConversation);
      expect(ctx.state).toBeDefined();
    });

    it('should generate unique IDs for each context', () => {
      const ctx1 = new Context(mockMessage, mockPlatform, mockUser, mockConversation);
      const ctx2 = new Context(mockMessage, mockPlatform, mockUser, mockConversation);

      expect(ctx1.id).not.toBe(ctx2.id);
    });
  });

  describe('state', () => {
    it('should initialize with empty state', () => {
      const ctx = new Context(mockMessage, mockPlatform, mockUser, mockConversation);

      expect(ctx.state.get('anything')).toBeUndefined();
    });

    it('should store and retrieve state values', () => {
      const ctx = new Context(mockMessage, mockPlatform, mockUser, mockConversation);

      ctx.state.set('key1', 'value1');
      ctx.state.set('key2', 123);
      ctx.state.set('key3', { nested: 'object' });

      expect(ctx.state.get('key1')).toBe('value1');
      expect(ctx.state.get('key2')).toBe(123);
      expect(ctx.state.get('key3')).toEqual({ nested: 'object' });
    });

    it('should delete state values', () => {
      const ctx = new Context(mockMessage, mockPlatform, mockUser, mockConversation);

      ctx.state.set('key', 'value');
      expect(ctx.state.get('key')).toBe('value');

      ctx.state.delete('key');
      expect(ctx.state.get('key')).toBeUndefined();
    });

    it('should clear all state values', () => {
      const ctx = new Context(mockMessage, mockPlatform, mockUser, mockConversation);

      ctx.state.set('key1', 'value1');
      ctx.state.set('key2', 'value2');
      ctx.state.set('key3', 'value3');

      ctx.state.clear();

      expect(ctx.state.get('key1')).toBeUndefined();
      expect(ctx.state.get('key2')).toBeUndefined();
      expect(ctx.state.get('key3')).toBeUndefined();
    });

    it('should handle typed state values', () => {
      const ctx = new Context(mockMessage, mockPlatform, mockUser, mockConversation);

      interface CustomData {
        count: number;
        enabled: boolean;
      }

      const data: CustomData = { count: 5, enabled: true };
      ctx.state.set<CustomData>('customData', data);

      const retrieved = ctx.state.get<CustomData>('customData');
      expect(retrieved).toEqual(data);
      expect(retrieved?.count).toBe(5);
      expect(retrieved?.enabled).toBe(true);
    });
  });

  describe('reply', () => {
    it('should send text message when string is provided', async () => {
      const ctx = new Context(mockMessage, mockPlatform, mockUser, mockConversation);

      const result = await ctx.reply('Hello, user!');

      expect(mockPlatform.sendMessage).toHaveBeenCalledWith(mockUser.platformId, {
        type: 'text',
        text: 'Hello, user!',
      });
      expect(result).toEqual({
        success: true,
        messageId: 'msg123',
      });
    });

    it('should send structured message when OutgoingMessage is provided', async () => {
      const ctx = new Context(mockMessage, mockPlatform, mockUser, mockConversation);

      const outgoingMessage: OutgoingMessage = {
        type: 'text',
        text: 'Structured message',
      };

      const result = await ctx.reply(outgoingMessage);

      expect(mockPlatform.sendMessage).toHaveBeenCalledWith(mockUser.platformId, outgoingMessage);
      expect(result).toEqual({
        success: true,
        messageId: 'msg123',
      });
    });

    it('should handle send failures', async () => {
      const ctx = new Context(mockMessage, mockPlatform, mockUser, mockConversation);

      const error = new Error('Send failed');
      vi.mocked(mockPlatform.sendMessage).mockRejectedValueOnce(error);

      await expect(ctx.reply('Test')).rejects.toThrow('Send failed');
    });
  });

  describe('replyWithMedia', () => {
    it('should send media message', async () => {
      const ctx = new Context(mockMessage, mockPlatform, mockUser, mockConversation);

      const media: MediaAttachment = {
        type: 'image',
        url: 'https://example.com/image.jpg',
      };

      const result = await ctx.replyWithMedia(media);

      expect(mockPlatform.sendMessage).toHaveBeenCalledWith(mockUser.platformId, {
        type: 'image',
        media,
      });
      expect(result).toEqual({
        success: true,
        messageId: 'msg123',
      });
    });

    it('should send video media', async () => {
      const ctx = new Context(mockMessage, mockPlatform, mockUser, mockConversation);

      const media: MediaAttachment = {
        type: 'video',
        url: 'https://example.com/video.mp4',
      };

      await ctx.replyWithMedia(media);

      expect(mockPlatform.sendMessage).toHaveBeenCalledWith(mockUser.platformId, {
        type: 'video',
        media,
      });
    });

    it('should send document media', async () => {
      const ctx = new Context(mockMessage, mockPlatform, mockUser, mockConversation);

      const media: MediaAttachment = {
        type: 'document',
        url: 'https://example.com/doc.pdf',
        filename: 'document.pdf',
      };

      await ctx.replyWithMedia(media);

      expect(mockPlatform.sendMessage).toHaveBeenCalledWith(mockUser.platformId, {
        type: 'document',
        media,
      });
    });
  });

  describe('replyWithButtons', () => {
    it('should send message with buttons', async () => {
      const ctx = new Context(mockMessage, mockPlatform, mockUser, mockConversation);

      const buttons: MessageButton[] = [
        { type: 'url', text: 'Visit Website', url: 'https://example.com' },
      ];

      const result = await ctx.replyWithButtons('Choose an option:', buttons);

      expect(mockPlatform.sendMessage).toHaveBeenCalledWith(mockUser.platformId, {
        type: 'text',
        text: 'Choose an option:',
        buttons,
      });
      expect(result).toEqual({
        success: true,
        messageId: 'msg123',
      });
    });

    it('should send message with single button', async () => {
      const ctx = new Context(mockMessage, mockPlatform, mockUser, mockConversation);

      const buttons: MessageButton[] = [{ type: 'callback', text: 'OK', callbackData: 'ok' }];

      await ctx.replyWithButtons('Click OK', buttons);

      expect(mockPlatform.sendMessage).toHaveBeenCalledWith(mockUser.platformId, {
        type: 'text',
        text: 'Click OK',
        buttons,
      });
    });

    it('should send message with URL buttons', async () => {
      const ctx = new Context(mockMessage, mockPlatform, mockUser, mockConversation);

      const buttons: MessageButton[] = [
        { type: 'url', text: 'Visit Website', url: 'https://example.com' },
      ];

      await ctx.replyWithButtons('Check this out:', buttons);

      expect(mockPlatform.sendMessage).toHaveBeenCalledWith(mockUser.platformId, {
        type: 'text',
        text: 'Check this out:',
        buttons,
      });
    });
  });
});
